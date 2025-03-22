"use client";

import { useState, useEffect, useCallback, Dispatch, SetStateAction } from 'react';

/**
 * Custom hook to manage state that is synchronized with localStorage.
 * Handles serialization/deserialization of data and provides error handling.
 *
 * @template T - The type of the state value
 * @param {string} key - The key under which the value is stored in localStorage
 * @param {T} defaultValue - The default value to use if the key is not found in localStorage
 * @returns {[T, Dispatch<SetStateAction<T>>, () => void]} A tuple containing:
 * - The current state value
 * - A function to update the state
 * - A function to reset the state to its default value
 *
 * @example
 * const [theme, setTheme, resetTheme] = useLocalStorageState('app-theme', 'light');
 *
 * // Update theme
 * setTheme('dark');
 *
 * // Reset to default value
 * resetTheme();
 */
export const useLocalStorageState = <T,>(key: string, defaultValue: T): [T, Dispatch<SetStateAction<T>>, () => void] => {
  // Initialize state with value from localStorage or default
  const [state, setState] = useState<T>(() => {
    if (typeof window === 'undefined') return defaultValue;

    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : defaultValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return defaultValue;
    }
  });

  // Update localStorage when state changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      console.error(`Error writing to localStorage key "${key}":`, error);
    }
  }, [key, state]);

  // Reset state to default value
  const reset = useCallback(() => {
    setState(defaultValue);
  }, [defaultValue]);

  return [state, setState, reset];
};
