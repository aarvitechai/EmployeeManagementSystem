// =============================================================================
// DepartmentService.cs: the department "use cases" (list, get, create, update)
// =============================================================================
//
// The Application layer sits between the API and the Domain:
//
//   Controller (HTTP)  ->  DepartmentService  ->  Department entity + database
//
// The controller only translates HTTP <-> method calls. The service does the
// real work: validate input, check rules that need the database (is this
// code already used?), call the entity's methods, save, and return a DTO.
// Keeping this out of controllers means the same logic could be reused by a
// background job or a different UI later.
// -----------------------------------------------------------------------------

using System.Linq.Expressions;
using EMS.Application.Abstractions;
using EMS.Application.Common;
using EMS.Contracts.Departments;
using EMS.Domain.Departments;
using FluentValidation;
using FluentValidation.Results;
using Microsoft.EntityFrameworkCore;

namespace EMS.Application.Departments;

// The interface is what controllers depend on (registered in DI).
//
// DeleteAsync is a SOFT delete: it sets IsDeleted = true (see Department.cs)
// instead of removing the row.
public interface IDepartmentService
{
    Task<IReadOnlyList<DepartmentResponse>> GetAllAsync(bool includeInactive, CancellationToken ct);
    Task<DepartmentResponse> GetByIdAsync(int id, CancellationToken ct);
    Task<DepartmentResponse> CreateAsync(CreateDepartmentRequest request, CancellationToken ct);
    Task<DepartmentResponse> UpdateAsync(int id, UpdateDepartmentRequest request, CancellationToken ct);
    Task DeleteAsync(int id, byte[]? rowVersion, CancellationToken ct);
}

// `internal`: other projects use the interface, never this class directly.
// The constructor parameters are injected by DI (a "primary constructor").
internal sealed class DepartmentService(
    IEmsDbContext db,
    IValidator<CreateDepartmentRequest> createValidator,
    IValidator<UpdateDepartmentRequest> updateValidator) : IDepartmentService
{
    // A PROJECTION: describes how to turn a Department row into a
    // DepartmentResponse. Because it is an Expression (not a normal lambda),
    // EF Core can translate it to SQL and SELECT only the needed columns.
    // `d.Employees.Count(...)` becomes a SQL COUNT sub-query, so employees are
    // never loaded into memory just to be counted.
    private static readonly Expression<Func<Department, DepartmentResponse>> ToResponse =
        d => new DepartmentResponse(
            d.Id,
            d.Code,
            d.Name,
            d.Description,
            d.IsActive,
            // Only LIVE employees count; soft-deleted ones are ignored.
            d.Employees.Count(e => !e.IsDeleted),
            d.CreatedAtUtc,
            d.UpdatedAtUtc,
            d.RowVersion);

    // Every READ goes through this: soft-deleted departments (IsDeleted = 1)
    // are treated as if they don't exist. `includeInactive` never brings them
    // back. Inactive and deleted are different things.
    //
    // Why not an EF Core global query filter (HasQueryFilter)? Employee has a
    // REQUIRED link to Department, and a global filter would make EF Core
    // silently drop employees whose department is filtered out from employee
    // queries. Filtering explicitly here keeps that behaviour obvious.
    private IQueryable<Department> LiveDepartments => db.Departments.Where(d => !d.IsDeleted);

    public async Task<IReadOnlyList<DepartmentResponse>> GetAllAsync(bool includeInactive, CancellationToken ct)
    {
        // IQueryable = a query that is BUILT step by step and only runs
        // against SQL Server when ToListAsync() is called.
        var query = LiveDepartments;

        if (!includeInactive)
            query = query.Where(d => d.IsActive);

        return await query
            .OrderBy(d => d.Name)
            .Select(ToResponse)
            .ToListAsync(ct);
    }

    public async Task<DepartmentResponse> GetByIdAsync(int id, CancellationToken ct)
    {
        return await LiveDepartments
            .Where(d => d.Id == id)
            .Select(ToResponse)
            .FirstOrDefaultAsync(ct)
            ?? throw new NotFoundException("Department", id);
    }

    public async Task<DepartmentResponse> CreateAsync(CreateDepartmentRequest request, CancellationToken ct)
    {
        // Throws FluentValidation.ValidationException if any rule fails,
        // which the API turns into a 400 response listing the errors.
        await createValidator.ValidateAndThrowAsync(request, ct);

        // Same normalisation the entity applies, so the duplicate check
        // compares like with like (" eng " vs "ENG").
        var code = request.Code.Trim().ToUpperInvariant();
        var name = request.Name.Trim();

        // Friendly duplicate checks. The UNIQUE indexes in SQL Server still
        // protect us if two requests race past these checks at the same time.
        // Only LIVE departments count: a deleted department's code may be
        // reused (matches the filtered unique index in DepartmentConfiguration).
        if (await LiveDepartments.AnyAsync(d => d.Code == code, ct))
            throw new ConflictException($"A department with code '{code}' already exists.");

        if (await LiveDepartments.AnyAsync(d => d.Name == name, ct))
            throw new ConflictException($"A department named '{name}' already exists.");

        var department = new Department(code, name, request.Description);

        // Add() only marks it as "to be inserted"; SaveChangesAsync runs the
        // INSERT and fills in the generated Id.
        db.Departments.Add(department);
        await db.SaveChangesAsync(ct);

        return await GetByIdAsync(department.Id, ct);
    }

    public async Task<DepartmentResponse> UpdateAsync(int id, UpdateDepartmentRequest request, CancellationToken ct)
    {
        await updateValidator.ValidateAndThrowAsync(request, ct);

        // Load the entity WITH change tracking, so EF Core notices the changes
        // made by the method calls below and writes them on save.
        var department = await LiveDepartments.FirstOrDefaultAsync(d => d.Id == id, ct)
            ?? throw new NotFoundException("Department", id);

        var name = request.Name.Trim();
        if (await LiveDepartments.AnyAsync(d => d.Id != id && d.Name == name, ct))
            throw new ConflictException($"A department named '{name}' already exists.");

        // Change state ONLY through the entity's methods (its business rules).
        department.Rename(name, request.Description);
        if (request.IsActive) department.Activate();
        else department.Deactivate();

        // Optimistic concurrency: see Common/ConcurrencyExtensions.cs.
        db.SetOriginalRowVersion(department, request.RowVersion);

        await db.SaveChangesAsync(ct);

        return await GetByIdAsync(id, ct);
    }

    public async Task DeleteAsync(int id, byte[]? rowVersion, CancellationToken ct)
    {
        // Deleting what you saw: the client must send the version it loaded,
        // so it can't delete a department someone else just changed.
        // There's no request body/validator class for a DELETE, so we raise
        // the same ValidationException a validator would (-> 400 response).
        if (rowVersion is null || rowVersion.Length == 0)
            throw new ValidationException([
                new ValidationFailure("RowVersion", "RowVersion is required. Send back the value from the last GET."),
            ]);

        // Already-deleted departments are "not found", so deleting twice -> 404.
        var department = await LiveDepartments.FirstOrDefaultAsync(d => d.Id == id, ct)
            ?? throw new NotFoundException("Department", id);

        // Count EVERY employee, including terminated ones: their records still
        // point at this department, so it must stay visible for them.
        var hasEmployees = await db.Employees.AnyAsync(e => e.DepartmentId == id && !e.IsDeleted, ct);
        if (hasEmployees)
            throw new ConflictException(
                "This department still has employees (including terminated ones). Move them to another department first.");

        // The entity applies the change (and re-checks the rule itself).
        department.MarkDeleted(hasEmployees);

        db.SetOriginalRowVersion(department, rowVersion);

        // An UPDATE (IsDeleted = 1), not a DELETE statement.
        await db.SaveChangesAsync(ct);
    }
}
