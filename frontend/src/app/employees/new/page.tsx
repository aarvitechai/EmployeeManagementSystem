// =============================================================================
// employees/new/page.tsx: "create employee" page, served at /employees/new
// =============================================================================
// A Server Component wrapping the client-side <EmployeeForm /> (no `employee`
// prop = create mode).
// -----------------------------------------------------------------------------

import type { Metadata } from "next";
import Link from "next/link";

import EmployeeForm from "@/features/employees/EmployeeForm";

export const metadata: Metadata = {
  title: "New employee | Employee Management System",
};

export default function NewEmployeePage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-1">
        <Link href="/employees" className="text-sm text-zinc-600 hover:underline dark:text-zinc-400">
          ← Employees
        </Link>
        <h1 className="text-3xl font-semibold">New employee</h1>
      </div>

      <EmployeeForm />
    </main>
  );
}
