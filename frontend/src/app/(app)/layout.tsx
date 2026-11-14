// =============================================================================
// (app)/layout.tsx: layout for every page that requires login
// =============================================================================
//
// `(app)` in parentheses is a ROUTE GROUP: it groups pages so they can share
// this layout, without adding anything to the URL. app/(app)/employees/page.tsx
// is still served at /employees. The login page lives outside this group.
//
// Everything here is wrapped in <AuthGuard>, so logged-out visitors are sent
// to /login, and the nav bar (with the user menu) only appears when logged in.
// -----------------------------------------------------------------------------

import SiteNav from "@/components/SiteNav";
import AuthGuard from "@/features/auth/AuthGuard";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <SiteNav />
      {children}
    </AuthGuard>
  );
}
