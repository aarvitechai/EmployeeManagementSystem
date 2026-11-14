// =============================================================================
// StoreProvider.tsx: makes the Redux store available to every component
// =============================================================================

// "use client" marks this file as a CLIENT Component. In the Next.js App
// Router, components are SERVER Components by default, and Server Components
// cannot use React context or hooks. Redux's <Provider> is built on React
// context, so it must live in a Client Component.
//
// Note: wrapping the app in this provider does NOT turn every page into a
// client component. Server Components passed in as `children` stay on the
// server; only code that uses Redux hooks needs "use client".
"use client";

import { useState } from "react";
import { Provider } from "react-redux";

import { makeStore } from "./store";

export default function StoreProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Create the store exactly ONCE for this browser tab.
  //
  // `useState(() => makeStore())` uses a "lazy initializer": React calls the
  // function only on the first render and keeps the same store afterwards.
  // Calling makeStore() directly in the component body would create a new,
  // empty store on every re-render and wipe the state.
  const [store] = useState(() => makeStore());

  // <Provider> puts the store into React context, so any component below it
  // can call useAppSelector / useAppDispatch.
  return <Provider store={store}>{children}</Provider>;
}
