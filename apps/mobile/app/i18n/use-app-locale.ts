import { useSyncExternalStore } from 'react';
import { currentLocale, subscribeToLocale } from './translate';
import type { AppLocale } from './messages';

/** The app's language: a component that reads it renders again when the language changes. */
export function useAppLocale(): AppLocale {
	return useSyncExternalStore(subscribeToLocale, currentLocale);
}
