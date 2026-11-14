// =============================================================================
// DepartmentsController.cs: HTTP endpoints for departments
// =============================================================================
//
//   GET    /api/v1/departments              list (active only by default)
//   GET    /api/v1/departments/{id}         one department
//   POST   /api/v1/departments              create  -> 201 Created
//   PUT    /api/v1/departments/{id}         update
//
// A controller is deliberately THIN: it maps HTTP to a service call and the
// result back to an HTTP response. Validation, rules and database work live
// in DepartmentService (EMS.Application). Errors are thrown as exceptions
// and turned into Problem Details by GlobalExceptionHandler.
//
// TODO (Phase 6, authentication): restrict to HR/Admin with [Authorize].
// -----------------------------------------------------------------------------

using EMS.Application.Departments;
using EMS.Contracts.Departments;
using Microsoft.AspNetCore.Mvc;

namespace EMS.Api.Controllers;

// [ApiController] turns on API conveniences: automatic 400 responses for
// malformed JSON, and binding the request body to parameters automatically.
[ApiController]
// The URL prefix for every action in this class. "v1" = API version 1, so a
// future breaking change can live at /api/v2 without breaking old clients.
[Route("api/v1/departments")]
// Documents the response content type for OpenAPI.
[Produces("application/json")]
public sealed class DepartmentsController(IDepartmentService departments) : ControllerBase
{
    // GET /api/v1/departments?includeInactive=true
    // [FromQuery] reads the value from the URL query string.
    // CancellationToken is supplied by ASP.NET Core and is cancelled if the
    // client disconnects, so the database query stops too.
    [HttpGet]
    [ProducesResponseType<IReadOnlyList<DepartmentResponse>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<DepartmentResponse>>> GetAll(
        [FromQuery] bool includeInactive = false,
        CancellationToken ct = default)
    {
        // Ok(...) = HTTP 200 with the object serialised as JSON.
        return Ok(await departments.GetAllAsync(includeInactive, ct));
    }

    // GET /api/v1/departments/5
    // `{id:int}` is a route CONSTRAINT: /departments/abc won't match (404).
    // `Name` lets CreatedAtRoute below build a link to this action.
    [HttpGet("{id:int}", Name = nameof(GetDepartmentById))]
    [ProducesResponseType<DepartmentResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<DepartmentResponse>> GetDepartmentById(int id, CancellationToken ct)
    {
        return Ok(await departments.GetByIdAsync(id, ct));
    }

    // POST /api/v1/departments   body: { "code": "ENG", "name": "Engineering" }
    [HttpPost]
    [ProducesResponseType<DepartmentResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<DepartmentResponse>> Create(CreateDepartmentRequest request, CancellationToken ct)
    {
        var created = await departments.CreateAsync(request, ct);

        // REST convention for creation: HTTP 201 Created, a `Location` header
        // with the new resource's URL (/api/v1/departments/{id}), and the
        // created object in the body.
        return CreatedAtRoute(nameof(GetDepartmentById), new { id = created.Id }, created);
    }

    // PUT /api/v1/departments/5   (PUT = replace the editable fields)
    [HttpPut("{id:int}")]
    [ProducesResponseType<DepartmentResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<DepartmentResponse>> Update(int id, UpdateDepartmentRequest request, CancellationToken ct)
    {
        return Ok(await departments.UpdateAsync(id, request, ct));
    }
}
