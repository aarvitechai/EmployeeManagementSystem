// =============================================================================
// EmployeeConfiguration.cs: how the Employee entity maps to SQL Server
// =============================================================================

using EMS.Domain.Employees;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace EMS.Infrastructure.Persistence.Configurations;

internal sealed class EmployeeConfiguration : IEntityTypeConfiguration<Employee>
{
    public void Configure(EntityTypeBuilder<Employee> builder)
    {
        // Table name + a CHECK constraint. A check constraint is a rule SQL
        // Server tests on every INSERT/UPDATE; a row breaking it is rejected.
        // Rule from the design doc: end date >= start date.
        builder.ToTable("Employees", table =>
            table.HasCheckConstraint(
                "CK_Employees_TerminationDate_AfterHireDate",
                "[TerminationDate] IS NULL OR [TerminationDate] >= [HireDate]"));

        builder.ConfigureBase();

        // ---- Columns --------------------------------------------------------

        builder.Property(e => e.EmployeeNumber)
            .HasMaxLength(Employee.EmployeeNumberMaxLength)
            .IsRequired();

        builder.Property(e => e.FirstName)
            .HasMaxLength(Employee.NameMaxLength)
            .IsRequired();

        builder.Property(e => e.LastName)
            .HasMaxLength(Employee.NameMaxLength)
            .IsRequired();

        builder.Property(e => e.Email)
            .HasMaxLength(Employee.EmailMaxLength)
            .IsRequired();

        builder.Property(e => e.PhoneNumber)
            .HasMaxLength(Employee.PhoneMaxLength);

        // DateOnly maps to SQL Server's `date` type automatically.
        builder.Property(e => e.HireDate).IsRequired();

        // Store the enum as TEXT ("Active", "OnLeave", "Terminated") instead of
        // 0/1/2. Readable in SQL and safe if the enum order ever changes.
        builder.Property(e => e.Status)
            .HasConversion<string>()
            .HasMaxLength(20)
            .IsRequired();

        // FullName is computed in C# (FirstName + LastName). Don't create a column.
        builder.Ignore(e => e.FullName);

        // ---- Relationships --------------------------------------------------

        // Department 1-to-many Employee:
        //   HasOne(e => e.Department)      each employee has one department
        //   .WithMany(d => d.Employees)    a department has many employees
        //   .HasForeignKey(e => e.DepartmentId)
        //
        // DeleteBehavior.Restrict: SQL Server REFUSES to delete a department
        // that still has employees, instead of deleting all of them too
        // (Cascade). Deleting people by accident would be far worse.
        builder.HasOne(e => e.Department)
            .WithMany(d => d.Employees)
            .HasForeignKey(e => e.DepartmentId)
            .OnDelete(DeleteBehavior.Restrict);

        // Employee (manager) 1-to-many Employee (direct reports):
        // a SELF-referencing foreign key: ManagerId points to another row in
        // the same Employees table. Restrict is also REQUIRED here: SQL Server
        // does not allow cascade delete on a self-referencing key.
        builder.HasOne(e => e.Manager)
            .WithMany(m => m.DirectReports)
            .HasForeignKey(e => e.ManagerId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Navigation(e => e.DirectReports)
            .UsePropertyAccessMode(PropertyAccessMode.Field);

        // ---- Indexes --------------------------------------------------------
        // Unique business identifiers (design doc: unique EmployeeNumber).
        builder.HasIndex(e => e.EmployeeNumber).IsUnique();
        builder.HasIndex(e => e.Email).IsUnique();

        // Speed up common list filters / sorting: by status, and by name.
        // (EF Core already indexes the foreign keys DepartmentId and ManagerId.)
        builder.HasIndex(e => e.Status);
        builder.HasIndex(e => new { e.LastName, e.FirstName });
    }
}
