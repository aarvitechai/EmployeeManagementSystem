// =============================================================================
// SiteNav.tsx: the top navigation bar shown on every page
// =============================================================================
//
// A Server Component (no "use client"): the links need no state or hooks,
// so they render on the server. It's used by app/(app)/layout.tsx, so it only
// appears on logged-in pages. The interactive part (who's signed in + Log out)
// is the Client Component <UserMenu />: a Server Component can render a Client
// Component inside it.
// -----------------------------------------------------------------------------

import Link from "next/link";

import UserMenu from "@/features/auth/UserMenu";

// One place to add future sections (Leave, Reports...).
const links = [
  { href: "/employees", label: "Employees" },
  { href: "/departments", label: "Departments" },
] as const;

export default function SiteNav() {
  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800">
      {/* <nav> + aria-label: a landmark screen-reader users can jump to. */}
      <nav aria-label="Main" className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
        <Link href="/" className="font-semibold">
          EMS
        </Link>
        <ul className="flex gap-4 text-sm">
          {links.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className="text-zinc-700 hover:underline dark:text-zinc-300">
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
        <UserMenu />
      </nav>
    </header>
  );
}
