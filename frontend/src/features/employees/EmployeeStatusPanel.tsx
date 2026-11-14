// =============================================================================
// EmployeeStatusPanel.tsx: shows an employee's status and lets HR change it
// =============================================================================
//
// Allowed transitions (enforced by the backend's Employee entity; the UI just
// offers the matching buttons):
//
//     Active  <-->  OnLeave          reversible, applied with one click
//       |              |
//       +--> Terminated <--+         FINAL: needs a date and a confirmation
//
// Uses the changeEmployeeStatus RTK Query mutation. On success the employee's
// cache tag is invalidated, the edit page refetches, and this panel shows the
// new status (and the employee's new rowVersion is used for the next change).
// -----------------------------------------------------------------------------

"use client";

import { useState } from "react";

import { getErrorMessage } from "@/services/apiErrors";
import type { Employee, EmployeeStatus } from "@/types/api";

import { useChangeEmployeeStatusMutation } from "./employeesApi";
import EmployeeStatusBadge, { employeeStatusLabels } from "./EmployeeStatusBadge";

type EmployeeStatusPanelProps = {
  employee: Employee;
  // True while the details form below has unsaved edits. A status change
  // reloads the employee and resets that form, so we block it until the
  // user saves or discards their edits.
  locked?: boolean;
};

// Today's date as "yyyy-MM-dd" in the user's LOCAL time zone. (toISOString()
// would give the UTC date, which can be yesterday or tomorrow locally.)
function todayLocal(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

// Same formatting as the list: "2026-01-15" -> "15 Jan 2026".
function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function EmployeeStatusPanel({ employee, locked = false }: EmployeeStatusPanelProps) {
  // `isLoading` here = this mutation's request is in flight.
  const [changeStatus, { isLoading: isSaving }] = useChangeEmployeeStatusMutation();

  // Is the "terminate" confirmation area open?
  const [isConfirmingTermination, setIsConfirmingTermination] = useState(false);
  // Termination can't be before the hire date, so never default to earlier.
  const [terminationDate, setTerminationDate] = useState(() =>
    todayLocal() < employee.hireDate ? employee.hireDate : todayLocal(),
  );

  const [error, setError] = useState<string | null>(null);
  // Success message, announced politely by screen readers (role="status").
  const [notice, setNotice] = useState<string | null>(null);

  const isTerminated = employee.status === "Terminated";
  const disabled = locked || isSaving;

  async function applyStatus(status: EmployeeStatus, date: string | null = null) {
    setError(null);
    setNotice(null);
    try {
      await changeStatus({
        id: employee.id,
        status,
        terminationDate: date,
        // The version we're looking at. If someone changed the employee
        // meanwhile, the API answers 409 and we show its message.
        rowVersion: employee.rowVersion,
      }).unwrap();

      setIsConfirmingTermination(false);
      setNotice(`Status changed to ${employeeStatusLabels[status]}.`);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  function confirmTermination() {
    // Simple client checks; the backend checks the same rules again.
    if (!terminationDate) {
      setError("Choose a termination date.");
      return;
    }
    // "yyyy-MM-dd" strings sort the same as dates, so < compares correctly.
    if (terminationDate < employee.hireDate) {
      setError(`Termination date cannot be before the hire date (${formatDate(employee.hireDate)}).`);
      return;
    }
    void applyStatus("Terminated", terminationDate);
  }

  const secondaryButton =
    "rounded border border-zinc-300 px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700";
  const dangerButton =
    "rounded bg-red-700 px-3 py-1.5 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50";

  return (
    // <section> with aria-labelledby: a named region screen readers can jump to.
    <section
      aria-labelledby="status-heading"
      className="flex max-w-2xl flex-col gap-4 rounded border border-zinc-200 p-4 dark:border-zinc-800"
    >
      <div className="flex flex-wrap items-center gap-3">
        <h2 id="status-heading" className="text-lg font-semibold">
          Status
        </h2>
        <EmployeeStatusBadge status={employee.status} />
        {employee.terminationDate && (
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            since {formatDate(employee.terminationDate)}
          </span>
        )}
      </div>

      {isTerminated ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Termination is final. The status can no longer be changed.
        </p>
      ) : (
        <>
          {locked && (
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Save or discard your changes to the details below before changing the status.
            </p>
          )}

          {/* Buttons for the transitions allowed FROM the current status. */}
          <div className="flex flex-wrap gap-2">
            {employee.status === "Active" && (
              <button type="button" className={secondaryButton} disabled={disabled} onClick={() => applyStatus("OnLeave")}>
                Mark on leave
              </button>
            )}
            {employee.status === "OnLeave" && (
              <button type="button" className={secondaryButton} disabled={disabled} onClick={() => applyStatus("Active")}>
                Mark active
              </button>
            )}
            {!isConfirmingTermination && (
              <button
                type="button"
                className={secondaryButton}
                disabled={disabled}
                onClick={() => {
                  setError(null);
                  setNotice(null);
                  setIsConfirmingTermination(true);
                }}
              >
                Terminate...
              </button>
            )}
          </div>

          {/* Two-step confirmation for the irreversible action. */}
          {isConfirmingTermination && (
            <div className="flex flex-col gap-3 rounded border border-red-300 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/30">
              <p className="text-sm font-medium text-red-800 dark:text-red-300">
                Terminate {employee.fullName}? This cannot be undone.
              </p>

              <label htmlFor="terminationDate" className="flex flex-col gap-1 text-sm">
                Termination date
                <input
                  id="terminationDate"
                  type="date"
                  // `min` stops the date picker offering days before hiring.
                  min={employee.hireDate}
                  value={terminationDate}
                  onChange={(e) => setTerminationDate(e.target.value)}
                  className="w-48 rounded border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
                />
              </label>

              <div className="flex gap-2">
                <button type="button" className={dangerButton} disabled={disabled} onClick={confirmTermination}>
                  {isSaving ? "Terminating..." : "Confirm termination"}
                </button>
                <button
                  type="button"
                  className={secondaryButton}
                  disabled={isSaving}
                  onClick={() => {
                    setIsConfirmingTermination(false);
                    setError(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="text-sm text-green-700 dark:text-green-400">
          {notice}
        </p>
      )}
    </section>
  );
}
