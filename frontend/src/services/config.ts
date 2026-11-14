// =============================================================================
// config.ts: central place for frontend configuration values
// =============================================================================
//
// The frontend talks to the backend only over HTTP, so all it needs is the
// backend's base URL. It is NOT hard-coded: it comes from an environment
// variable, so the same code works locally, on staging and on production.
//
// - Locally: copy .env.example to .env.local and edit the value.
// - On a server: set NEXT_PUBLIC_API_BASE_URL in the hosting environment.
//
// The `NEXT_PUBLIC_` prefix matters. Next.js only exposes environment
// variables to browser code when they start with NEXT_PUBLIC_. The value is
// inlined at BUILD time, so never put secrets in a NEXT_PUBLIC_ variable.
// -----------------------------------------------------------------------------

// `??` uses the fallback only if the variable is missing (null/undefined).
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5131";
