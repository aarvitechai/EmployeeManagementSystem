// =============================================================================
// page.tsx: the home page, served at the "/" URL
// =============================================================================
//
// In the App Router, a `page.tsx` file inside `app/` becomes a route. This
// file has no "use client", so it is a SERVER Component: it renders on the
// server and sends HTML, with no JavaScript for this component itself.
//
// It can still RENDER a Client Component (ReduxDemo). Only that part is
// hydrated in the browser and can use Redux hooks.
// -----------------------------------------------------------------------------

import ReduxDemo from "@/features/system/ReduxDemo";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-16">
      <h1 className="text-3xl font-semibold">Employee Management System</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Base frontend with Redux Toolkit and RTK Query set up.
      </p>

      <ReduxDemo />
    </main>
  );
}
