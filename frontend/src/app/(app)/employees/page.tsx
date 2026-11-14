// =============================================================================
// employees/page.tsx: the employee list page, served at /employees
// =============================================================================
//
// File-based routing: the folder name `employees` inside `app/` becomes the
// URL segment `/employees`, and `page.tsx` is what that URL shows.
//
// This is a SERVER Component (no "use client"): it renders the static parts
// (heading) on the server. The interactive table is the Client
// Component <EmployeeList />, which fetches data in the browser via RTK Query.
// -----------------------------------------------------------------------------

import type { Metadata } from "next";

import EmployeeList from "@/features/employees/EmployeeList";

// Sets the browser tab title for this page only.
export const metadata: Metadata = {
  title: "Employees | Employee Management System",
};

export default function EmployeesPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      {/* Navigation to other sections lives in the shared SiteNav (layout.tsx). */}
      <h1 className="text-3xl font-semibold">Employees</h1>

      <EmployeeList />
    </main>
  );
}
