// =============================================================================
// PagedResponse.cs: the shape of every paginated list the API returns
// =============================================================================
//
// EMS.Contracts holds DTOs (Data Transfer Objects): plain classes that
// describe exactly what JSON goes IN and OUT of the API. We never return
// EF Core entities directly (design rule), because that would:
//   - leak internal fields, and lock the API to the database layout,
//   - risk endless JSON loops (Employee -> Department -> Employees -> ...).
//
// A `record` is a class designed for data: concise syntax, value equality,
// and immutable `init` properties by default.
// -----------------------------------------------------------------------------

namespace EMS.Contracts.Common;

// <T> = "generic": the same wrapper works for PagedResponse<EmployeeResponse>,
// PagedResponse<LeaveRequestResponse>, etc.
public sealed record PagedResponse<T>(
    IReadOnlyList<T> Items,   // the rows on THIS page
    int Page,                 // current page number (starts at 1)
    int PageSize,             // rows per page
    int TotalCount)           // rows across ALL pages, for "showing 1-20 of 135"
{
    // Computed: how many pages exist. Integer ceiling of TotalCount / PageSize.
    public int TotalPages => PageSize == 0 ? 0 : (TotalCount + PageSize - 1) / PageSize;
}
