import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import {
	DEFAULT_APP_LAUNCHER_PREFERENCES,
	normalizeAppLauncherPreferences,
	type AppLauncherPreferences
} from '@/core/lib/utils/app-launcher';

/**
 * Manage apps (Settings › Preferences): what the App Launcher shows, pins and in which order. Per browser, like the
 * launcher's position: Teams has no server-side store for personal preferences.
 */
const storedAppLauncherPreferencesState = atomWithStorage<unknown>(
	'app-launcher-apps',
	DEFAULT_APP_LAUNCHER_PREFERENCES,
	undefined,
	{ getOnInit: true }
);

/** Always a well-formed value: whatever the storage holds is normalized on the way out. */
export const appLauncherPreferencesState = atom(
	(get) => normalizeAppLauncherPreferences(get(storedAppLauncherPreferencesState)),
	(_get, set, next: AppLauncherPreferences) => set(storedAppLauncherPreferencesState, next)
);
