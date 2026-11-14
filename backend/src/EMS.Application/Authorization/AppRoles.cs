// =============================================================================
// AppRoles.cs: the role names used for authorization (from the design doc)
// =============================================================================
//
// A ROLE is a named group of permissions. Each user is put in one or more
// roles, and endpoints say which roles may call them.
//
//   SystemAdmin  user accounts, roles, configuration; full access
//   HRAdmin      employee records, departments, employee lifecycle
//   Manager      team visibility (later: approve team leave requests)
//   Employee     own profile and leave requests (screens come later)
//
// Constants instead of string literals everywhere: a typo like "HrAdmin"
// becomes a compile error instead of a silent "access denied".
// -----------------------------------------------------------------------------

namespace EMS.Application.Authorization;

public static class AppRoles
{
    public const string SystemAdmin = "SystemAdmin";
    public const string HRAdmin = "HRAdmin";
    public const string Manager = "Manager";
    public const string Employee = "Employee";

    // Used by the seeder to create every role in the database.
    public static readonly string[] All = [SystemAdmin, HRAdmin, Manager, Employee];
}
