// =============================================================================
// departments/page.tsx: the department list page, served at /departments
// =============================================================================
// Server Component shell + the client-side <DepartmentList /> table.
// -----------------------------------------------------------------------------

import type { Metadata } from "next";

import DepartmentList from "@/features/departments/DepartmentList";

export const metadata: Metadata = {
  title: "Departments | Employee Management System",
};

export default function DepartmentsPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold">Departments</h1>
      <DepartmentList />
    </main>
  );
}
