// =============================================================================
// Department.cs: an organisational unit (e.g. "ENG - Engineering")
// =============================================================================
//
// Relationship: ONE Department has MANY Employees (1-to-many).
//
// Design style used for all entities in this project:
//   - Properties have PRIVATE setters, so outside code can't put the object
//     into an invalid state (e.g. a department with an empty name).
//   - Changes go through methods (Rename, Deactivate...) that check the
//     business rules first. This is called "encapsulation".
// -----------------------------------------------------------------------------

using EMS.Domain.Common;
using EMS.Domain.Employees;

namespace EMS.Domain.Departments;

public sealed class Department : Entity
{
    // Limits shared with the database configuration (column sizes) and,
    // later, with request validation, so they're defined in ONE place.
    public const int CodeMaxLength = 10;
    public const int NameMaxLength = 100;
    public const int DescriptionMaxLength = 500;

    // Short unique business code, e.g. "ENG", "HR". Stored in upper case.
    // The design doc requires it to be UNIQUE (enforced by a DB index).
    public string Code { get; private set; } = string.Empty;

    public string Name { get; private set; } = string.Empty;

    // `string?` = optional (nullable column).
    public string? Description { get; private set; }

    // IsActive = false: the department still exists and is listed (e.g.
    // "Show inactive"), but no new employees can join it. Reversible.
    public bool IsActive { get; private set; } = true;

    // IsDeleted = true: "SOFT DELETE". The row stays in the table (so history,
    // audit and foreign keys stay valid) but the application treats it as gone:
    // it is hidden from every list and lookup, and its code/name may be
    // reused by a new department. A hard DELETE would lose that history.
    public bool IsDeleted { get; private set; }

    // Navigation property: lets EF Core load a department's employees
    // (e.g. `.Include(d => d.Employees)`). Outside code can READ the list
    // but can't add/remove items directly (IReadOnlyCollection).
    private readonly List<Employee> _employees = [];
    public IReadOnlyCollection<Employee> Employees => _employees;

    // EF Core needs a parameterless constructor to create objects when it
    // reads rows from the database. `private` hides it from our own code,
    // so we're forced to use the validating constructor below.
    private Department() { }

    // The only way for application code to create a Department.
    // Guard.* (Common/Guard.cs) throws DomainException on bad input, so
    // invalid data can never get past the domain, no matter which API
    // endpoint or background job tries to create it.
    public Department(string code, string name, string? description = null)
    {
        // Trim + upper-case so " eng " and "ENG" are the same code.
        Code = Guard.Required(code, nameof(code), CodeMaxLength).ToUpperInvariant();
        Name = Guard.Required(name, nameof(name), NameMaxLength);
        Description = Guard.Optional(description, nameof(description), DescriptionMaxLength);
    }

    public void Rename(string name, string? description)
    {
        Name = Guard.Required(name, nameof(name), NameMaxLength);
        Description = Guard.Optional(description, nameof(description), DescriptionMaxLength);
    }

    public void Deactivate() => IsActive = false;

    public void Activate()
    {
        if (IsDeleted)
            throw new DomainException("A deleted department cannot be activated.");

        IsActive = true;
    }

    // Soft-delete this department.
    //
    // `hasEmployees` is passed in by the caller (the Application layer counts
    // them in the database), because this entity doesn't load its employees.
    // Rule: only an EMPTY department can be deleted. Otherwise employees
    // would point at a department that no longer appears anywhere.
    public void MarkDeleted(bool hasEmployees)
    {
        if (hasEmployees)
            throw new DomainException("A department that still has employees cannot be deleted. Move them first.");

        IsDeleted = true;
        IsActive = false;   // a deleted department is never active
    }
}
