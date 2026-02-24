import { useState, useEffect, useCallback } from 'react';

/**
 * Like useState but persists to sessionStorage.
 * Falls back to defaultValue if nothing stored or parse fails.
 */
export function useSessionState<T>(
  key: string,
  defaultValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(() => {
    try {
      const stored = sessionStorage.getItem(key);
      return stored !== null ? (JSON.parse(stored) as T) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(key, JSON.stringify(state));
    } catch {
      // quota exceeded — ignore
    }
  }, [key, state]);

  return [state, setState];
}

/**
 * Like useState<Set<T>> but persists to sessionStorage as JSON array.
 */
export function useSessionSet<T>(
  key: string,
  defaultItems: T[]
): [Set<T>, (updater: Set<T> | ((prev: Set<T>) => Set<T>)) => void] {
  const [set, setSetRaw] = useState<Set<T>>(() => {
    try {
      const stored = sessionStorage.getItem(key);
      if (stored !== null) {
        const arr = JSON.parse(stored) as T[];
        return new Set(arr);
      }
    } catch {
      // ignore
    }
    return new Set(defaultItems);
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(key, JSON.stringify([...set]));
    } catch {
      // quota exceeded — ignore
    }
  }, [key, set]);

  const setSet = useCallback(
    (updater: Set<T> | ((prev: Set<T>) => Set<T>)) => {
      setSetRaw((prev) =>
        typeof updater === 'function'
          ? (updater as (prev: Set<T>) => Set<T>)(prev)
          : updater
      );
    },
    []
  );

  return [set, setSet];
}
