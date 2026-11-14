# Entity configurations

One class per entity, implementing `IEntityTypeConfiguration<T>`. `EmsDbContext`
picks them all up automatically via `ApplyConfigurationsFromAssembly`.

Example (for when the `Department` entity is added to `EMS.Domain`):

```csharp
// Describes how the Department entity maps to the "Departments" table.
public sealed class DepartmentConfiguration : IEntityTypeConfiguration<Department>
{
    public void Configure(EntityTypeBuilder<Department> builder)
    {
        builder.ToTable("Departments");                  // table name
        builder.HasKey(d => d.Id);                       // primary key
        builder.Property(d => d.Name)
               .HasMaxLength(100)                        // nvarchar(100)
               .IsRequired();                            // NOT NULL
        builder.HasIndex(d => d.Name).IsUnique();        // no duplicate names
    }
}
```
