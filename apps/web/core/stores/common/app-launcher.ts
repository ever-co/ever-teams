import { atom } from 'jotai';
import { atomWithStorage, createJSONStorage } from 'jotai/utils';
import {
	DEFAULT_APP_LAUNCHER_PREFERENCES,
	normalizeAppLauncherPreferences,
	type AppLauncherPreferences
} from '@/core/lib/utils/app-launcher';

/**
 * `localStorage`, except that a write the browser refuses throws. Jotai's default adapter skips the write in silence
 * when the storage itself is blocked (cookies off, some private modes), and Manage apps would then say "Saved" for a
 * choice that is gone on reload. Reads stay graceful: a blocked storage reads as nothing stored.
 */
const strictLocalStorage = {
	getItem: (key: string) => {
		try {
			return window.localStorage.getItem(key);
		} catch {
			return null;
		}
	},
	setItem: (key: string, value: string) => {
		window.localStorage.setItem(key, value);
	},
	removeItem: (key: string) => {
		try {
			window.localStorage.removeItem(key);
		} catch {
			// Nothing stored can be removed from a storage the browser blocks.
		}
	},
	// Another tab's edits reach this one, as with Jotai's own adapter.
	subscribe: (key: string, callback: (value: string | null) => void) => {
		const onStorage = (event: StorageEvent) => {
			if (event.key === key) {
				callback(event.newValue);
			}
		};
		window.addEventListener('storage', onStorage);
		return () => window.removeEventListener('storage', onStorage);
	}
};

/**
 * Manage apps (Settings › Preferences): what the App Launcher shows, pins and in which order. Per browser, like the
 * launcher's position: Teams has no server-side store for personal preferences.
 */
const storedAppLauncherPreferencesState = atomWithStorage<unknown>(
	'app-launcher-apps',
	DEFAULT_APP_LAUNCHER_PREFERENCES,
	createJSONStorage<unknown>(() => strictLocalStorage),
	{ getOnInit: true }
);

/**
 * Always a well-formed value: whatever the storage holds is normalized on the way out. A refused write throws to the
 * caller, which keeps the choice for this page and says so (as the launcher's position does).
 */
export const appLauncherPreferencesState = atom(
	(get) => normalizeAppLauncherPreferences(get(storedAppLauncherPreferencesState)),
	(_get, set, next: AppLauncherPreferences) => set(storedAppLauncherPreferencesState, next)
);
