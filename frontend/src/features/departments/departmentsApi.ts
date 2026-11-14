// =============================================================================
// departmentsApi.ts: RTK Query endpoints for /api/v1/departments
// =============================================================================
// See features/employees/employeesApi.ts for how injectEndpoints and tags work.
// -----------------------------------------------------------------------------

import { api, API_V1 } from "@/services/api";
import type { Department } from "@/types/api";

export const departmentsApi = api.injectEndpoints({
  endpoints: (build) => ({
    // Argument: whether to include deactivated departments. `void` would mean
    // "no argument"; `boolean | void` lets callers omit it.
    getDepartments: build.query<Department[], { includeInactive?: boolean } | void>({
      query: (args) => ({
        url: `${API_V1}/departments`,
        params: { includeInactive: args?.includeInactive ?? false },
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Department" as const, id })),
              { type: "Department" as const, id: "LIST" },
            ]
          : [{ type: "Department" as const, id: "LIST" }],
    }),
  }),
});

export const { useGetDepartmentsQuery } = departmentsApi;
