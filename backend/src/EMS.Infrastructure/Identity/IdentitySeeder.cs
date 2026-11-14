// =============================================================================
// IdentitySeeder.cs: creates the roles and (optionally) starter accounts
// =============================================================================
//
// Runs once at API startup (Program.cs):
//   1. ROLES: every role in AppRoles is created if missing. Always safe to run.
//   2. USERS: accounts listed under "SeedUsers" in configuration are created
//      if their email doesn't exist yet. Existing users are never changed.
//
// Where do seed passwords come from? NEVER from a committed file. In
// Development they live in .NET "user secrets": a JSON file in your user
// profile, outside the repository (see backend/README.md). On a server you'd
// set them as environment variables, or skip seeding entirely.
//
//   "SeedUsers": [
//     { "Email": "admin@ems.local", "Password": "...", "Role": "SystemAdmin" }
//   ]
// -----------------------------------------------------------------------------

using EMS.Application.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace EMS.Infrastructure.Identity;

public static class IdentitySeeder
{
    // Shape of one entry in the "SeedUsers" configuration array.
    public sealed class SeedUser
    {
        public string Email { get; init; } = string.Empty;
        public string Password { get; init; } = string.Empty;
        public string Role { get; init; } = string.Empty;
    }

    public static async Task SeedAsync(IServiceProvider services, IConfiguration configuration, ILogger logger)
    {
        // UserManager/RoleManager are SCOPED services (they use the scoped
        // DbContext), and at startup there's no HTTP request scope, so we
        // create one ourselves. `using` disposes it at the end.
        using var scope = services.CreateScope();
        var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();

        // ---- 1. Roles --------------------------------------------------------
        foreach (var role in AppRoles.All)
        {
            if (!await roleManager.RoleExistsAsync(role))
            {
                await roleManager.CreateAsync(new IdentityRole(role));
                logger.LogInformation("Created role {Role}", role);
            }
        }

        // ---- 2. Users (only those configured) --------------------------------
        var seedUsers = configuration.GetSection("SeedUsers").Get<SeedUser[]>() ?? [];

        foreach (var seed in seedUsers)
        {
            if (string.IsNullOrWhiteSpace(seed.Email) || string.IsNullOrWhiteSpace(seed.Password))
                continue;

            if (!AppRoles.All.Contains(seed.Role))
            {
                logger.LogWarning("Seed user {Email} has unknown role '{Role}'; skipped.", seed.Email, seed.Role);
                continue;
            }

            if (await userManager.FindByEmailAsync(seed.Email) is not null)
                continue; // already exists: leave it alone

            // We log in with the email, so it's also the UserName.
            var user = new AppUser { UserName = seed.Email, Email = seed.Email, EmailConfirmed = true };

            // CreateAsync HASHES the password (PBKDF2 with a random salt) and
            // checks it against the password rules (DependencyInjection.cs).
            var result = await userManager.CreateAsync(user, seed.Password);
            if (!result.Succeeded)
            {
                // Never log the password itself.
                logger.LogWarning("Could not create seed user {Email}: {Errors}",
                    seed.Email, string.Join(" ", result.Errors.Select(e => e.Description)));
                continue;
            }

            await userManager.AddToRoleAsync(user, seed.Role);
            logger.LogInformation("Created seed user {Email} with role {Role}", seed.Email, seed.Role);
        }
    }
}
