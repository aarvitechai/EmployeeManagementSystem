// =============================================================================
// employees/[id]/edit/page.tsx: "edit employee" page, e.g. /employees/5/edit
// =============================================================================
//
// `[id]` in square brackets is a DYNAMIC route segment: it matches any value,
// and Next.js passes it to the page as `params.id`.
//
// In this Next.js version `params` is a Promise. With Cache Components on
// (next.config.ts), the id is only known at REQUEST time, so reading it must
// happen inside a <Suspense> boundary. Next.js prerenders everything outside
// the boundary (heading, back link) as a static shell, and streams the part
// inside once the id is available. The docs' pattern: `params.then(...)`.
// -----------------------------------------------------------------------------

import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import EditEmployee from "@/features/employees/EditEmployee";

export const metadata: Metadata = {
  title: "Edit employee | Employee Management System",
};

// PageProps<"/employees/[id]/edit"> is a type Next.js generates from the
// folder structure; it knows `params` contains `id: string`.
export default function EditEmployeePage({ params }: PageProps<"/employees/[id]/edit">) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-1">
        <Link href="/employees" className="text-sm text-zinc-600 hover:underline dark:text-zinc-400">
          ← Employees
        </Link>
        <h1 className="text-3xl font-semibold">Edit employee</h1>
      </div>

      <Suspense fallback={<p className="text-zinc-500">Loading...</p>}>
        {/* URL values are always strings; the API needs a number. An id
            like "abc" becomes NaN, so the component shows "not found". */}
        {params.then(({ id }) => (
          <EditEmployee id={Number(id)} />
        ))}
      </Suspense>
    </main>
  );
}
