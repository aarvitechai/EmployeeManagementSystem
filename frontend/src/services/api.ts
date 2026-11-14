// =============================================================================
// api.ts: RTK Query base API (how the frontend fetches data from the backend)
// =============================================================================
//
// RTK Query is the data-fetching and caching tool built into Redux Toolkit.
// You describe each backend endpoint once, and it generates React hooks such
// as `useGetHealthQuery()` that handle for you:
//   - sending the request,
//   - loading / error / success flags,
//   - caching the response (two components asking for the same data trigger
//     only ONE request),
//   - refetching when data becomes stale ("tags", see below).
//
// We define ONE base `api` for the whole app. Each feature adds its own
// endpoints with `api.injectEndpoints(...)` in its own folder, e.g.
// src/features/employees/employeesApi.ts. That keeps this file small, and
// all features still share one cache and one Redux reducer.
//
// AUTHENTICATION: the backend logs users in with an HttpOnly COOKIE. Our
// JavaScript never sees or stores a token. We just tell `fetch` to send
// cookies (`credentials: "include"`), and the browser does the rest.
// -----------------------------------------------------------------------------

import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";

import { API_BASE_URL } from "./config";

// Every business endpoint lives under /api/v1 on the backend.
export const API_V1 = "/api/v1";

// fetchBaseQuery is a small wrapper around the browser's `fetch`. Every
// endpoint URL is appended to `baseUrl`. When a request fails, the error
// object it returns is { status: 404, data: <the Problem Details JSON> }
// (see services/apiErrors.ts for turning it into a message).
const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,

  // Send (and accept) cookies on requests to the API. The frontend
  // (localhost:3000) and the API (localhost:5131) are different ORIGINS, so
  // without this the browser would leave the login cookie out.
  credentials: "include",

  // Runs before every request. The backend requires this custom header on
  // every state-changing request as CSRF protection (another website can't
  // add it; see backend Security/CsrfHeaderMiddleware.cs). Sending it on
  // every request keeps things simple.
  prepareHeaders: (headers) => {
    headers.set("X-EMS-CSRF", "1");
    return headers;
  },
});

// A WRAPPER around the base query: same signature, extra behaviour.
// If ANY request comes back 401 ("not logged in", e.g. the session expired),
// we RESET the whole RTK Query cache. That:
//   - removes data loaded during the old session from memory, and
//   - forces the current-user query to run again. It fails with 401, and
//     AuthGuard sends the user to the login page.
// (Just invalidating the "Auth" tag is NOT enough: during a failed refetch
// RTK Query keeps returning the last successful `data`, so the app would
// still think the old user is logged in.)
// Requests to the auth endpoints themselves are skipped, or a 401 from
// /auth/me would trigger itself forever.
const baseQueryWithAuth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  apiContext,
  extraOptions,
) => {
  const result = await rawBaseQuery(args, apiContext, extraOptions);

  const url = typeof args === "string" ? args : args.url;
  if (result.error?.status === 401 && !url.includes(`${API_V1}/auth/`)) {
    apiContext.dispatch(api.util.resetApiState());
  }

  return result;
};

export const api = createApi({
  // The key under which RTK Query stores its cache in the Redux state.
  // store.ts registers `api.reducer` under this same key.
  reducerPath: "api",

  baseQuery: baseQueryWithAuth,

  // "Tags" are labels for cached data. A query PROVIDES a tag ("I fetched
  // the Employee list") and a mutation INVALIDATES it ("I just added an
  // employee"), so RTK Query automatically refetches the stale list.
  // "Auth" labels the current-user query (features/auth/authApi.ts).
  tagTypes: ["Health", "Employee", "Department", "Auth"],

  // Endpoints shared by the whole app. Feature endpoints are injected from
  // their own files.
  endpoints: (build) => ({
    // Calls the backend's GET /health. `build.query<ResultType, ArgType>`:
    // we get back a string and pass no argument (`void`).
    getHealth: build.query<string, void>({
      query: () => ({
        url: "/health",
        // The backend replies with plain text ("Healthy"), not JSON, so we
        // tell fetchBaseQuery to read the body as text.
        responseHandler: "text",
      }),
      providesTags: ["Health"],
    }),
  }),
});

// RTK Query auto-generates a hook for each endpoint, named
// use + <EndpointName> + Query (or Mutation for writes).
export const { useGetHealthQuery } = api;
