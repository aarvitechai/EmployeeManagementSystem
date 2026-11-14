// =============================================================================
// DepartmentConfiguration.cs: how the Department entity maps to SQL Server
// =============================================================================
//
// This uses EF Core's "Fluent API": method chains that describe the table.
// It keeps database details (column sizes, indexes) OUT of the Domain class.
// EmsDbContext finds this class automatically (ApplyConfigurationsFromAssembly).
// -----------------------------------------------------------------------------

using EMS.Domain.Departments;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace EMS.Infrastructure.Persistence.Configurations;

internal sealed class DepartmentConfiguration : IEntityTypeConfiguration<Department>
{
    public void Configure(EntityTypeBuilder<Department> builder)
    {
        // Table name in SQL Server: dbo.Departments
        builder.ToTable("Departments");

        // Id, CreatedAtUtc, UpdatedAtUtc, RowVersion (EntityConfiguration.cs).
        builder.ConfigureBase();

        // HasMaxLength(10) -> nvarchar(10). Without a max length EF Core would
        // use nvarchar(max), which is slower and can't be indexed.
        builder.Property(d => d.Code)
            .HasMaxLength(Department.CodeMaxLength)
            .IsRequired();                                  // NOT NULL

        builder.Property(d => d.Name)
            .HasMaxLength(Department.NameMaxLength)
            .IsRequired();

        builder.Property(d => d.Description)
            .HasMaxLength(Department.DescriptionMaxLength);  // nullable

        // New departments are active unless stated otherwise. The database
        // default also covers rows inserted by plain SQL scripts.
        builder.Property(d => d.IsActive)
            .HasDefaultValue(true);

        // ---- Indexes --------------------------------------------------------
        // UNIQUE index: SQL Server itself rejects a second "ENG" department,
        // even if two requests try to insert it at the same moment.
        builder.HasIndex(d => d.Code).IsUnique();

        // Department names should also be unique to avoid confusion in UI
        // drop-downs.
        builder.HasIndex(d => d.Name).IsUnique();

        // The Department -> Employees relationship is configured on the
        // Employee side (EmployeeConfiguration), one place per relationship.

        // Tell EF Core to use the private `_employees` field behind the
        // read-only `Employees` property when loading related rows.
        builder.Navigation(d => d.Employees)
            .UsePropertyAccessMode(PropertyAccessMode.Field);
    }
}
