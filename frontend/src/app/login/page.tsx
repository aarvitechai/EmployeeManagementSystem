// =============================================================================
// login/page.tsx: the sign-in page, served at /login
// =============================================================================
//
// It sits OUTSIDE the (app) route group, so AuthGuard doesn't apply here
// (otherwise logged-out users could never reach the login page).
//
// <LoginForm /> reads `?returnUrl=` with useSearchParams(). With Cache
// Components, URL search params are request-time data, so the component that
// reads them must be inside a <Suspense> boundary.
// -----------------------------------------------------------------------------

import type { Metadata } from "next";
import { Suspense } from "react";

import LoginForm from "@/features/auth/LoginForm";

export const metadata: Metadata = {
  title: "Sign in | Employee Management System",
};

export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center gap-6 px-4 py-16 sm:px-6">
      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-3xl font-semibold">Sign in</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Employee Management System</p>
      </div>

      <Suspense fallback={<p className="text-zinc-500">Loading...</p>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
