// =============================================================================
// EmployeesController.cs: HTTP endpoints for employees
// =============================================================================
//
//   GET    /api/v1/employees                search / filter / sort / paginate
//   GET    /api/v1/employees/{id}           one employee
//   POST   /api/v1/employees                create  -> 201 Created
//   PUT    /api/v1/employees/{id}           update details, department, manager
//   PATCH  /api/v1/employees/{id}/status    Active / OnLeave / Terminated
//   DELETE /api/v1/employees/{id}?rowVersion=...   soft delete -> 204
//
// See DepartmentsController.cs for explanations of the attributes used here.
//
// Authorization: reading needs ViewOrganization (admin, HR, manager); every
// change needs ManageOrganization (admin, HR).
// TODO (later): managers should only see their OWN team. That needs the
// login account linked to an Employee record (resource-based authorization).
// -----------------------------------------------------------------------------

using EMS.Api.Security;
using EMS.Application.Employees;
using EMS.Contracts.Common;
using EMS.Contracts.Employees;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EMS.Api.Controllers;

[ApiController]
[Route("api/v1/employees")]
[Produces("application/json")]
[Authorize(Policy = Policies.ViewOrganization)]
public sealed class EmployeesController(IEmployeeService employees) : ControllerBase
{
    // GET /api/v1/employees?page=1&pageSize=20&search=asha&status=Active&sortBy=hireDate&sortDirection=desc
    // [FromQuery] on a class binds EACH property from a query-string value.
    [HttpGet]
    [ProducesResponseType<PagedResponse<EmployeeResponse>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<PagedResponse<EmployeeResponse>>> GetPaged(
        [FromQuery] EmployeeListQuery query,
        CancellationToken ct)
    {
        return Ok(await employees.GetPagedAsync(query, ct));
    }

    [HttpGet("{id:int}", Name = nameof(GetEmployeeById))]
    [ProducesResponseType<EmployeeResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<EmployeeResponse>> GetEmployeeById(int id, CancellationToken ct)
    {
        return Ok(await employees.GetByIdAsync(id, ct));
    }

    [HttpPost]
    [Authorize(Policy = Policies.ManageOrganization)]
    [ProducesResponseType<EmployeeResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<EmployeeResponse>> Create(CreateEmployeeRequest request, CancellationToken ct)
    {
        var created = await employees.CreateAsync(request, ct);
        return CreatedAtRoute(nameof(GetEmployeeById), new { id = created.Id }, created);
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = Policies.ManageOrganization)]
    [ProducesResponseType<EmployeeResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<EmployeeResponse>> Update(int id, UpdateEmployeeRequest request, CancellationToken ct)
    {
        return Ok(await employees.UpdateAsync(id, request, ct));
    }

    // PATCH = a PARTIAL update of one aspect of the resource. Status changes
    // get their own endpoint because they follow lifecycle rules and, later,
    // will need different permissions than editing contact details.
    [HttpPatch("{id:int}/status")]
    [Authorize(Policy = Policies.ManageOrganization)]
    [ProducesResponseType<EmployeeResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<EmployeeResponse>> ChangeStatus(int id, ChangeEmployeeStatusRequest request, CancellationToken ct)
    {
        return Ok(await employees.ChangeStatusAsync(id, request, ct));
    }

    // DELETE /api/v1/employees/5?rowVersion=AAAAAAAAB9E%3D
    // Soft delete. The concurrency token is in the query string because
    // DELETE requests have no body (see DepartmentsController.Delete).
    [HttpDelete("{id:int}")]
    [Authorize(Policy = Policies.ManageOrganization)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Delete(int id, [FromQuery] byte[]? rowVersion, CancellationToken ct)
    {
        await employees.DeleteAsync(id, rowVersion, ct);
        return NoContent();
    }
}
