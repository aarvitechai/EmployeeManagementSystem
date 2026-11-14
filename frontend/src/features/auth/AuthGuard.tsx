// =============================================================================
// AuthGuard.tsx: only shows its children to a logged-in user
// =============================================================================
//
// Used by app/(app)/layout.tsx, so EVERY page in the (app) route group is
// protected without each page doing its own check.
//
//   checking /auth/me ...      -> "Checking your session..."
//   401 (not logged in)        -> redirect to /login?returnUrl=<this page>
//   other error (API down)     -> message + Retry
//   logged in                  -> render the page
//
// Reminder (design doc): "frontend route guards are not security controls".
// This guard is for user experience. The real protection is the API, which
// refuses data to anyone without a valid login cookie.
// -----------------------------------------------------------------------------

"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { getErrorMessage } from "@/services/apiErrors";

import { useGetCurrentUserQuery } from "./authApi";

// Checks whether an RTK Query error is an HTTP 401.
export function isUnauthorized(error: unknown): boolean {
  return typeof error === "object" && error !== null && "status" in error && error.status === 401;
}

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  // `currentData`, NOT `data`: RTK Query's `data` keeps a component's LAST
  // successful result even after the cache was cleared (e.g. on logout or an
  // expired session). Next.js also keeps recently visited pages mounted in
  // the background, so a stale `data` could make an old page believe the
  // user is still logged in. `currentData` only reflects the cache right now.
  const { currentData, isFetching, error, refetch } = useGetCurrentUserQuery();
  const user = error ? undefined : currentData;

  const notLoggedIn = isUnauthorized(error);

  // Navigation is a side effect, so it belongs in useEffect, not in the
  // render itself. `replace` (not `push`) so the Back button doesn't return
  // to the protected page that just bounced the user.
  useEffect(() => {
    if (notLoggedIn) {
      // encodeURIComponent makes the path safe inside a query string.
      router.replace(`/login?returnUrl=${encodeURIComponent(pathname)}`);
    }
  }, [notLoggedIn, pathname, router]);

  if (user) {
    return <>{children}</>;
  }

  if (notLoggedIn) {
    // The redirect above is about to happen.
    return <p className="mx-auto w-full max-w-6xl px-4 py-10 text-zinc-500 sm:px-6">Redirecting to login...</p>;
  }

  if (error && !isFetching) {
    return (
      <div role="alert" className="mx-auto flex w-full max-w-6xl items-center gap-4 px-4 py-10 text-sm text-red-700 sm:px-6 dark:text-red-400">
        <span>{getErrorMessage(error) || "Could not check your session."}</span>
        <button type="button" className="underline" onClick={() => refetch()}>
          Retry
        </button>
      </div>
    );
  }

  // Still loading (first check, or re-checking after the cache was cleared).
  return <p className="mx-auto w-full max-w-6xl px-4 py-10 text-zinc-500 sm:px-6">Checking your session...</p>;
}
