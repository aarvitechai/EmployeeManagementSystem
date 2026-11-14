// =============================================================================
// EditDepartment.tsx: loads one department, then shows the form filled in
// =============================================================================
// Same pattern as features/employees/EditEmployee.tsx: the form only renders
// once data exists, because React Hook Form reads defaultValues only once.
// -----------------------------------------------------------------------------

"use client";

import { getErrorMessage } from "@/services/apiErrors";

import DeleteDepartmentSection from "./DeleteDepartmentSection";
import DepartmentForm from "./DepartmentForm";
import { useGetDepartmentQuery } from "./departmentsApi";

export default function EditDepartment({ id }: { id: number }) {
  const isValidId = Number.isInteger(id) && id > 0;

  const { data: department, isLoading, isError, error, refetch } = useGetDepartmentQuery(id, {
    skip: !isValidId,
  });

  if (!isValidId) {
    return <p role="alert" className="text-sm text-red-700 dark:text-red-400">Department not found.</p>;
  }

  if (isLoading) {
    return <p className="text-zinc-500">Loading department...</p>;
  }

  if (isError || !department) {
    return (
      <div role="alert" className="flex items-center gap-4 text-sm text-red-700 dark:text-red-400">
        <span>{getErrorMessage(error) || "Department not found."}</span>
        <button type="button" className="underline" onClick={() => refetch()}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      {/* key = rowVersion: a newer version from the server re-creates the form. */}
      <DepartmentForm key={department.rowVersion} department={department} />

      {/* Kept separate from the form (and below it) so a destructive action
          is never confused with "Save". */}
      <DeleteDepartmentSection department={department} />
    </div>
  );
}
