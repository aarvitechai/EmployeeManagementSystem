// =============================================================================
// DepartmentList.tsx: table of departments with an "include inactive" toggle
// =============================================================================
//
// Departments are a short list, so the API returns them all at once (no
// pagination, unlike employees). The only filter is active vs. all.
// -----------------------------------------------------------------------------

"use client";

import Link from "next/link";
import { useState } from "react";

import { useCurrentUser } from "@/features/auth/useCurrentUser";
import { getErrorMessage } from "@/services/apiErrors";

import { useGetDepartmentsQuery } from "./departmentsApi";

export default function DepartmentList() {
  const [includeInactive, setIncludeInactive] = useState(false);

  // Only admins/HR see New/Edit (UI only; the API enforces it with 403).
  const { canManage } = useCurrentUser();

  // { includeInactive: false } and { includeInactive: true } are cached
  // separately, so flipping the checkbox back is instant.
  const { data: departments, isLoading, isFetching, isError, error, refetch } = useGetDepartmentsQuery({
    includeInactive,
  });

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm">
          {/* A controlled checkbox uses `checked` (not `value`). */}
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(e) => setIncludeInactive(e.target.checked)}
            className="h-4 w-4"
          />
          Show inactive departments
        </label>

        {canManage && (
          <Link
            href="/departments/new"
            className="rounded bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-black"
          >
            New department
          </Link>
        )}
      </div>

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

      <div className="overflow-x-auto rounded border border-zinc-200 dark:border-zinc-800">
        <table
          className={`w-full min-w-[640px] text-left text-sm ${isFetching && !isLoading ? "opacity-60" : ""}`}
          aria-busy={isFetching}
        >
          <thead className="bg-zinc-50 dark:bg-zinc-900">
            <tr>
              <th scope="col" className="px-3 py-2 font-semibold">Code</th>
              <th scope="col" className="px-3 py-2 font-semibold">Name</th>
              <th scope="col" className="px-3 py-2 font-semibold">Description</th>
              {/* Numbers read best right-aligned. */}
              <th scope="col" className="px-3 py-2 text-right font-semibold">Employees</th>
              <th scope="col" className="px-3 py-2 font-semibold">Status</th>
              <th scope="col" className="px-3 py-2">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-zinc-500">
                  Loading departments...
                </td>
              </tr>
            ) : departments && departments.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-zinc-500">
                  {includeInactive ? "No departments yet." : "No active departments."}
                </td>
              </tr>
            ) : (
              departments?.map((d) => (
                <tr key={d.id} className="border-t border-zinc-200 dark:border-zinc-800">
                  <td className="px-3 py-2 font-mono">{d.code}</td>
                  <td className="px-3 py-2">{d.name}</td>
                  <td className="max-w-xs truncate px-3 py-2 text-zinc-600 dark:text-zinc-400" title={d.description ?? ""}>
                    {d.description ?? "-"}
                  </td>
                  {/* tabular-nums: digits of equal width, so numbers line up. */}
                  <td className="px-3 py-2 text-right tabular-nums">{d.employeeCount}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        d.isActive
                          ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                          : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                      }`}
                    >
                      {d.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    {canManage && (
                      <Link href={`/departments/${d.id}/edit`} className="hover:underline">
                        Edit<span className="sr-only"> {d.name}</span>
                      </Link>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
