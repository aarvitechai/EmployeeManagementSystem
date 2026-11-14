// =============================================================================
// EmployeeStatusBadge.tsx: coloured pill showing an employee's status
// =============================================================================

import type { EmployeeStatus } from "@/types/api";

// `Record<EmployeeStatus, ...>` forces us to give a style for EVERY status:
// if a new status is added to the type, TypeScript flags this object.
const styles: Record<EmployeeStatus, string> = {
  Active: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  OnLeave: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  Terminated: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};

// Human-friendly labels ("OnLeave" -> "On leave").
const labels: Record<EmployeeStatus, string> = {
  Active: "Active",
  OnLeave: "On leave",
  Terminated: "Terminated",
};

export default function EmployeeStatusBadge({ status }: { status: EmployeeStatus }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

export { labels as employeeStatusLabels };
