// =============================================================================
// AuthContracts.cs: JSON shapes for the /api/v1/auth endpoints
// =============================================================================

namespace EMS.Contracts.Auth;

// Body of POST /api/v1/auth/login.
// RememberMe = true keeps the login cookie after the browser is closed
// (a "persistent" cookie); false = it's deleted when the browser closes.
public sealed record LoginRequest(string Email, string Password, bool RememberMe);

// Who is logged in: returned by login and by GET /api/v1/auth/me.
// The frontend uses Roles only to SHOW/HIDE buttons; the API enforces the
// real permissions on every request.
public sealed record CurrentUserResponse(string Email, IReadOnlyList<string> Roles);
