// =============================================================================
// EmployeeStatus.cs: the lifecycle states an employee can be in
// =============================================================================
//
// An `enum` is a fixed list of named values. Using it instead of free text
// ("active", "Active ", "ACTIVE") makes invalid statuses impossible.
//
// The database stores these as TEXT ("Active", "Terminated"...) rather than
// numbers. See EmployeeConfiguration. Text is readable in SQL queries and
// doesn't break if someone reorders the enum members.
// -----------------------------------------------------------------------------

namespace EMS.Domain.Employees;

public enum EmployeeStatus
{
    // Currently working.
    Active,

    // Temporarily away (long leave, sabbatical) but still employed.
    OnLeave,

    // No longer employed. TerminationDate is set.
    Terminated,
}
