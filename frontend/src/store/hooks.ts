// =============================================================================
// hooks.ts: typed versions of the React-Redux hooks
// =============================================================================
//
// react-redux gives us `useDispatch`, `useSelector` and `useStore`, but they
// don't know the shape of OUR store. Using `.withTypes<...>()` once here
// creates pre-typed versions so every component gets autocomplete and type
// errors for free, without repeating `(state: RootState) => ...` everywhere.
//
// RULE: in components, always import these hooks from "@/store/hooks",
// never the plain ones from "react-redux".
// -----------------------------------------------------------------------------

import { useDispatch, useSelector, useStore } from "react-redux";

import type { AppDispatch, AppStore, RootState } from "./store";

// Send an action to the store, e.g. dispatch(toggleSidebar()).
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();

// Read a value from the store. The component re-renders only when the
// selected value changes, e.g. useAppSelector((s) => s.ui.isSidebarOpen).
export const useAppSelector = useSelector.withTypes<RootState>();

// Access the store object itself. Rarely needed; prefer the two hooks above.
export const useAppStore = useStore.withTypes<AppStore>();
