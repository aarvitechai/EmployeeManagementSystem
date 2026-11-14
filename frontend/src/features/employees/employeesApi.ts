// =============================================================================
// employeesApi.ts: RTK Query endpoints for /api/v1/employees
// =============================================================================
//
// `api.injectEndpoints` ADDS endpoints to the shared base api (services/api.ts)
// from this feature folder. Everything shares one cache, one middleware and
// one reducer, but each feature keeps its own endpoint definitions.
//
// QUERIES read data (GET) and PROVIDE cache tags.
// MUTATIONS change data (POST/PUT/PATCH/DELETE) and INVALIDATE cache tags.
// When a tag is invalidated, every cached query that provided it is refetched
// automatically, so after saving an employee the list and the detail view
// update themselves, with no manual "reload the list" code anywhere.
// -----------------------------------------------------------------------------

import { api, API_V1 } from "@/services/api";
import type {
  ChangeEmployeeStatusRequest,
  CreateEmployeeRequest,
  Employee,
  EmployeeListParams,
  PagedResponse,
  UpdateEmployeeRequest,
} from "@/types/api";

// Remove empty values so the URL stays clean: `{ search: "" }` would
// otherwise send `?search=` and `{ departmentId: undefined }` is skipped
// anyway. The backend then uses its defaults for anything missing.
function toQueryParams(params: EmployeeListParams) {
  // Object.entries -> [key, value] pairs; filter out empty ones; rebuild.
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== ""),
  );
}

// Tag meaning "any employee list". Lists are invalidated when an employee
// is added or changed, because the change can move rows between pages,
// filters and sort positions, or change a manager name shown on other rows.
const EMPLOYEE_LIST = { type: "Employee" as const, id: "LIST" };
// Department responses include an employeeCount, which changes when
// employees are added or moved between departments.
const DEPARTMENT_LIST = { type: "Department" as const, id: "LIST" };

export const employeesApi = api.injectEndpoints({
  endpoints: (build) => ({
    // ---- Queries -------------------------------------------------------------

    // build.query<WhatComesBack, WhatTheHookTakes>
    getEmployees: build.query<PagedResponse<Employee>, EmployeeListParams>({
      // Builds the request. `params` becomes the query string:
      // { page: 2, search: "asha" } -> /api/v1/employees?page=2&search=asha
      query: (params) => ({
        url: `${API_V1}/employees`,
        params: toQueryParams(params),
      }),

      // CACHE KEY: RTK Query caches each distinct `params` object separately,
      // so page 1 and page 2 are both cached. Going back to page 1 shows it
      // instantly from the cache (and refetches in the background if stale).

      // TAGS: declare what this response contains:
      //   - one tag per employee:  { type: "Employee", id: 5 }
      //   - one tag for "the list": { type: "Employee", id: "LIST" }
      providesTags: (result) =>
        result
          ? [...result.items.map(({ id }) => ({ type: "Employee" as const, id })), EMPLOYEE_LIST]
          : [EMPLOYEE_LIST],
    }),

    // GET /api/v1/employees/{id}: used by the edit page.
    getEmployee: build.query<Employee, number>({
      query: (id) => `${API_V1}/employees/${id}`,
      // `(result, error, id)`: the third argument is what the hook was called with.
      providesTags: (_result, _error, id) => [{ type: "Employee", id }],
    }),

    // ---- Mutations -----------------------------------------------------------

    // POST /api/v1/employees. build.mutation<WhatComesBack, WhatYouSend>
    createEmployee: build.mutation<Employee, CreateEmployeeRequest>({
      query: (body) => ({
        url: `${API_V1}/employees`,
        method: "POST",
        // An object `body` is sent as JSON with Content-Type: application/json.
        body,
      }),
      // Only invalidate when the request SUCCEEDED. A failed create changed
      // nothing, so refetching would waste a request.
      invalidatesTags: (_result, error) => (error ? [] : [EMPLOYEE_LIST, DEPARTMENT_LIST]),
    }),

    // PUT /api/v1/employees/{id}. The id goes in the URL, the rest in the body.
    updateEmployee: build.mutation<Employee, { id: number } & UpdateEmployeeRequest>({
      // Destructuring: pull `id` out, and gather every other field into `body`.
      query: ({ id, ...body }) => ({
        url: `${API_V1}/employees/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_result, error, { id }) =>
        error ? [] : [{ type: "Employee", id }, EMPLOYEE_LIST, DEPARTMENT_LIST],
    }),

    // PATCH /api/v1/employees/{id}/status: Active / OnLeave / Terminated.
    // PATCH = change ONE aspect of the resource, here just its lifecycle state.
    changeEmployeeStatus: build.mutation<Employee, { id: number } & ChangeEmployeeStatusRequest>({
      query: ({ id, ...body }) => ({
        url: `${API_V1}/employees/${id}/status`,
        method: "PATCH",
        body,
      }),
      // Refetch this employee (the edit page gets the new status and the NEW
      // rowVersion) and every list (status column, status filter, and the
      // manager picker, which only offers Active employees).
      invalidatesTags: (_result, error, { id }) => (error ? [] : [{ type: "Employee", id }, EMPLOYEE_LIST]),
    }),

    // DELETE /api/v1/employees/{id}?rowVersion=...: SOFT delete on the
    // backend (IsDeleted = 1). 204 No Content, so the result type is `void`.
    deleteEmployee: build.mutation<void, { id: number; rowVersion: string }>({
      query: ({ id, rowVersion }) => ({
        url: `${API_V1}/employees/${id}`,
        method: "DELETE",
        // No body on DELETE: the concurrency token goes in the query string.
        params: { rowVersion },
      }),
      // Lists (the row disappears) and departments (their employeeCount drops).
      // NOT { type: "Employee", id }: the edit page is still subscribed while
      // we navigate away, and refetching a deleted employee would flash a 404.
      invalidatesTags: (_result, error) => (error ? [] : [EMPLOYEE_LIST, DEPARTMENT_LIST]),
    }),
  }),
});

// Auto-generated React hooks: use<Name>Query for queries,
// use<Name>Mutation for mutations.
export const {
  useGetEmployeesQuery,
  useGetEmployeeQuery,
  useCreateEmployeeMutation,
  useUpdateEmployeeMutation,
  useChangeEmployeeStatusMutation,
  useDeleteEmployeeMutation,
} = employeesApi;
