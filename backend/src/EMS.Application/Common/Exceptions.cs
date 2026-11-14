// =============================================================================
// Exceptions.cs: application-level errors that map to HTTP status codes
// =============================================================================
//
// Services throw these; the API's GlobalExceptionHandler catches them and
// writes a standard "Problem Details" JSON error response:
//
//   NotFoundException  -> 404 Not Found   (no row with that id)
//   ConflictException  -> 409 Conflict    (duplicate code/email, etc.)
//
// Throwing keeps service code linear: no need to check a result object after
// every call. The HTTP details stay in ONE place (the handler).
// -----------------------------------------------------------------------------

namespace EMS.Application.Common;

// e.g. new NotFoundException("Employee", 42) -> "Employee '42' was not found."
public sealed class NotFoundException(string resource, object key)
    : Exception($"{resource} '{key}' was not found.");

public sealed class ConflictException(string message) : Exception(message);
