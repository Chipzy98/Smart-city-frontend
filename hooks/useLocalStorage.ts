"use client";

import { useSyncExternalStore } from "react";

/**
 * useLocalStorage
 *
 * Reads a localStorage key with full SSR / hydration safety using
 * useSyncExternalStore — the React-recommended API for subscribing to
 * external (non-React) state sources.
 *
 * • No useEffect + setState cascade  → satisfies react-hooks/set-state-in-effect
 * • Server snapshot returns null     → server HTML is stable & predictable
 * • Client snapshot reads live value → correct data after hydration
 * • Subscribes to "storage" events   → UI updates if another tab writes the key
 *
 * Usage:
 *   const raw = useLocalStorage("user");           // string | null
 *   const user = raw ? JSON.parse(raw) : null;
 */
export function useLocalStorage(key: string): string | null {
  return useSyncExternalStore(
    // ── subscribe ────────────────────────────────────────────────────────
    // Called once on mount. React calls the returned cleanup when the
    // component unmounts or key changes.
    (onStoreChange) => {
      const handler = (e: StorageEvent) => {
        if (e.key === key || e.key === null) {
          // e.key === null means localStorage.clear() was called
          onStoreChange();
        }
      };
      window.addEventListener("storage", handler);
      return () => window.removeEventListener("storage", handler);
    },

    // ── getSnapshot (client) ─────────────────────────────────────────────
    // Called on every render on the client. Must return the same reference
    // when the value hasn't changed to avoid infinite re-render loops.
    () => localStorage.getItem(key),

    // ── getServerSnapshot ────────────────────────────────────────────────
    // Called during SSR and the first client render (hydration).
    // Returning null here means the server always renders the same
    // "no data yet" state, eliminating any server/client HTML mismatch.
    () => null,
  );
}