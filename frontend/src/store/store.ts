// =============================================================================
// store.ts: creates the Redux store (the single object that holds app state)
// =============================================================================
//
// Redux keeps all shared client state in ONE place called the "store".
// Components read from it with selectors and change it by dispatching
// "actions". Reducers (inside slices) decide how state changes.
//
// Why a `makeStore()` function instead of one global `const store`?
// In Next.js, code can also run on the server. A module-level store would be
// SHARED between every user's request on the server, which leaks data between
// users. A function lets us create a fresh store per request on the server and
// exactly one store per browser tab on the client (see StoreProvider.tsx).
// -----------------------------------------------------------------------------

import { configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";

import { api } from "@/services/api";
import uiReducer from "./slices/uiSlice";

export const makeStore = () => {
  // configureStore() is Redux Toolkit's helper. Compared with plain Redux it:
  //  - combines our reducers,
  //  - adds useful middleware (thunks, plus dev-time checks that catch
  //    accidental state mutation and non-serializable values),
  //  - turns on Redux DevTools browser extension support automatically.
  const store = configureStore({
    // `reducer` maps each top-level state key to the reducer that owns it.
    // The resulting state shape is: { ui: {...}, api: {...} }
    reducer: {
      // Our own client/UI state (sidebar open, etc.).
      ui: uiReducer,

      // RTK Query keeps its cache (fetched server data, loading flags) under
      // its own key. `api.reducerPath` is "api" (set in services/api.ts).
      [api.reducerPath]: api.reducer,
    },

    // RTK Query needs its middleware to handle caching, cache expiry,
    // refetching and request de-duplication. We APPEND it to the defaults
    // instead of replacing them, so the built-in safety checks stay on.
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(api.middleware),
  });

  // Lets RTK Query refetch data automatically when the browser tab regains
  // focus or the network reconnects (only for endpoints that opt in with
  // `refetchOnFocus` / `refetchOnReconnect`). Safe to call on the server:
  // it does nothing there.
  setupListeners(store.dispatch);

  return store;
};

// -----------------------------------------------------------------------------
// TypeScript types derived from the store. We never write these by hand;
// they are inferred, so they update automatically when we add a slice.
// -----------------------------------------------------------------------------

// The type of the store object itself.
export type AppStore = ReturnType<typeof makeStore>;

// The type of the whole state tree, e.g. RootState["ui"]["isSidebarOpen"].
export type RootState = ReturnType<AppStore["getState"]>;

// The type of `dispatch`, which knows about thunks and RTK Query actions.
export type AppDispatch = AppStore["dispatch"];
