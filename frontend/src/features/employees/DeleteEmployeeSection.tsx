// =============================================================================
// DeleteEmployeeSection.tsx: "danger zone" with a Delete employee button
// =============================================================================
//
// Delete vs. Terminate (both live on the edit page):
//   - Terminate (Status panel): the person LEFT. The record stays visible
//     with status "Terminated". This is the normal end of employment.
//   - Delete (here): the record should not exist at all, e.g. it was created
//     by mistake. The backend SOFT-deletes it (IsDeleted = 1): it disappears
//     from every screen, and its employee number / email can be reused.
//
// Rule (backend): someone who still manages other employees can't be
// deleted. The API answers 409 and we show its message, telling the user to
// assign those people a new manager first.
//
// Same two-step confirm flow as DeleteDepartmentSection.tsx.
// -----------------------------------------------------------------------------

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { getErrorMessage } from "@/services/apiErrors";
import type { Employee } from "@/types/api";

import { useDeleteEmployeeMutation } from "./employeesApi";

export default function DeleteEmployeeSection({ employee }: { employee: Employee }) {
  const router = useRouter();
  const [deleteEmployee, { isLoading: isDeleting }] = useDeleteEmployeeMutation();

  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setError(null);
    try {
      await deleteEmployee({ id: employee.id, rowVersion: employee.rowVersion }).unwrap();
      router.push("/employees");
    } catch (err) {
      // e.g. 409 "This employee still manages other employees..."
      setError(getErrorMessage(err));
    }
  }

  return (
    <section
      aria-labelledby="delete-employee-heading"
      className="flex max-w-2xl flex-col gap-3 rounded border border-red-200 p-4 dark:border-red-900"
    >
      <h2 id="delete-employee-heading" className="text-lg font-semibold text-red-800 dark:text-red-300">
        Delete employee
      </h2>

      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Use this only for records created by mistake. If {employee.firstName} left the company, use
        <strong> Terminate</strong> in the Status section instead, so the record stays in the history.
      </p>

      {!isConfirming ? (
        <button
          type="button"
          onClick={() => {
            setError(null);
            setIsConfirming(true);
          }}
          className="self-start rounded border border-red-300 px-3 py-1.5 text-sm text-red-800 dark:border-red-800 dark:text-red-300"
        >
          Delete employee...
        </button>
      ) : (
        <div className="flex flex-col gap-3 rounded bg-red-50 p-3 dark:bg-red-950/30">
          <p className="text-sm font-medium text-red-800 dark:text-red-300">
            Delete {employee.fullName} ({employee.employeeNumber})? They will be removed from all lists.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="rounded bg-red-700 px-3 py-1.5 text-sm text-white disabled:opacity-50"
            >
              {isDeleting ? "Deleting..." : "Yes, delete"}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsConfirming(false);
                setError(null);
              }}
              disabled={isDeleting}
              className="rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
    </section>
  );
}
