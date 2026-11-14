// =============================================================================
// AppUser.cs: a login account (ASP.NET Core Identity user)
// =============================================================================
//
// ASP.NET Core Identity is Microsoft's membership system. Its IdentityUser
// base class already has everything a login needs: UserName, Email,
// PasswordHash (passwords are NEVER stored in plain text), lockout counters,
// a security stamp, etc. It's stored in the AspNetUsers table.
//
// We derive our own AppUser (instead of using IdentityUser directly) so we
// can add fields later without changing every reference, e.g. a link to the
// Employee record (design doc: "decide whether Employee references the
// Identity user"). That link is deliberately left for a later phase.
//
// Lives in Infrastructure: how logins are stored is an infrastructure detail,
// and EMS.Domain must stay free of framework types.
// -----------------------------------------------------------------------------

using Microsoft.AspNetCore.Identity;

namespace EMS.Infrastructure.Identity;

public sealed class AppUser : IdentityUser
{
}
