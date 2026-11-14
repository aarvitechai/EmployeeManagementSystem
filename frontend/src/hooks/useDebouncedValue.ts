// =============================================================================
// useDebouncedValue.ts: a custom React hook that "waits for the user to stop"
// =============================================================================
//
// Problem: if the search box sent a request on EVERY keystroke, typing
// "verma" would fire 5 requests ("v", "ve", "ver"...).
//
// Solution, "debouncing": only pass the value on after it has stayed the same
// for `delayMs` milliseconds. Typing quickly keeps restarting the timer, so
// only the final value ("verma") triggers a request.
//
// A custom hook is just a function whose name starts with `use` and that
// calls other hooks. It lets several components reuse the same stateful logic.
// -----------------------------------------------------------------------------

import { useEffect, useState } from "react";

// <T> = generic: works for strings, numbers, anything.
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    // Schedule the update for later...
    const timer = setTimeout(() => setDebounced(value), delayMs);

    // ...and CANCEL it if `value` changes again before the timer fires.
    // React runs this "cleanup" function before re-running the effect.
    return () => clearTimeout(timer);
  }, [value, delayMs]); // re-run the effect only when these change

  return debounced;
}
