// =============================================================================
// departments/[id]/edit/page.tsx: "edit department", e.g. /departments/3/edit
// =============================================================================
// `[id]` is a dynamic segment. As in employees/[id]/edit/page.tsx, `params`
// is a Promise that must be read inside <Suspense> when Cache Components is on.
// -----------------------------------------------------------------------------

import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import EditDepartment from "@/features/departments/EditDepartment";

export const metadata: Metadata = {
  title: "Edit department | Employee Management System",
};

export default function EditDepartmentPage({ params }: PageProps<"/departments/[id]/edit">) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-1">
        <Link href="/departments" className="text-sm text-zinc-600 hover:underline dark:text-zinc-400">
          ← Departments
        </Link>
        <h1 className="text-3xl font-semibold">Edit department</h1>
      </div>

      <Suspense fallback={<p className="text-zinc-500">Loading...</p>}>
        {params.then(({ id }) => (
          <EditDepartment id={Number(id)} />
        ))}
      </Suspense>
    </main>
  );
}
