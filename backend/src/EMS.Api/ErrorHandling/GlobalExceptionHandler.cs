// =============================================================================
// GlobalExceptionHandler.cs: turns exceptions into consistent JSON errors
// =============================================================================
//
// Any exception thrown while handling a request ends up here (registered in
// Program.cs with AddExceptionHandler + UseExceptionHandler). We translate it
// into an RFC 9457 "Problem Details" response, the standard JSON error format:
//
//   {
//     "type": "https://tools.ietf.org/html/rfc9110#section-15.5.10",
//     "title": "Conflict",
//     "status": 409,
//     "detail": "Employee number 'EMP-0001' is already in use.",
//     "traceId": "00-4bf9..."
//   }
//
// Validation errors (400) also include an "errors" object listing every
// invalid field, which the frontend can show next to each form input.
//
// Why one central handler: controllers and services stay free of try/catch,
// and every endpoint returns errors in exactly the same shape.
// -----------------------------------------------------------------------------

using EMS.Application.Common;
using EMS.Domain.Common;
using FluentValidation;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace EMS.Api.ErrorHandling;

internal sealed class GlobalExceptionHandler(
    IProblemDetailsService problemDetailsService,
    ILogger<GlobalExceptionHandler> logger) : IExceptionHandler
{
    // SQL Server error numbers we recognise.
    private const int SqlUniqueIndexViolation = 2601;
    private const int SqlUniqueConstraintViolation = 2627;
    private const int SqlForeignKeyOrCheckViolation = 547;

    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        // A `switch` expression with type patterns: the FIRST matching case
        // wins, so more specific types must come before more general ones
        // (DbUpdateConcurrencyException inherits from DbUpdateException).
        ProblemDetails problem = exception switch
        {
            // 400: request fields failed FluentValidation rules.
            ValidationException validation => new ValidationProblemDetails(
                validation.Errors
                    .GroupBy(error => error.PropertyName)
                    .ToDictionary(group => group.Key, group => group.Select(e => e.ErrorMessage).ToArray()))
            {
                Status = StatusCodes.Status400BadRequest,
                Title = "One or more validation errors occurred.",
            },

            // 400: a domain business rule was broken.
            DomainException domain => Problem(StatusCodes.Status400BadRequest, "Business rule violated.", domain.Message),

            // 404: the requested row doesn't exist.
            NotFoundException notFound => Problem(StatusCodes.Status404NotFound, "Resource not found.", notFound.Message),

            // 409: duplicate value, invalid state change, etc.
            ConflictException conflict => Problem(StatusCodes.Status409Conflict, "Conflict.", conflict.Message),

            // 409: someone else saved this record after the client loaded it.
            DbUpdateConcurrencyException => Problem(
                StatusCodes.Status409Conflict,
                "Concurrency conflict.",
                "The record was changed by someone else after you loaded it. Reload it and try again."),

            // 409: a database constraint caught something our checks missed,
            // e.g. two requests inserting the same code at the same moment.
            DbUpdateException { InnerException: SqlException sql }
                when sql.Number is SqlUniqueIndexViolation or SqlUniqueConstraintViolation
                => Problem(StatusCodes.Status409Conflict, "Duplicate value.", "A record with the same unique value already exists."),

            DbUpdateException { InnerException: SqlException { Number: SqlForeignKeyOrCheckViolation } }
                => Problem(StatusCodes.Status409Conflict, "Constraint violated.", "The change conflicts with related data."),

            // 500: anything unexpected is a bug. We do NOT send exception.Message
            // to the client, because it could reveal internal details.
            _ => Problem(StatusCodes.Status500InternalServerError, "An unexpected error occurred.", null),
        };

        // Log unexpected errors with the full exception (stack trace) for
        // developers. Expected 4xx errors are normal traffic, so no error log.
        if (problem.Status == StatusCodes.Status500InternalServerError)
            logger.LogError(exception, "Unhandled exception for {Method} {Path}", httpContext.Request.Method, httpContext.Request.Path);

        httpContext.Response.StatusCode = problem.Status!.Value;

        // IProblemDetailsService writes the JSON and adds standard fields such
        // as "type" and "traceId" (configured by AddProblemDetails()).
        return await problemDetailsService.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = httpContext,
            ProblemDetails = problem,
            Exception = exception,
        });
    }

    private static ProblemDetails Problem(int status, string title, string? detail) =>
        new() { Status = status, Title = title, Detail = detail };
}
