// =============================================================================
// departmentsApi.ts: RTK Query endpoints for /api/v1/departments
// =============================================================================
// See features/employees/employeesApi.ts for how injectEndpoints, queries,
// mutations and cache tags work.
// -----------------------------------------------------------------------------

import { api, API_V1 } from "@/services/api";
import type { CreateDepartmentRequest, Department, UpdateDepartmentRequest } from "@/types/api";

const DEPARTMENT_LIST = { type: "Department" as const, id: "LIST" };

export const departmentsApi = api.injectEndpoints({
  endpoints: (build) => ({
    // ---- Queries -------------------------------------------------------------

    // Argument: whether to include deactivated departments. `| void` lets
    // callers omit the argument entirely: useGetDepartmentsQuery().
    getDepartments: build.query<Department[], { includeInactive?: boolean } | void>({
      query: (args) => ({
        url: `${API_V1}/departments`,
        params: { includeInactive: args?.includeInactive ?? false },
      }),
      providesTags: (result) =>
        result
          ? [...result.map(({ id }) => ({ type: "Department" as const, id })), DEPARTMENT_LIST]
          : [DEPARTMENT_LIST],
    }),

    // GET /api/v1/departments/{id}: used by the edit page.
    getDepartment: build.query<Department, number>({
      query: (id) => `${API_V1}/departments/${id}`,
      providesTags: (_result, _error, id) => [{ type: "Department", id }],
    }),

    // ---- Mutations -----------------------------------------------------------

    createDepartment: build.mutation<Department, CreateDepartmentRequest>({
      query: (body) => ({ url: `${API_V1}/departments`, method: "POST", body }),
      // A new department appears in every department list and drop-down.
      invalidatesTags: (_result, error) => (error ? [] : [DEPARTMENT_LIST]),
    }),

    updateDepartment: build.mutation<Department, { id: number } & UpdateDepartmentRequest>({
      query: ({ id, ...body }) => ({ url: `${API_V1}/departments/${id}`, method: "PUT", body }),
      // Besides the department itself and the lists, ALSO invalidate every
      // cached employee: employee responses include `departmentName`, so a
      // renamed department must show its new name in the employee screens too.
      // Passing just the type name ("Employee") invalidates ALL tags of that type.
      invalidatesTags: (_result, error, { id }) =>
        error ? [] : [{ type: "Department", id }, DEPARTMENT_LIST, "Employee"],
    }),

    // DELETE /api/v1/departments/{id}?rowVersion=...: SOFT delete on the
    // backend (IsDeleted = 1). The response is 204 No Content, so the result
    // type is `void`.
    deleteDepartment: build.mutation<void, { id: number; rowVersion: string }>({
      query: ({ id, rowVersion }) => ({
        url: `${API_V1}/departments/${id}`,
        method: "DELETE",
        // DELETE has no body, so the concurrency token goes in the query
        // string. `params` URL-encodes it ("=" -> "%3D").
        params: { rowVersion },
      }),
      // Only the LISTS are invalidated, not { type: "Department", id }: the
      // edit page is still subscribed to that department while we navigate
      // away, and refetching it would just flash "not found" (it's deleted).
      invalidatesTags: (_result, error) => (error ? [] : [DEPARTMENT_LIST]),
    }),
  }),
});

export const {
  useGetDepartmentsQuery,
  useGetDepartmentQuery,
  useCreateDepartmentMutation,
  useUpdateDepartmentMutation,
  useDeleteDepartmentMutation,
} = departmentsApi;
