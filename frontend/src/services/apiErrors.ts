// =============================================================================
// apiErrors.ts: turn an RTK Query error into something a user can read
// =============================================================================
//
// An RTK Query error can be one of two shapes:
//
//   1. FetchBaseQueryError: the request went out but failed.
//        { status: 404, data: { title, detail, ... } }  backend replied with an error
//        { status: "FETCH_ERROR", error: "..." }         network down / CORS / API not running
//        { status: "PARSING_ERROR", ... }                 response wasn't valid JSON
//        { status: "TIMEOUT_ERROR", ... }
//
//   2. SerializedError: an exception was thrown in our own code.
//        { message: "..." }
//
// The parameters are typed `unknown` because errors caught with
// try/catch (e.g. after `.unwrap()`) are `unknown` in TypeScript. These
// helpers check the shape at runtime ("type narrowing") before using it.
// -----------------------------------------------------------------------------

import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";

import type { ProblemDetails } from "@/types/api";

// A "type guard": if it returns true, TypeScript knows `error` is a
// FetchBaseQueryError inside the calling `if` block.
function isFetchBaseQueryError(error: unknown): error is FetchBaseQueryError {
  return typeof error === "object" && error !== null && "status" in error;
}

// One readable message for any error (shown in an alert banner).
export function getErrorMessage(error: unknown): string {
  if (!error) return "";

  if (isFetchBaseQueryError(error)) {
    // Network failure: the browser couldn't reach the API at all.
    if (error.status === "FETCH_ERROR") {
      return "Cannot reach the server. Check that the backend API is running.";
    }

    if (error.status === "TIMEOUT_ERROR") {
      return "The server took too long to respond. Please try again.";
    }

    // The backend replied with Problem Details: prefer its `detail`.
    const problem = error.data as ProblemDetails | undefined;
    if (problem?.detail) return problem.detail;

    // Auth-related statuses without a specific message get friendly text
    // instead of the generic titles "Forbidden" / "Too Many Requests".
    if (error.status === 403) return "You don't have permission to do this.";
    if (error.status === 429) return "Too many attempts. Please wait a minute and try again.";
    // 401 from the login endpoint carries a title such as "Invalid email or
    // password."; any other 401 means the session is gone.
    if (error.status === 401 && (!problem?.title || problem.title === "Unauthorized")) {
      return "Your session has expired. Please sign in again.";
    }

    if (problem?.title) return problem.title;

    return `Request failed (${String(error.status)}).`;
  }

  if (typeof error === "object" && error !== null && "message" in error && typeof error.message === "string") {
    return error.message;
  }

  return "Something went wrong.";
}

// For 400 validation errors: the backend's per-field messages, keyed by the
// field name in camelCase so they match our form field names.
//
//   backend: { errors: { "Email": ["'Email' is not a valid email address."] } }
//   result:  { email: "'Email' is not a valid email address." }
//
// Returns null if the error isn't a validation error.
export function getFieldErrors(error: unknown): Record<string, string> | null {
  if (!isFetchBaseQueryError(error) || error.status !== 400) return null;

  const problem = error.data as ProblemDetails | undefined;
  if (!problem?.errors) return null;

  return Object.fromEntries(
    Object.entries(problem.errors).map(([field, messages]) => [
      // "Email" -> "email", "DepartmentId" -> "departmentId"
      field.charAt(0).toLowerCase() + field.slice(1),
      // Show the first message per field; that's enough for a form.
      messages[0] ?? "Invalid value.",
    ]),
  );
}
