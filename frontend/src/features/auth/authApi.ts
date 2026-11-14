// =============================================================================
// authApi.ts: RTK Query endpoints for /api/v1/auth (login, logout, me)
// =============================================================================
//
// The login cookie is HttpOnly, so JavaScript can't look inside it. The
// frontend learns "who is logged in?" by calling GET /auth/me:
//   200 -> { email, roles }   logged in
//   401 -> not logged in (or the session expired)
// That one query (getCurrentUser) is the single source of truth for the UI.
// -----------------------------------------------------------------------------

import { api, API_V1 } from "@/services/api";
import type { CurrentUser, LoginRequest } from "@/types/api";

export const authApi = api.injectEndpoints({
  endpoints: (build) => ({
    // GET /api/v1/auth/me
    getCurrentUser: build.query<CurrentUser, void>({
      query: () => `${API_V1}/auth/me`,
      providesTags: ["Auth"],
    }),

    // POST /api/v1/auth/login. On success the API sets the cookie.
    login: build.mutation<CurrentUser, LoginRequest>({
      query: (body) => ({ url: `${API_V1}/auth/login`, method: "POST", body }),
      // onQueryStarted runs when the mutation starts; awaiting `queryFulfilled`
      // waits for its result (it throws if the request failed).
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          // A new user is logged in: throw away EVERYTHING cached for the
          // previous one (lists, the old 401 from /me...). Components then
          // refetch what they need as the new user.
          dispatch(api.util.resetApiState());
        } catch {
          // Failed login: nothing to reset. The form shows the error.
        }
      },
    }),

    // POST /api/v1/auth/logout. The API deletes the cookie.
    logout: build.mutation<void, void>({
      query: () => ({ url: `${API_V1}/auth/logout`, method: "POST" }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
        } finally {
          // Even if the request failed, clear cached data so nothing from the
          // old session stays visible in this browser tab.
          dispatch(api.util.resetApiState());
        }
      },
    }),
  }),
});

export const { useGetCurrentUserQuery, useLoginMutation, useLogoutMutation } = authApi;
