// =============================================================================
// employeesApi.ts: RTK Query endpoints for /api/v1/employees
// =============================================================================
//
// `api.injectEndpoints` ADDS endpoints to the shared base api (services/api.ts)
// from this feature folder. Everything shares one cache, one middleware and
// one reducer, but each feature keeps its own endpoint definitions.
//
// Next steps for this file: add `getEmployee` (one by id) and mutations
// (createEmployee, updateEmployee...) that INVALIDATE the "Employee" tags
// below, so the list refreshes itself after a change.
// -----------------------------------------------------------------------------

import { api, API_V1 } from "@/services/api";
import type { Employee, EmployeeListParams, PagedResponse } from "@/types/api";

// Remove empty values so the URL stays clean: `{ search: "" }` would
// otherwise send `?search=` and `{ departmentId: undefined }` is skipped
// anyway. The backend then uses its defaults for anything missing.
function toQueryParams(params: EmployeeListParams) {
  // Object.entries -> [key, value] pairs; filter out empty ones; rebuild.
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== ""),
  );
}

export const employeesApi = api.injectEndpoints({
  endpoints: (build) => ({
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
      // A future createEmployee mutation invalidates "LIST" (a new row may
      // appear on any page); updateEmployee invalidates just that id.
      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ id }) => ({ type: "Employee" as const, id })),
              { type: "Employee" as const, id: "LIST" },
            ]
          : [{ type: "Employee" as const, id: "LIST" }],
    }),
  }),
});

// Auto-generated React hook for the endpoint above.
export const { useGetEmployeesQuery } = employeesApi;
