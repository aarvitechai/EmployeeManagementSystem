// =============================================================================
// AuthSetup.cs: authentication (who are you?) + authorization (may you?)
// =============================================================================
//
//   AUTHENTICATION: proving identity. Here: email + password checked by
//   ASP.NET Core Identity, then a login COOKIE that the browser sends back
//   automatically on every request.
//
//   AUTHORIZATION: deciding what an authenticated user may do, based on
//   their ROLES (EMS.Application/Authorization/AppRoles.cs) via named POLICIES.
//
// Why a cookie and not a JWT kept in JavaScript? (design doc: "keep tokens
// out of localStorage")
//   - The cookie is HttpOnly: JavaScript can't read it, so an XSS bug can't
//     steal the session.
//   - SameSite=Strict: the browser only sends it on requests that come FROM
//     our own site, which blocks most cross-site request forgery (CSRF).
//     CsrfHeaderMiddleware adds a second layer.
//   - No refresh-token logic needed: the cookie has a sliding expiration.
//
// NOTE: SameSite=Strict requires the frontend and API to be the SAME SITE,
// i.e. same registrable domain: localhost:3000 + localhost:5131 locally, or
// e.g. app.example.com + api.example.com in production.
// -----------------------------------------------------------------------------

using EMS.Application.Authorization;
using EMS.Infrastructure.Identity;
using EMS.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;

namespace EMS.Api.Security;

// Names of authorization policies used in [Authorize(Policy = ...)].
public static class Policies
{
    // Read employees/departments: admins, HR and managers.
    // (Later: managers should only see their own team, a resource-based rule.)
    public const string ViewOrganization = "ViewOrganization";

    // Create / edit / change status / delete: admins and HR only.
    public const string ManageOrganization = "ManageOrganization";
}

public static class AuthSetup
{
    public static IServiceCollection AddEmsAuth(this IServiceCollection services, IWebHostEnvironment environment)
    {
        // ---- Authentication: the cookie "schemes" Identity uses -------------
        // IdentityConstants.ApplicationScheme = the normal login cookie.
        services.AddAuthentication(IdentityConstants.ApplicationScheme)
            .AddIdentityCookies();

        // ---- ASP.NET Core Identity -------------------------------------------
        // AddIdentityCore = the user/password/role machinery WITHOUT the
        // built-in Razor login pages (we have our own Next.js login page).
        services.AddIdentityCore<AppUser>(options =>
            {
                // Password rules (checked when an account is created).
                options.Password.RequiredLength = 10;
                options.Password.RequireDigit = true;
                options.Password.RequireUppercase = true;
                options.Password.RequireLowercase = true;
                options.Password.RequireNonAlphanumeric = true;

                // LOCKOUT: after 5 wrong passwords the account is blocked for
                // 15 minutes. This stops password guessing ("brute force").
                options.Lockout.MaxFailedAccessAttempts = 5;
                options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
                options.Lockout.AllowedForNewUsers = true;

                options.User.RequireUniqueEmail = true;
            })
            // Enable roles (AspNetRoles table) and put role claims in the cookie.
            .AddRoles<IdentityRole>()
            // Store users and roles in our EmsDbContext (SQL Server).
            .AddEntityFrameworkStores<EmsDbContext>()
            // SignInManager: checks passwords, applies lockout, writes the cookie.
            .AddSignInManager();

        // ---- The login cookie -------------------------------------------------
        services.ConfigureApplicationCookie(options =>
        {
            options.Cookie.Name = "ems_auth";
            options.Cookie.HttpOnly = true;                     // not readable by JavaScript
            options.Cookie.SameSite = SameSiteMode.Strict;      // only sent from our own site
            // Secure = only sent over HTTPS. Locally the API runs on plain
            // http://localhost, so Development uses "same as the request".
            options.Cookie.SecurePolicy = environment.IsDevelopment()
                ? CookieSecurePolicy.SameAsRequest
                : CookieSecurePolicy.Always;

            // Logged in for 8 hours; each request in the second half of that
            // window renews it ("sliding"), so active users stay logged in.
            options.ExpireTimeSpan = TimeSpan.FromHours(8);
            options.SlidingExpiration = true;

            // Cookie auth was designed for server-rendered sites, so by default
            // it REDIRECTS to a login page. An API should answer with status
            // codes instead: 401 = not logged in, 403 = logged in but not allowed.
            // (UseStatusCodePages then turns them into Problem Details JSON.)
            options.Events.OnRedirectToLogin = context =>
            {
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                return Task.CompletedTask;
            };
            options.Events.OnRedirectToAccessDenied = context =>
            {
                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                return Task.CompletedTask;
            };
        });

        // ---- Authorization policies -------------------------------------------
        services.AddAuthorizationBuilder()
            // FALLBACK policy: applies to every endpoint WITHOUT its own
            // [Authorize]/[AllowAnonymous]. "Deny by default": a new endpoint
            // is protected even if someone forgets to add an attribute.
            .SetFallbackPolicy(new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build())
            .AddPolicy(Policies.ViewOrganization, policy =>
                policy.RequireRole(AppRoles.SystemAdmin, AppRoles.HRAdmin, AppRoles.Manager))
            .AddPolicy(Policies.ManageOrganization, policy =>
                policy.RequireRole(AppRoles.SystemAdmin, AppRoles.HRAdmin));

        return services;
    }
}
