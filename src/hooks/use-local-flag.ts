import { useSyncExternalStore } from "react";

const listeners = new Set<() => void>();
// What was set in this tab. It answers first, so a browser that refuses
// storage (private mode, blocked site data) still remembers until a reload.
const memory = new Map<string, boolean>();

// A yes or no kept in this browser's localStorage: a preference that belongs
// to the device, not to the account. False until set.
export function readLocalFlag(key: string): boolean {
  const known = memory.get(key);

  if (known !== undefined) {
    return known;
  }

  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function writeLocalFlag(key: string, value: boolean) {
  memory.set(key, value);

  try {
    if (value) {
      window.localStorage.setItem(key, "1");
    } else {
      window.localStorage.removeItem(key);
    }
  } catch {
    // Kept in memory only.
  }

  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

// False on the server and while hydrating, whatever is stored.
export function useLocalFlag(key: string) {
  const value = useSyncExternalStore(
    subscribe,
    () => readLocalFlag(key),
    () => false,
  );

  return [value, (next: boolean) => writeLocalFlag(key, next)] as const;
}
