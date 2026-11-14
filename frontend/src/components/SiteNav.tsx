// =============================================================================
// SiteNav.tsx: the top navigation bar shown on every page
// =============================================================================
//
// A Server Component (no "use client"): just links, no state or hooks, so it
// renders on the server and ships no JavaScript of its own. It's placed in
// app/layout.tsx, OUTSIDE the Suspense boundary, so it's part of the static
// shell and appears instantly, even before the Redux-powered content loads.
// -----------------------------------------------------------------------------

import Link from "next/link";

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
      </nav>
    </header>
  );
}
