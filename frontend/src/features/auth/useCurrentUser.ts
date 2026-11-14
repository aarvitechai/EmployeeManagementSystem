// =============================================================================
// useCurrentUser.ts: who is logged in, and what may they do in the UI?
// =============================================================================
//
// A small custom hook on top of the getCurrentUser query, so components can
// write `const { canManage } = useCurrentUser()` instead of repeating role
// checks everywhere.
//
// IMPORTANT (design rule): this only decides what to SHOW. Hiding a button
// is not security. The API checks the user's roles on every request and
// answers 403 if they're not allowed, whatever the UI shows.
// -----------------------------------------------------------------------------

import type { AppRole } from "@/types/api";

import { useGetCurrentUserQuery } from "./authApi";

// Mirrors the backend policy "ManageOrganization" (AuthSetup.cs).
const MANAGE_ROLES: AppRole[] = ["SystemAdmin", "HRAdmin"];

export function useCurrentUser() {
  // Reads the cached /auth/me result. Many components can call this hook;
  // RTK Query still sends only ONE request. `currentData` rather than `data`,
  // so a user from an ended session is never shown (see AuthGuard.tsx).
  const { currentData, isLoading, isError, error } = useGetCurrentUserQuery();
  const user = isError ? undefined : currentData;

  const roles = user?.roles ?? [];

  return {
    user,
    isLoading,
    isError,
    error,
    // `some` = true if the user has at least one of the listed roles.
    canManage: roles.some((role) => MANAGE_ROLES.includes(role)),
  };
}
