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
// -----------------------------------------------------------------------------

import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

import { API_BASE_URL } from "./config";

// Every business endpoint lives under /api/v1 on the backend.
export const API_V1 = "/api/v1";

export const api = createApi({
  // The key under which RTK Query stores its cache in the Redux state.
  // store.ts registers `api.reducer` under this same key.
  reducerPath: "api",

  // fetchBaseQuery is a small wrapper around the browser's `fetch`. Every
  // endpoint URL is appended to `baseUrl`. When a request fails, the error
  // object it returns is { status: 404, data: <the Problem Details JSON> }
  // (see services/apiErrors.ts for turning it into a message).
  baseQuery: fetchBaseQuery({
    baseUrl: API_BASE_URL,

    // Later, when authentication is added, this is where we attach the
    // auth token to every request, e.g.:
    // prepareHeaders: (headers) => {
    //   headers.set("Authorization", `Bearer ${token}`);
    //   return headers;
    // },
  }),

  // "Tags" are labels for cached data. A query PROVIDES a tag ("I fetched
  // the Employee list") and a mutation INVALIDATES it ("I just added an
  // employee"), so RTK Query automatically refetches the stale list.
  // Add a tag name here for each kind of backend resource.
  tagTypes: ["Health", "Employee", "Department"],

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
