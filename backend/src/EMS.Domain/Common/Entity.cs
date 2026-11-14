// =============================================================================
// Entity.cs: base class shared by every domain entity (Department, Employee...)
// =============================================================================
//
// An "entity" is an object with an identity that stays the same over time.
// Two employees with the same name are still different employees, because
// their Ids differ.
//
// Putting the common columns here means every table automatically gets an Id,
// audit timestamps and a concurrency token, without repeating the code.
//
// NOTE: this project is EMS.Domain, so there is NO reference to EF Core or
// SQL Server here. How these properties map to columns is decided in
// EMS.Infrastructure (Persistence/Configurations).
// -----------------------------------------------------------------------------

namespace EMS.Domain.Common;

// `abstract` = you can't create an `Entity` directly, only subclasses of it.
public abstract class Entity
{
    // Primary key. `int` + SQL Server IDENTITY: the database generates
    // 1, 2, 3... on insert, so a brand-new entity has Id = 0 until it's saved.
    //
    // `protected set`: only this class and its subclasses (and EF Core, which
    // can write non-public setters) may change it. Other code can only read it.
    public int Id { get; protected set; }

    // When the row was created / last changed, always in UTC (design rule:
    // store UTC, convert to local time only for display). These are filled in
    // automatically by EmsDbContext.SaveChangesAsync, so code never has to
    // remember to set them.
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? UpdatedAtUtc { get; set; }

    // Concurrency token (SQL Server `rowversion`). SQL Server changes this
    // value automatically on EVERY update of the row.
    //
    // Why: if two HR users open the same employee and both click Save, EF
    // Core sends "UPDATE ... WHERE Id = @id AND RowVersion = @originalValue".
    // The second save matches 0 rows (the version already changed), so EF
    // Core throws DbUpdateConcurrencyException instead of silently
    // overwriting the first user's changes ("optimistic concurrency").
    //
    // `= []` gives a non-null default; the database supplies the real value.
    public byte[] RowVersion { get; private set; } = [];
}
