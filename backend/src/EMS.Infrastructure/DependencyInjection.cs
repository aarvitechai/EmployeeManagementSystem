// =============================================================================
// DependencyInjection.cs: registers everything the Infrastructure layer offers
// =============================================================================
//
// ASP.NET Core uses Dependency Injection (DI): instead of classes creating
// their own dependencies with `new`, they ask for them in their constructor
// and the framework supplies them. For that to work, every service must
// first be REGISTERED in the service collection at startup.
//
// Rather than putting all registrations in Program.cs, each layer exposes
// one extension method (here: AddInfrastructure). Program.cs just calls
// `builder.Services.AddInfrastructure(builder.Configuration)` and stays
// clean. Later, file storage, email and cache adapters get registered here too.
// -----------------------------------------------------------------------------

using EMS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace EMS.Infrastructure;

// `static` class + `this IServiceCollection` parameter = an EXTENSION method,
// which lets us write services.AddInfrastructure(...) as if it were built in.
public static class DependencyInjection
{
    // Name of the connection string in appsettings.*.json under "ConnectionStrings".
    public const string ConnectionStringName = "EmsDb";

    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // Read "ConnectionStrings:EmsDb" from configuration (appsettings.json,
        // appsettings.{Environment}.json, environment variables, user secrets).
        // Failing fast here gives a clear error at startup instead of a
        // confusing one on the first database query.
        var connectionString = configuration.GetConnectionString(ConnectionStringName)
            ?? throw new InvalidOperationException(
                $"Connection string '{ConnectionStringName}' is not configured.");

        // AddDbContext registers EmsDbContext with a "scoped" lifetime:
        // ONE instance per HTTP request, shared by everything that request
        // uses, then disposed. DbContext is not thread-safe, so it must never
        // be a singleton.
        services.AddDbContext<EmsDbContext>(options =>
            // UseSqlServer picks the SQL Server provider (from the
            // Microsoft.EntityFrameworkCore.SqlServer package).
            options.UseSqlServer(connectionString, sql =>
            {
                // Retry automatically on short network blips / transient SQL
                // errors instead of failing the request immediately.
                sql.EnableRetryOnFailure();

                // Keep the migration files in THIS (Infrastructure) project,
                // next to the DbContext, not in EMS.Api.
                sql.MigrationsAssembly(typeof(EmsDbContext).Assembly.FullName);
            }));

        return services;
    }
}
