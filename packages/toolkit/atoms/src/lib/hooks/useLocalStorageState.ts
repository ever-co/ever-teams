"use client"
import { useState, useEffect } from 'react';
/**
 * Custom hook to manage state that is synchronized with `localStorage`.
 *
 * @template T - The type of the state value.
 * @param {string} key - The key under which the value is stored in `localStorage`.
 * @param {T} defaultValue - The default value to use if the key is not found in `localStorage`.
 *
 * @returns {[T, React.Dispatch<React.SetStateAction<T>>]} - Returns a stateful value and a function to update it.
 *
 * @example
 * const [calendar, setCalendar] = useLocalStorageState<ChangeCalendar>('calendar-timesheet', 'Calendar');
 *
 * - The state `calendar` will be initialized with the value from `localStorage` if it exists, or 'Calendar' if not.
 * - Any updates to `calendar` will be reflected in `localStorage`.
 */

export const useLocalStorageState = <T,>(key: string, defaultValue: T) => {
  const [state, setState] = useState<T>(() =>
    (typeof window !== 'undefined' && window.localStorage.getItem(key) as T) || defaultValue
  );
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(key, state as any);
    }
  }, [state, key]);

  return [state, setState] as const;
};
