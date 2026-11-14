// =============================================================================
// DepartmentContracts.cs: JSON shapes for the /api/v1/departments endpoints
// =============================================================================
//
// ASP.NET Core converts JSON <-> these records automatically, using
// camelCase names: `EmployeeCount` becomes "employeeCount" in JSON.
// -----------------------------------------------------------------------------

namespace EMS.Contracts.Departments;

// What the API RETURNS for a department.
public sealed record DepartmentResponse(
    int Id,
    string Code,
    string Name,
    string? Description,
    bool IsActive,
    int EmployeeCount,
    DateTime CreatedAtUtc,
    DateTime? UpdatedAtUtc,
    // Concurrency token. byte[] is sent as a Base64 string in JSON, e.g.
    // "AAAAAAAAB9E=". The client must send it back unchanged when updating.
    byte[] RowVersion);

// Body of POST /api/v1/departments.
public sealed record CreateDepartmentRequest(
    string Code,
    string Name,
    string? Description);

// Body of PUT /api/v1/departments/{id}.
// `Code` is deliberately NOT here: a business code should not change after
// creation, because other systems/reports may rely on it.
public sealed record UpdateDepartmentRequest(
    string Name,
    string? Description,
    bool IsActive,
    byte[] RowVersion);
