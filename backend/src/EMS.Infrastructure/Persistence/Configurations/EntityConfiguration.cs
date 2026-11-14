// =============================================================================
// EntityConfiguration.cs: shared column mapping for the Entity base class
// =============================================================================
//
// Every entity inherits Id, CreatedAtUtc, UpdatedAtUtc and RowVersion from
// EMS.Domain.Common.Entity. This helper maps those columns once, and each
// entity's own configuration calls it first.
// -----------------------------------------------------------------------------

using EMS.Domain.Common;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace EMS.Infrastructure.Persistence.Configurations;

internal static class EntityConfiguration
{
    // `where T : Entity` = this method only accepts types that inherit Entity.
    public static void ConfigureBase<T>(this EntityTypeBuilder<T> builder) where T : Entity
    {
        // Primary key. For an `int` key EF Core uses SQL Server IDENTITY
        // (auto-increment) by default.
        builder.HasKey(e => e.Id);

        // datetime2 is SQL Server's precise date/time type.
        builder.Property(e => e.CreatedAtUtc).HasColumnType("datetime2").IsRequired();
        builder.Property(e => e.UpdatedAtUtc).HasColumnType("datetime2");

        // IsRowVersion() maps the property to SQL Server's `rowversion` type
        // AND marks it as a concurrency token, so EF Core adds it to the
        // WHERE clause of UPDATE / DELETE statements (see Entity.cs).
        builder.Property(e => e.RowVersion).IsRowVersion();
    }
}
