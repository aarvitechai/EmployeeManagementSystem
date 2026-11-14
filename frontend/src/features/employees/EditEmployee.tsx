// =============================================================================
// EditEmployee.tsx: loads one employee, then shows the form filled in
// =============================================================================
//
// Separate from EmployeeForm so the form only ever renders WITH data. React
// Hook Form reads `defaultValues` once, on its first render, so rendering it
// before the employee has loaded would leave the fields empty.
//
// It also hosts the status panel, and coordinates the two: changing the
// status gives the employee a new rowVersion, which re-creates the form (see
// `key` below) and would throw away unsaved edits. So the panel is locked
// while the form is "dirty".
// -----------------------------------------------------------------------------

"use client";

import { useState } from "react";

import { getErrorMessage } from "@/services/apiErrors";

import EmployeeForm from "./EmployeeForm";
import EmployeeStatusPanel from "./EmployeeStatusPanel";
import { useGetEmployeeQuery } from "./employeesApi";

export default function EditEmployee({ id }: { id: number }) {
  // /employees/abc/edit gives NaN. Don't even send a request for that.
  const isValidId = Number.isInteger(id) && id > 0;

  // Reported by EmployeeForm through onDirtyChange.
  const [isFormDirty, setIsFormDirty] = useState(false);

  // GET /api/v1/employees/{id}, cached under the tag { type: "Employee", id }.
  // `skip: true` tells RTK Query not to run the query at all.
  const { data: employee, isLoading, isError, error, refetch } = useGetEmployeeQuery(id, {
    skip: !isValidId,
  });

  if (!isValidId) {
    return <p role="alert" className="text-sm text-red-700 dark:text-red-400">Employee not found.</p>;
  }

  if (isLoading) {
    return <p className="text-zinc-500">Loading employee...</p>;
  }

  if (isError || !employee) {
    return (
      <div role="alert" className="flex items-center gap-4 text-sm text-red-700 dark:text-red-400">
        <span>{getErrorMessage(error) || "Employee not found."}</span>
        <button type="button" className="underline" onClick={() => refetch()}>
          Retry
        </button>
      </div>
    );
  }

  // `key` = rowVersion: if the cached employee is refetched with a NEW version
  // (someone saved it), React creates a fresh form with the latest values
  // instead of keeping stale ones.
  return (
    <div className="flex flex-col gap-8">
      <EmployeeStatusPanel employee={employee} locked={isFormDirty} />

      <section aria-labelledby="details-heading" className="flex flex-col gap-4">
        <h2 id="details-heading" className="text-lg font-semibold">
          Details
        </h2>
        {/* setIsFormDirty is a stable function from useState, so passing it
            directly won't re-trigger the form's effect on every render. */}
        <EmployeeForm key={employee.rowVersion} employee={employee} onDirtyChange={setIsFormDirty} />
      </section>
    </div>
  );
}
