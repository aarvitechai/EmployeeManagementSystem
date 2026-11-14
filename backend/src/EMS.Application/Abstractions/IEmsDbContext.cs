// =============================================================================
// IEmsDbContext.cs: what the Application layer needs from the database
// =============================================================================
//
// Layer rule: EMS.Application must NOT reference EMS.Infrastructure (the
// arrow points the other way: Infrastructure -> Application). So how do the
// services in this project reach the database?
//
// "Dependency Inversion": Application declares an INTERFACE describing what
// it needs; Infrastructure's EmsDbContext IMPLEMENTS it; DI connects the two
// at startup (see EMS.Infrastructure/DependencyInjection.cs).
//
// Benefit: services depend on this small interface, not on SQL Server, so
// they can later be tested with an in-memory/fake implementation.
//
// Pragmatic choice: exposing DbSet<T> means Application uses EF Core's LINQ
// API (it references the Microsoft.EntityFrameworkCore package, but NOT the
// SQL Server provider). That's simpler than writing a repository class for
// every entity, and is a common, accepted approach.
// -----------------------------------------------------------------------------

using EMS.Domain.Departments;
using EMS.Domain.Employees;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;

namespace EMS.Application.Abstractions;

public interface IEmsDbContext
{
    DbSet<Department> Departments { get; }
    DbSet<Employee> Employees { get; }

    // Access EF Core's tracking info for one entity. We use it to give EF Core
    // the RowVersion the client sent, for optimistic concurrency checks.
    EntityEntry<TEntity> Entry<TEntity>(TEntity entity) where TEntity : class;

    // Write all pending changes to the database in one transaction.
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
