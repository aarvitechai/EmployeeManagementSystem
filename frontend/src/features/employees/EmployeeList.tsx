// =============================================================================
// EmployeeList.tsx: searchable, filterable, sortable, paginated employee table
// =============================================================================
//
// Data flow:
//
//   user types / clicks  ->  local state (useState)  ->  `params` object
//        ->  useGetEmployeesQuery(params)  ->  RTK Query fetches
//            GET /api/v1/employees?page=..&search=..  ->  cached  ->  table
//
// Every time `params` changes, the hook automatically requests the new page,
// so there's no fetch() call or useEffect for loading data anywhere here.
//
// Why local state and not a Redux slice? The filters only matter to THIS
// screen. Project rule: slices are for app-wide UI state, and server data
// lives in RTK Query, so plain useState is the right tool.
// -----------------------------------------------------------------------------

// Uses hooks and browser events, so it must be a Client Component.
"use client";

import Link from "next/link";
import { useState } from "react";

import Pagination from "@/components/Pagination";
import { useCurrentUser } from "@/features/auth/useCurrentUser";
import { useGetDepartmentsQuery } from "@/features/departments/departmentsApi";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { getErrorMessage } from "@/services/apiErrors";
import {
  EMPLOYEE_STATUSES,
  type EmployeeListParams,
  type EmployeeSortBy,
  type EmployeeStatus,
  type SortDirection,
} from "@/types/api";

import { useGetEmployeesQuery } from "./employeesApi";
import EmployeeStatusBadge, { employeeStatusLabels } from "./EmployeeStatusBadge";

const PAGE_SIZE = 10;

// "2026-01-15" -> "15 Jan 2026" in the user's locale. We split the string
// ourselves because `new Date("2026-01-15")` is read as UTC midnight, which
// can show the PREVIOUS day in time zones west of UTC.
function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function EmployeeList() {
  // ---- Screen state ---------------------------------------------------------
  const [searchInput, setSearchInput] = useState("");
  // `""` = "all departments" / "all statuses" in the drop-downs.
  const [departmentId, setDepartmentId] = useState("");
  const [status, setStatus] = useState<EmployeeStatus | "">("");
  const [sortBy, setSortBy] = useState<EmployeeSortBy>("lastName");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [page, setPage] = useState(1);

  // Only admins/HR may create or edit; others (managers) just view the list.
  // UI only: the API enforces the same rule (403) on every write.
  const { canManage } = useCurrentUser();

  // Wait until the user pauses typing before searching (see the hook).
  const search = useDebouncedValue(searchInput.trim(), 300);

  // ---- Data -----------------------------------------------------------------
  // The argument object for the query. RTK Query compares it by VALUE, so a
  // new object with the same contents reuses the cached result.
  const params: EmployeeListParams = {
    page,
    pageSize: PAGE_SIZE,
    search: search || undefined,
    departmentId: departmentId ? Number(departmentId) : undefined,
    status: status || undefined,
    sortBy,
    sortDirection,
  };

  const {
    // `data` keeps showing the PREVIOUS page's rows while the next page loads,
    // so the table doesn't flash empty between pages.
    data,
    // true only on the very FIRST load (nothing to show yet).
    isLoading,
    // true during ANY request, including page changes and refetches.
    isFetching,
    isError,
    error,
    refetch,
  } = useGetEmployeesQuery(params);

  // Departments for the filter drop-down (cached separately, fetched once).
  const { data: departments } = useGetDepartmentsQuery({ includeInactive: true });

  // ---- Event handlers -------------------------------------------------------
  // Any filter change sends the user back to page 1: page 5 of the OLD
  // results may not exist in the new results.

  function handleSort(column: EmployeeSortBy) {
    if (column === sortBy) {
      // Clicking the active column flips the direction.
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortDirection("asc");
    }
    setPage(1);
  }

  // Small arrow next to the sorted column's header.
  function sortIndicator(column: EmployeeSortBy) {
    if (column !== sortBy) return null;
    return <span aria-hidden="true">{sortDirection === "asc" ? " ▲" : " ▼"}</span>;
  }

  // aria-sort tells screen readers how a column is sorted.
  function ariaSort(column: EmployeeSortBy) {
    if (column !== sortBy) return undefined;
    return sortDirection === "asc" ? "ascending" : "descending";
  }

  const inputClass =
    "rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900";
  const headerButtonClass = "font-semibold hover:underline";

  // ---- Render ---------------------------------------------------------------
  return (
    <section className="flex flex-col gap-4">
      {/* Filters + "New employee" button */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="flex flex-1 flex-col gap-1 text-sm">
          Search
          <input
            type="search"
            className={inputClass}
            placeholder="Name, employee number or email"
            value={searchInput}
            // "Controlled input": React state is the single source of truth
            // for the value; every keystroke updates the state.
            onChange={(e) => {
              setSearchInput(e.target.value);
              setPage(1);
            }}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Department
          <select
            className={inputClass}
            value={departmentId}
            onChange={(e) => {
              setDepartmentId(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All departments</option>
            {/* `?.` = only map if departments has loaded. Each list item
                needs a unique `key` so React can track it between renders. */}
            {departments?.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
                {d.isActive ? "" : " (inactive)"}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Status
          <select
            className={inputClass}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as EmployeeStatus | "");
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            {EMPLOYEE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {employeeStatusLabels[s]}
              </option>
            ))}
          </select>
        </label>

        {canManage && (
          <Link
            href="/employees/new"
            className="rounded bg-zinc-900 px-4 py-2 text-center text-sm text-white dark:bg-zinc-100 dark:text-black"
          >
            New employee
          </Link>
        )}
      </div>

      {/* Error state. `role="alert"` makes screen readers announce it. */}
      {isError && (
        <div
          role="alert"
          className="flex items-center justify-between gap-4 rounded border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300"
        >
          <span>{getErrorMessage(error)}</span>
          <button type="button" className="underline" onClick={() => refetch()}>
            Retry
          </button>
        </div>
      )}

      {/* Table. overflow-x-auto lets it scroll sideways on narrow phones
          instead of breaking the page layout. */}
      <div className="overflow-x-auto rounded border border-zinc-200 dark:border-zinc-800">
        <table
          className={`w-full min-w-[780px] text-left text-sm transition-opacity ${
            // Dim the old rows while the next page is loading.
            isFetching && !isLoading ? "opacity-60" : ""
          }`}
          // Tells assistive tech the table is being updated.
          aria-busy={isFetching}
        >
          <thead className="bg-zinc-50 dark:bg-zinc-900">
            <tr>
              <th scope="col" className="px-3 py-2" aria-sort={ariaSort("employeeNumber")}>
                <button type="button" className={headerButtonClass} onClick={() => handleSort("employeeNumber")}>
                  Employee #{sortIndicator("employeeNumber")}
                </button>
              </th>
              <th scope="col" className="px-3 py-2" aria-sort={ariaSort("lastName")}>
                <button type="button" className={headerButtonClass} onClick={() => handleSort("lastName")}>
                  Name{sortIndicator("lastName")}
                </button>
              </th>
              <th scope="col" className="px-3 py-2 font-semibold">Email</th>
              <th scope="col" className="px-3 py-2 font-semibold">Department</th>
              <th scope="col" className="px-3 py-2 font-semibold">Manager</th>
              <th scope="col" className="px-3 py-2 font-semibold">Status</th>
              <th scope="col" className="px-3 py-2" aria-sort={ariaSort("hireDate")}>
                <button type="button" className={headerButtonClass} onClick={() => handleSort("hireDate")}>
                  Hire date{sortIndicator("hireDate")}
                </button>
              </th>
              {/* sr-only: the header text is read by screen readers but hidden visually. */}
              <th scope="col" className="px-3 py-2">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>

          <tbody>
            {/* Three possible bodies: first load, no results, or rows. */}
            {isLoading ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-zinc-500">
                  Loading employees...
                </td>
              </tr>
            ) : data && data.items.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-zinc-500">
                  {search || departmentId || status
                    ? "No employees match these filters."
                    : "No employees yet."}
                </td>
              </tr>
            ) : (
              data?.items.map((employee) => (
                <tr key={employee.id} className="border-t border-zinc-200 dark:border-zinc-800">
                  <td className="px-3 py-2 font-mono">{employee.employeeNumber}</td>
                  <td className="px-3 py-2">{employee.fullName}</td>
                  <td className="px-3 py-2">{employee.email}</td>
                  <td className="px-3 py-2">{employee.departmentName}</td>
                  {/* `??` shows a dash when there is no manager (null). */}
                  <td className="px-3 py-2">{employee.managerName ?? "-"}</td>
                  <td className="px-3 py-2">
                    <EmployeeStatusBadge status={employee.status} />
                  </td>
                  <td className="px-3 py-2">{formatDate(employee.hireDate)}</td>
                  <td className="px-3 py-2 text-right">
                    {/* Template literal builds /employees/5/edit. The hidden
                        text tells screen-reader users WHICH employee. */}
                    {canManage && (
                      <Link href={`/employees/${employee.id}/edit`} className="hover:underline">
                        Edit<span className="sr-only"> {employee.fullName}</span>
                      </Link>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {data && (
        <Pagination
          page={data.page}
          totalPages={data.totalPages}
          totalCount={data.totalCount}
          pageSize={data.pageSize}
          onPageChange={setPage}
          disabled={isFetching}
        />
      )}
    </section>
  );
}
