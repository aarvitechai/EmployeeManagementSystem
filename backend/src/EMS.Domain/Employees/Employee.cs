// =============================================================================
// Employee.cs: a person employed by the organisation
// =============================================================================
//
// Relationships (from the design doc's ER diagram):
//   - Department 1-to-many Employee : every employee belongs to ONE department.
//   - Employee  1-to-many Employee  : an employee MAY have a manager, who is
//     also an Employee (a "self-referencing" relationship), and a manager can
//     have many direct reports.
//
// Business rules enforced here (the Domain layer):
//   - required fields can't be empty,
//   - an employee can't be their own manager,
//   - termination date can't be before the hire date.
// The database ALSO enforces the important ones (unique EmployeeNumber,
// foreign keys, a CHECK constraint on dates) as a second safety net.
// -----------------------------------------------------------------------------

using EMS.Domain.Common;
using EMS.Domain.Departments;

namespace EMS.Domain.Employees;

public sealed class Employee : Entity
{
    public const int EmployeeNumberMaxLength = 20;
    public const int NameMaxLength = 100;
    public const int EmailMaxLength = 256;
    public const int PhoneMaxLength = 20;

    // Business identifier shown to people, e.g. "EMP-0001". Different from
    // `Id`, which is an internal database key. Must be UNIQUE.
    public string EmployeeNumber { get; private set; } = string.Empty;

    public string FirstName { get; private set; } = string.Empty;
    public string LastName { get; private set; } = string.Empty;

    // Work email, unique per employee. Stored lower-case so comparisons are
    // simple.
    public string Email { get; private set; } = string.Empty;

    public string? PhoneNumber { get; private set; }

    // DateOnly (no time part) because a hire date is a calendar date, not a
    // moment in time. SQL Server stores it as the `date` type.
    public DateOnly HireDate { get; private set; }
    public DateOnly? TerminationDate { get; private set; }

    public EmployeeStatus Status { get; private set; } = EmployeeStatus.Active;

    // SOFT DELETE flag. Different from termination:
    //   Terminated = the person LEFT. They stay visible in lists and history
    //                (status "Terminated").
    //   IsDeleted  = the record should not exist (e.g. created by mistake).
    //                The row stays in the table, but the app hides it
    //                everywhere, and its employee number / email may be reused.
    public bool IsDeleted { get; private set; }

    // ---- Department relationship ------------------------------------------
    // `DepartmentId` is the FOREIGN KEY column stored in the Employees table.
    // `Department` is the NAVIGATION property: the related object, loaded by
    // EF Core when you ask for it (e.g. `.Include(e => e.Department)`).
    // `= null!` tells the compiler "EF Core will fill this in"; it's null
    // until loaded.
    public int DepartmentId { get; private set; }
    public Department Department { get; private set; } = null!;

    // ---- Manager relationship (self-reference) ----------------------------
    // `int?` = nullable: the CEO / top-level employees have no manager.
    public int? ManagerId { get; private set; }
    public Employee? Manager { get; private set; }

    // The other side of the manager relationship: people who report to me.
    private readonly List<Employee> _directReports = [];
    public IReadOnlyCollection<Employee> DirectReports => _directReports;

    // Convenience property computed in C#. Not stored in the database
    // (ignored in EmployeeConfiguration).
    public string FullName => $"{FirstName} {LastName}";

    // For EF Core only (see the comment in Department.cs).
    private Employee() { }

    public Employee(
        string employeeNumber,
        string firstName,
        string lastName,
        string email,
        DateOnly hireDate,
        int departmentId,
        string? phoneNumber = null)
    {
        EmployeeNumber = Guard.Required(employeeNumber, nameof(employeeNumber), EmployeeNumberMaxLength).ToUpperInvariant();
        FirstName = Guard.Required(firstName, nameof(firstName), NameMaxLength);
        LastName = Guard.Required(lastName, nameof(lastName), NameMaxLength);
        Email = Guard.Required(email, nameof(email), EmailMaxLength).ToLowerInvariant();
        PhoneNumber = Guard.Optional(phoneNumber, nameof(phoneNumber), PhoneMaxLength);
        HireDate = hireDate;
        DepartmentId = Guard.PositiveId(departmentId, nameof(departmentId));
    }

    public void UpdateContactDetails(string firstName, string lastName, string email, string? phoneNumber)
    {
        FirstName = Guard.Required(firstName, nameof(firstName), NameMaxLength);
        LastName = Guard.Required(lastName, nameof(lastName), NameMaxLength);
        Email = Guard.Required(email, nameof(email), EmailMaxLength).ToLowerInvariant();
        PhoneNumber = Guard.Optional(phoneNumber, nameof(phoneNumber), PhoneMaxLength);
    }

    public void MoveToDepartment(int departmentId)
    {
        DepartmentId = Guard.PositiveId(departmentId, nameof(departmentId));
    }

    // Pass null to remove the manager.
    public void AssignManager(int? managerId)
    {
        // Rule: nobody can manage themselves. (Id is 0 before the first save,
        // so this check is only meaningful for saved employees.)
        if (managerId is not null && Id != 0 && managerId == Id)
            throw new DomainException("An employee cannot be their own manager.");

        ManagerId = managerId;
    }

    public void MarkOnLeave()
    {
        EnsureNotTerminated();
        Status = EmployeeStatus.OnLeave;
    }

    public void MarkActive()
    {
        EnsureNotTerminated();
        Status = EmployeeStatus.Active;
    }

    public void Terminate(DateOnly terminationDate)
    {
        // Rule from the design doc: end date >= start date.
        if (terminationDate < HireDate)
            throw new DomainException("Termination date cannot be before the hire date.");

        TerminationDate = terminationDate;
        Status = EmployeeStatus.Terminated;
    }

    // `hasDirectReports` is counted by the Application layer in the database
    // (this entity doesn't load its reports). Rule: someone who still
    // manages people can't be deleted, or those reports would point at a
    // manager who no longer appears anywhere. Reassign them first.
    public void MarkDeleted(bool hasDirectReports)
    {
        if (hasDirectReports)
            throw new DomainException("An employee who still manages other employees cannot be deleted. Assign them a new manager first.");

        IsDeleted = true;
    }

    private void EnsureNotTerminated()
    {
        if (Status == EmployeeStatus.Terminated)
            throw new DomainException("A terminated employee cannot change status.");
    }
}
