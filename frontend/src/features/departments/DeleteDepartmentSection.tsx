// =============================================================================
// DeleteDepartmentSection.tsx: "danger zone" with a Delete department button
// =============================================================================
//
// Flow:
//   1. "Delete department..." opens a confirmation box (two steps, because
//      the department disappears from every screen afterwards).
//   2. "Yes, delete" calls the deleteDepartment mutation with the department's
//      rowVersion (if someone changed it meanwhile, the API answers 409).
//   3. Success -> the department lists are invalidated and we go back to
//      /departments, where it no longer appears.
//
// Rule (enforced by the backend too): only a department with NO employees
// can be deleted, so the button is disabled with an explanation otherwise.
//
// The backend does a SOFT delete (IsDeleted = 1): the row stays in the
// database for history, but the app treats it as gone.
// -----------------------------------------------------------------------------

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { getErrorMessage } from "@/services/apiErrors";
import type { Department } from "@/types/api";

import { useDeleteDepartmentMutation } from "./departmentsApi";

export default function DeleteDepartmentSection({ department }: { department: Department }) {
  const router = useRouter();
  const [deleteDepartment, { isLoading: isDeleting }] = useDeleteDepartmentMutation();

  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // employeeCount from the API counts ALL employees, including terminated
  // ones, which matches the backend's delete rule.
  const hasEmployees = department.employeeCount > 0;

  async function handleDelete() {
    setError(null);
    try {
      // .unwrap() throws on failure, so the next line only runs on success.
      await deleteDepartment({ id: department.id, rowVersion: department.rowVersion }).unwrap();
      router.push("/departments");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <section
      aria-labelledby="delete-heading"
      className="flex max-w-2xl flex-col gap-3 rounded border border-red-200 p-4 dark:border-red-900"
    >
      <h2 id="delete-heading" className="text-lg font-semibold text-red-800 dark:text-red-300">
        Delete department
      </h2>

      {hasEmployees ? (
        // Explain WHY instead of just showing a dead button.
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          This department has {department.employeeCount} employee{department.employeeCount === 1 ? "" : "s"}
          {" "}(including any terminated ones). Move them to another department before deleting it.
        </p>
      ) : (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          The department will be removed from all lists. Its code can then be used for a new department.
        </p>
      )}

      {!isConfirming ? (
        <button
          type="button"
          disabled={hasEmployees}
          onClick={() => {
            setError(null);
            setIsConfirming(true);
          }}
          className="self-start rounded border border-red-300 px-3 py-1.5 text-sm text-red-800 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-800 dark:text-red-300"
        >
          Delete department...
        </button>
      ) : (
        <div className="flex flex-col gap-3 rounded bg-red-50 p-3 dark:bg-red-950/30">
          <p className="text-sm font-medium text-red-800 dark:text-red-300">
            Delete {department.name} ({department.code})?
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
              onClick={() => setIsConfirming(false)}
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
