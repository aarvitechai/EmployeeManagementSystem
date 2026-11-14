// =============================================================================
// EmployeeContracts.cs: JSON shapes for the /api/v1/employees endpoints
// =============================================================================
//
// `Status` is a plain string here ("Active", "OnLeave", "Terminated") rather
// than the Domain enum, so EMS.Contracts stays independent of EMS.Domain.
// The validators in EMS.Application check that the text is a valid status.
//
// DateOnly is sent as "yyyy-MM-dd" in JSON, e.g. "2026-01-15".
// -----------------------------------------------------------------------------

namespace EMS.Contracts.Employees;

// What the API RETURNS for an employee. It includes the department and
// manager NAMES so the UI can show them without making extra requests.
public sealed record EmployeeResponse(
    int Id,
    string EmployeeNumber,
    string FirstName,
    string LastName,
    string FullName,
    string Email,
    string? PhoneNumber,
    DateOnly HireDate,
    DateOnly? TerminationDate,
    string Status,
    int DepartmentId,
    string DepartmentName,
    int? ManagerId,
    string? ManagerName,
    DateTime CreatedAtUtc,
    DateTime? UpdatedAtUtc,
    byte[] RowVersion);

// Body of POST /api/v1/employees.
public sealed record CreateEmployeeRequest(
    string EmployeeNumber,
    string FirstName,
    string LastName,
    string Email,
    string? PhoneNumber,
    DateOnly HireDate,
    int DepartmentId,
    int? ManagerId);

// Body of PUT /api/v1/employees/{id}. EmployeeNumber and HireDate are fixed
// after creation; Status changes go through PATCH .../status instead.
public sealed record UpdateEmployeeRequest(
    string FirstName,
    string LastName,
    string Email,
    string? PhoneNumber,
    int DepartmentId,
    int? ManagerId,
    byte[] RowVersion);

// Body of PATCH /api/v1/employees/{id}/status.
// TerminationDate is required only when Status = "Terminated".
public sealed record ChangeEmployeeStatusRequest(
    string Status,
    DateOnly? TerminationDate,
    byte[] RowVersion);

// Query-string parameters of GET /api/v1/employees, e.g.
//   /api/v1/employees?page=2&pageSize=20&search=asha&departmentId=1&sortBy=lastName
//
// A class with settable properties + defaults (instead of a positional
// record) so that every parameter is optional in the URL.
public sealed class EmployeeListQuery
{
    public int Page { get; init; } = 1;
    public int PageSize { get; init; } = 20;

    // Free text matched against name, employee number and email.
    public string? Search { get; init; }

    public int? DepartmentId { get; init; }
    public int? ManagerId { get; init; }
    public string? Status { get; init; }

    // Only a fixed "allow-list" of columns can be sorted on (design rule),
    // see EmployeeListQueryValidator.
    public string SortBy { get; init; } = "lastName";

    // "asc" (A-Z, oldest first) or "desc".
    public string SortDirection { get; init; } = "asc";
}
