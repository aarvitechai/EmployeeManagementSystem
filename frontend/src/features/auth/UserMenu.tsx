// =============================================================================
// UserMenu.tsx: "signed in as ..." + Log out button, shown in the nav bar
// =============================================================================

"use client";

import { useRouter } from "next/navigation";

import { useLogoutMutation } from "./authApi";
import { useCurrentUser } from "./useCurrentUser";

// Friendlier labels for the role names.
const roleLabels: Record<string, string> = {
  SystemAdmin: "System admin",
  HRAdmin: "HR admin",
  Manager: "Manager",
  Employee: "Employee",
};

export default function UserMenu() {
  const router = useRouter();
  const { user } = useCurrentUser();
  const [logout, { isLoading }] = useLogoutMutation();

  if (!user) return null;

  async function handleLogout() {
    try {
      await logout().unwrap();
    } finally {
      // Go to the login page whether or not the request succeeded; the
      // cached data was already cleared (authApi.ts).
      router.replace("/login");
    }
  }

  return (
    <div className="ml-auto flex items-center gap-3 text-sm">
      <span className="text-zinc-600 dark:text-zinc-400">
        {user.email}
        {user.roles.length > 0 && (
          <span className="ml-1 text-xs">({user.roles.map((r) => roleLabels[r] ?? r).join(", ")})</span>
        )}
      </span>
      <button
        type="button"
        onClick={handleLogout}
        disabled={isLoading}
        className="rounded border border-zinc-300 px-3 py-1 disabled:opacity-50 dark:border-zinc-700"
      >
        {isLoading ? "Logging out..." : "Log out"}
      </button>
    </div>
  );
}
