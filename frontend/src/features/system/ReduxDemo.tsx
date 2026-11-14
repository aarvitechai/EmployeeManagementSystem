// =============================================================================
// ReduxDemo.tsx: small working example of BOTH kinds of Redux usage
// =============================================================================
//
//  1. A Redux SLICE for client UI state  -> useAppSelector + useAppDispatch
//  2. RTK QUERY for backend data          -> useGetHealthQuery
//
// Use it as a reference when building real features, then delete it.
// -----------------------------------------------------------------------------

// Redux hooks only work in Client Components (see StoreProvider.tsx).
"use client";

import { useGetHealthQuery } from "@/services/api";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { toggleSidebar } from "@/store/slices/uiSlice";

export default function ReduxDemo() {
  // ---- 1. Reading and changing slice state --------------------------------

  // Select ONE value from the store. This component re-renders only when
  // `isSidebarOpen` changes, not on every store update.
  const isSidebarOpen = useAppSelector((state) => state.ui.isSidebarOpen);

  // `dispatch` sends actions to the store.
  const dispatch = useAppDispatch();

  // ---- 2. Fetching backend data with RTK Query ----------------------------

  // Calling the hook starts the request automatically when the component
  // mounts. It returns the data plus status flags:
  //   data      - the response (here: "Healthy")
  //   isLoading - true during the FIRST load
  //   isError   - true if the request failed (e.g. backend not running)
  //   refetch   - function to request fresh data manually
  const { data, isLoading, isError, refetch } = useGetHealthQuery();

  // Turn the status flags into a message to show.
  let healthText: string;
  if (isLoading) healthText = "Checking...";
  else if (isError) healthText = "Backend unreachable. Is the API running?";
  else healthText = data ?? "Unknown";

  return (
    <section className="w-full rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
      <h2 className="mb-4 text-xl font-semibold">Redux Toolkit demo</h2>

      {/* Slice example: clicking dispatches the `toggleSidebar` action,
          the reducer flips the boolean, and this text updates. */}
      <div className="mb-4 flex items-center gap-4">
        <span>
          Sidebar (ui slice): <strong>{isSidebarOpen ? "open" : "closed"}</strong>
        </span>
        <button
          type="button"
          onClick={() => dispatch(toggleSidebar())}
          className="rounded bg-zinc-900 px-3 py-1 text-white dark:bg-zinc-100 dark:text-black"
        >
          Toggle
        </button>
      </div>

      {/* RTK Query example: shows the result of GET /health on the backend. */}
      <div className="flex items-center gap-4">
        <span>
          Backend health (RTK Query): <strong>{healthText}</strong>
        </span>
        <button
          type="button"
          onClick={() => refetch()}
          className="rounded border border-zinc-400 px-3 py-1"
        >
          Refetch
        </button>
      </div>
    </section>
  );
}
