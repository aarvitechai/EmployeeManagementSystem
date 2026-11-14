// =============================================================================
// uiSlice.ts: example "slice" for client-only UI state
// =============================================================================
//
// A slice is one feature's piece of the Redux state, plus the reducers that
// change it. `createSlice` generates the action creators for us.
//
// Project rule (from the design doc): Redux slices are ONLY for genuine
// client/UI state (sidebar open, selected tab, theme...). Data that comes
// from the backend (employees, departments, leave) belongs in RTK Query
// (services/api.ts), NOT in a slice.
// -----------------------------------------------------------------------------

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

// 1) Describe the shape of this slice's state with a TypeScript type.
type UiState = {
  isSidebarOpen: boolean;
};

// 2) The value the state starts with when the app loads.
const initialState: UiState = {
  isSidebarOpen: true,
};

// 3) createSlice bundles name + initial state + reducers together.
const uiSlice = createSlice({
  // `name` prefixes the action types, e.g. "ui/toggleSidebar". You'll see
  // these names in the Redux DevTools browser extension.
  name: "ui",
  initialState,

  // Each reducer is a function (state, action) => update.
  //
  // It looks like we're MUTATING state (`state.x = ...`). In plain Redux that
  // is forbidden, but Redux Toolkit uses the Immer library under the hood:
  // Immer records these "mutations" and produces a new, immutable state
  // object for us. So this style is safe, but only inside createSlice.
  reducers: {
    // No payload needed: just flip the boolean.
    toggleSidebar(state) {
      state.isSidebarOpen = !state.isSidebarOpen;
    },

    // With a payload: `PayloadAction<boolean>` types `action.payload`.
    // Usage: dispatch(setSidebarOpen(false))
    setSidebarOpen(state, action: PayloadAction<boolean>) {
      state.isSidebarOpen = action.payload;
    },
  },
});

// 4) Export the auto-generated action creators so components can dispatch them.
export const { toggleSidebar, setSidebarOpen } = uiSlice.actions;

// 5) Export the reducer so store.ts can register it under the `ui` key.
export default uiSlice.reducer;
