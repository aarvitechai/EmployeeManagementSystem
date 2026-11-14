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

    // Departments are deactivated instead of deleted, so historic employee
    // records still point to a valid department ("soft delete").
    public bool IsActive { get; private set; } = true;

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
    // Guard.* (Common/Guard.cs) throws ArgumentException on bad input, so
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

    public void Activate() => IsActive = true;
}
