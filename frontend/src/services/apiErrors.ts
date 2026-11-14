// =============================================================================
// apiErrors.ts: turn an RTK Query error into a message a user can read
// =============================================================================
//
// An RTK Query hook's `error` can be one of two shapes:
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
// This helper checks which shape it is (TypeScript "type narrowing") and
// returns one readable string.
// -----------------------------------------------------------------------------

import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import type { SerializedError } from "@reduxjs/toolkit";

import type { ProblemDetails } from "@/types/api";

// A "type guard": if it returns true, TypeScript knows `error` is a
// FetchBaseQueryError inside the calling `if` block.
function isFetchBaseQueryError(error: unknown): error is FetchBaseQueryError {
  return typeof error === "object" && error !== null && "status" in error;
}

export function getErrorMessage(error: FetchBaseQueryError | SerializedError | undefined): string {
  if (!error) return "";

  if (isFetchBaseQueryError(error)) {
    // Network failure: the browser couldn't reach the API at all.
    if (error.status === "FETCH_ERROR") {
      return "Cannot reach the server. Check that the backend API is running.";
    }

    if (error.status === "TIMEOUT_ERROR") {
      return "The server took too long to respond. Please try again.";
    }

    // The backend replied with Problem Details: prefer its `detail`, then `title`.
    const problem = error.data as ProblemDetails | undefined;
    if (problem?.detail) return problem.detail;
    if (problem?.title) return problem.title;

    return `Request failed (${String(error.status)}).`;
  }

  return error.message ?? "Something went wrong.";
}
