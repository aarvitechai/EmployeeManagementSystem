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

using EMS.Application.Abstractions;
using EMS.Domain.Common;
using EMS.Domain.Departments;
using EMS.Domain.Employees;
using Microsoft.EntityFrameworkCore;

namespace EMS.Infrastructure.Persistence;

// `sealed` = nothing inherits from this class (a small, safe default).
//
// The constructor takes DbContextOptions, which carry the provider (SQL
// Server) and connection string. We never build these ourselves: ASP.NET
// Core's dependency injection creates them from the AddDbContext call in
// DependencyInjection.cs and passes them in.
//
// It also implements IEmsDbContext (defined in EMS.Application), which is
// how the Application layer's services reach the database without knowing
// about this class or SQL Server. DbContext already has public Entry() and
// SaveChangesAsync() methods, so they satisfy the interface automatically.
public sealed class EmsDbContext(DbContextOptions<EmsDbContext> options)
    : DbContext(options), IEmsDbContext
{
    // ---- Tables -------------------------------------------------------------
    // One DbSet per table. Query them with LINQ, e.g.
    //   await db.Employees.Where(e => e.Status == EmployeeStatus.Active).ToListAsync();
    //
    // `=> Set<T>()` returns EF Core's DbSet for that entity type.
    public DbSet<Department> Departments => Set<Department>();
    public DbSet<Employee> Employees => Set<Employee>();

    // After adding a DbSet or changing a configuration, run
    // `dotnet ef migrations add <Name>` (see backend/README.md) so EF Core
    // generates the SQL that creates or changes the tables.

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

    // ---- Automatic audit timestamps -----------------------------------------
    // We override saving so CreatedAtUtc / UpdatedAtUtc are filled in for
    // EVERY entity, in ONE place, every time anything is saved.
    //
    // EF Core has 4 SaveChanges overloads; the other two call these two, so
    // overriding these covers both SaveChanges() and SaveChangesAsync().
    public override int SaveChanges(bool acceptAllChangesOnSuccess)
    {
        SetAuditTimestamps();
        return base.SaveChanges(acceptAllChangesOnSuccess);
    }

    public override Task<int> SaveChangesAsync(
        bool acceptAllChangesOnSuccess,
        CancellationToken cancellationToken = default)
    {
        SetAuditTimestamps();
        return base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken);
    }

    private void SetAuditTimestamps()
    {
        var now = DateTime.UtcNow;

        // ChangeTracker knows every entity this context loaded or was given,
        // and whether it is Added, Modified, Deleted or Unchanged.
        foreach (var entry in ChangeTracker.Entries<Entity>())
        {
            if (entry.State == EntityState.Added)
            {
                entry.Entity.CreatedAtUtc = now;
            }
            else if (entry.State == EntityState.Modified)
            {
                entry.Entity.UpdatedAtUtc = now;
            }
        }
    }
}
