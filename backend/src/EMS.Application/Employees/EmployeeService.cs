// =============================================================================
// EmployeeService.cs: the employee "use cases"
// =============================================================================
//
//   GetPagedAsync      search / filter / sort / paginate the employee list
//   GetByIdAsync       one employee
//   CreateAsync        hire a new employee
//   UpdateAsync        change contact details, department, manager
//   ChangeStatusAsync  Active / OnLeave / Terminated
//
// See DepartmentService.cs for the general pattern (validate -> check rules
// that need the database -> call entity methods -> save -> return DTO).
// -----------------------------------------------------------------------------

using System.Linq.Expressions;
using EMS.Application.Abstractions;
using EMS.Application.Common;
using EMS.Contracts.Common;
using EMS.Contracts.Employees;
using EMS.Domain.Employees;
using FluentValidation;
using Microsoft.EntityFrameworkCore;

namespace EMS.Application.Employees;

public interface IEmployeeService
{
    Task<PagedResponse<EmployeeResponse>> GetPagedAsync(EmployeeListQuery query, CancellationToken ct);
    Task<EmployeeResponse> GetByIdAsync(int id, CancellationToken ct);
    Task<EmployeeResponse> CreateAsync(CreateEmployeeRequest request, CancellationToken ct);
    Task<EmployeeResponse> UpdateAsync(int id, UpdateEmployeeRequest request, CancellationToken ct);
    Task<EmployeeResponse> ChangeStatusAsync(int id, ChangeEmployeeStatusRequest request, CancellationToken ct);
}

internal sealed class EmployeeService(
    IEmsDbContext db,
    IValidator<EmployeeListQuery> listValidator,
    IValidator<CreateEmployeeRequest> createValidator,
    IValidator<UpdateEmployeeRequest> updateValidator,
    IValidator<ChangeEmployeeStatusRequest> statusValidator) : IEmployeeService
{
    // Projection Employee -> EmployeeResponse, translated by EF Core into ONE
    // SQL query with JOINs to Departments and to the manager's row. No
    // separate queries, and no `.Include()` needed when projecting.
    //
    // Note: `FullName` on the entity is computed in C# and has no column, so
    // inside a query we build the name from FirstName + LastName instead.
    private static readonly Expression<Func<Employee, EmployeeResponse>> ToResponse =
        e => new EmployeeResponse(
            e.Id,
            e.EmployeeNumber,
            e.FirstName,
            e.LastName,
            e.FirstName + " " + e.LastName,
            e.Email,
            e.PhoneNumber,
            e.HireDate,
            e.TerminationDate,
            e.Status.ToString(),
            e.DepartmentId,
            e.Department.Name,
            e.ManagerId,
            e.Manager == null ? null : e.Manager.FirstName + " " + e.Manager.LastName,
            e.CreatedAtUtc,
            e.UpdatedAtUtc,
            e.RowVersion);

    // ---- Queries ------------------------------------------------------------

    public async Task<PagedResponse<EmployeeResponse>> GetPagedAsync(EmployeeListQuery query, CancellationToken ct)
    {
        await listValidator.ValidateAndThrowAsync(query, ct);

        // Start from all employees and add filters one by one. Nothing is sent
        // to SQL Server yet. Each Where() just adds to the future SQL.
        var employees = db.Employees.AsQueryable();

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var term = query.Search.Trim();
            // Contains() becomes SQL `LIKE '%term%'`. EF Core sends `term`
            // as a PARAMETER, never pasted into the SQL text, which protects
            // against SQL injection.
            employees = employees.Where(e =>
                e.FirstName.Contains(term) ||
                e.LastName.Contains(term) ||
                e.EmployeeNumber.Contains(term) ||
                e.Email.Contains(term));
        }

        if (query.DepartmentId is not null)
            employees = employees.Where(e => e.DepartmentId == query.DepartmentId);

        if (query.ManagerId is not null)
            employees = employees.Where(e => e.ManagerId == query.ManagerId);

        if (!string.IsNullOrWhiteSpace(query.Status))
        {
            var status = Enum.Parse<EmployeeStatus>(query.Status, ignoreCase: true);
            employees = employees.Where(e => e.Status == status);
        }

        // Total BEFORE paging, for "page 2 of 7". This is one SQL COUNT(*).
        var totalCount = await employees.CountAsync(ct);

        var items = await ApplySorting(employees, query.SortBy, query.SortDirection)
            // Skip/Take become SQL OFFSET ... FETCH NEXT ...: only one page of
            // rows ever leaves the database.
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .Select(ToResponse)
            .ToListAsync(ct);

        return new PagedResponse<EmployeeResponse>(items, query.Page, query.PageSize, totalCount);
    }

    public async Task<EmployeeResponse> GetByIdAsync(int id, CancellationToken ct)
    {
        return await db.Employees
            .Where(e => e.Id == id)
            .Select(ToResponse)
            .FirstOrDefaultAsync(ct)
            ?? throw new NotFoundException("Employee", id);
    }

    // ---- Commands -----------------------------------------------------------

    public async Task<EmployeeResponse> CreateAsync(CreateEmployeeRequest request, CancellationToken ct)
    {
        await createValidator.ValidateAndThrowAsync(request, ct);

        // Normalise exactly like the entity does, so duplicate checks match.
        var employeeNumber = request.EmployeeNumber.Trim().ToUpperInvariant();
        var email = request.Email.Trim().ToLowerInvariant();

        if (await db.Employees.AnyAsync(e => e.EmployeeNumber == employeeNumber, ct))
            throw new ConflictException($"Employee number '{employeeNumber}' is already in use.");

        await EnsureEmailIsFreeAsync(email, exceptEmployeeId: null, ct);
        await EnsureDepartmentCanTakeEmployeesAsync(request.DepartmentId, ct);
        if (request.ManagerId is not null)
            await EnsureValidManagerAsync(request.ManagerId.Value, employeeId: null, ct);

        var employee = new Employee(
            employeeNumber,
            request.FirstName,
            request.LastName,
            email,
            request.HireDate,
            request.DepartmentId,
            request.PhoneNumber);

        employee.AssignManager(request.ManagerId);

        db.Employees.Add(employee);
        await db.SaveChangesAsync(ct);

        return await GetByIdAsync(employee.Id, ct);
    }

    public async Task<EmployeeResponse> UpdateAsync(int id, UpdateEmployeeRequest request, CancellationToken ct)
    {
        await updateValidator.ValidateAndThrowAsync(request, ct);

        var employee = await db.Employees.FirstOrDefaultAsync(e => e.Id == id, ct)
            ?? throw new NotFoundException("Employee", id);

        var email = request.Email.Trim().ToLowerInvariant();
        await EnsureEmailIsFreeAsync(email, exceptEmployeeId: id, ct);

        // Only check the department if it actually changes, so an employee in
        // a department that was LATER deactivated can still be edited.
        if (request.DepartmentId != employee.DepartmentId)
            await EnsureDepartmentCanTakeEmployeesAsync(request.DepartmentId, ct);

        if (request.ManagerId is not null && request.ManagerId != employee.ManagerId)
            await EnsureValidManagerAsync(request.ManagerId.Value, employeeId: id, ct);

        employee.UpdateContactDetails(request.FirstName, request.LastName, email, request.PhoneNumber);
        employee.MoveToDepartment(request.DepartmentId);
        employee.AssignManager(request.ManagerId);

        db.SetOriginalRowVersion(employee, request.RowVersion);
        await db.SaveChangesAsync(ct);

        return await GetByIdAsync(id, ct);
    }

    public async Task<EmployeeResponse> ChangeStatusAsync(int id, ChangeEmployeeStatusRequest request, CancellationToken ct)
    {
        await statusValidator.ValidateAndThrowAsync(request, ct);

        var employee = await db.Employees.FirstOrDefaultAsync(e => e.Id == id, ct)
            ?? throw new NotFoundException("Employee", id);

        var status = Enum.Parse<EmployeeStatus>(request.Status, ignoreCase: true);

        // A `switch` statement picks the entity method for the new status. The
        // entity enforces the rules (e.g. a terminated employee can't come back).
        switch (status)
        {
            case EmployeeStatus.Active:
                employee.MarkActive();
                break;
            case EmployeeStatus.OnLeave:
                employee.MarkOnLeave();
                break;
            case EmployeeStatus.Terminated:
                // `!.Value` is safe: the validator requires a date for Terminated.
                employee.Terminate(request.TerminationDate!.Value);
                break;
        }

        db.SetOriginalRowVersion(employee, request.RowVersion);
        await db.SaveChangesAsync(ct);

        return await GetByIdAsync(id, ct);
    }

    // ---- Helpers ------------------------------------------------------------

    // Maps the allow-listed sortBy name to the real column. A `switch`
    // expression returns a value; `_` is the "anything else" case (the
    // validator already rejected unknown names, so it's just a fallback).
    private static IQueryable<Employee> ApplySorting(IQueryable<Employee> employees, string sortBy, string sortDirection)
    {
        var descending = sortDirection.Equals("desc", StringComparison.OrdinalIgnoreCase);

        IOrderedQueryable<Employee> ordered = sortBy.ToLowerInvariant() switch
        {
            "firstname" => descending ? employees.OrderByDescending(e => e.FirstName) : employees.OrderBy(e => e.FirstName),
            "employeenumber" => descending ? employees.OrderByDescending(e => e.EmployeeNumber) : employees.OrderBy(e => e.EmployeeNumber),
            "hiredate" => descending ? employees.OrderByDescending(e => e.HireDate) : employees.OrderBy(e => e.HireDate),
            "createdat" => descending ? employees.OrderByDescending(e => e.CreatedAtUtc) : employees.OrderBy(e => e.CreatedAtUtc),
            _ => descending ? employees.OrderByDescending(e => e.LastName) : employees.OrderBy(e => e.LastName),
        };

        // Always finish with a unique column (Id) as a tie-breaker. Without
        // it, rows with equal names could appear on two pages or on none,
        // because SQL doesn't guarantee an order for ties.
        return ordered.ThenBy(e => e.Id);
    }

    private async Task EnsureEmailIsFreeAsync(string email, int? exceptEmployeeId, CancellationToken ct)
    {
        var taken = await db.Employees.AnyAsync(
            e => e.Email == email && (exceptEmployeeId == null || e.Id != exceptEmployeeId), ct);

        if (taken)
            throw new ConflictException($"Email '{email}' is already used by another employee.");
    }

    private async Task EnsureDepartmentCanTakeEmployeesAsync(int departmentId, CancellationToken ct)
    {
        // Select just the IsActive flag. `bool?` is null when no department
        // with that id exists.
        var isActive = await db.Departments
            .Where(d => d.Id == departmentId)
            .Select(d => (bool?)d.IsActive)
            .FirstOrDefaultAsync(ct);

        if (isActive is null)
            throw new NotFoundException("Department", departmentId);

        if (isActive == false)
            throw new ConflictException("Employees cannot be added to an inactive department.");
    }

    // Rules for a manager: must exist, must not be terminated, and must not
    // create a loop (A manages B, B manages A). We walk UP the chain from the
    // proposed manager; if we meet the employee themselves, it's a loop.
    private async Task EnsureValidManagerAsync(int managerId, int? employeeId, CancellationToken ct)
    {
        if (employeeId is not null && managerId == employeeId)
            throw new ConflictException("An employee cannot be their own manager.");

        var manager = await db.Employees
            .Where(e => e.Id == managerId)
            .Select(e => new { e.Status, e.ManagerId })
            .FirstOrDefaultAsync(ct)
            ?? throw new NotFoundException("Manager", managerId);

        if (manager.Status == EmployeeStatus.Terminated)
            throw new ConflictException("A terminated employee cannot be assigned as a manager.");

        // A new employee (no id yet) can't be anyone's manager, so no loop.
        if (employeeId is null)
            return;

        var current = manager.ManagerId;
        // The depth limit is a safety net against bad data already in the DB.
        for (var depth = 0; current is not null && depth < 100; depth++)
        {
            if (current == employeeId)
                throw new ConflictException("This manager assignment would create a reporting loop.");

            current = await db.Employees
                .Where(e => e.Id == current)
                .Select(e => e.ManagerId)
                .FirstOrDefaultAsync(ct);
        }
    }
}
