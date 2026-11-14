// =============================================================================
// EmsDbContext.cs: the EF Core "gateway" to the EMPMSDB SQL Server database
// =============================================================================
//
// EF Core (Entity Framework Core) is an ORM: it maps C# classes ("entities")
// to database tables, so we query and save data with C# instead of
// hand-written SQL.
//
// A DbContext represents ONE session with the database. It:
//   - exposes a DbSet<T> per table (e.g. DbSet<Employee> Employees),
//   - tracks changes to loaded entities,
//   - writes those changes in one transaction when SaveChangesAsync() runs.
//
// Why it lives in EMS.Infrastructure (not EMS.Domain): the Domain project
// holds pure business rules and must not depend on EF Core or SQL Server.
// Infrastructure is the layer allowed to know HOW data is stored.
// -----------------------------------------------------------------------------

using Microsoft.EntityFrameworkCore;

namespace EMS.Infrastructure.Persistence;

// `sealed` = nothing inherits from this class (a small, safe default).
//
// The constructor takes DbContextOptions, which carry the provider (SQL
// Server) and connection string. We never build these ourselves: ASP.NET
// Core's dependency injection creates them from the AddDbContext call in
// DependencyInjection.cs and passes them in.
public sealed class EmsDbContext(DbContextOptions<EmsDbContext> options)
    : DbContext(options)
{
    // ---- Tables -------------------------------------------------------------
    // Add one DbSet property per entity as features are built, e.g.:
    //
    //   public DbSet<Department> Departments => Set<Department>();
    //   public DbSet<Employee>   Employees   => Set<Employee>();
    //
    // Then run `dotnet ef migrations add <Name>` (see backend/README.md) so EF
    // Core generates the SQL that creates or changes the tables.

    // ---- Model configuration ------------------------------------------------
    // OnModelCreating runs once when EF Core builds its picture of the
    // database: table names, column types, keys, indexes, relationships.
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Instead of configuring every entity in this one method (which grows
        // huge), each entity gets its own class implementing
        // IEntityTypeConfiguration<T> in the Persistence/Configurations
        // folder. This line finds ALL such classes in this assembly and
        // applies them automatically.
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(EmsDbContext).Assembly);
    }
}
