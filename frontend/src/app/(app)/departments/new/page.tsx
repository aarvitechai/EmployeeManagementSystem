// =============================================================================
// departments/new/page.tsx: "create department" page, at /departments/new
// =============================================================================

import type { Metadata } from "next";
import Link from "next/link";

import DepartmentForm from "@/features/departments/DepartmentForm";

export const metadata: Metadata = {
  title: "New department | Employee Management System",
};

export default function NewDepartmentPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-1">
        <Link href="/departments" className="text-sm text-zinc-600 hover:underline dark:text-zinc-400">
          ← Departments
        </Link>
        <h1 className="text-3xl font-semibold">New department</h1>
      </div>

      <DepartmentForm />
    </main>
  );
}
