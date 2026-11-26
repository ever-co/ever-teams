'use client';

import { useAtom } from 'jotai';
import { EVER_APPS } from '@/core/constants/config/ever-apps';
import {
	manageSections,
	panelSections,
	railItems,
	reconcileAppLauncherPreferences
} from '@/core/lib/utils/app-launcher';
import { appLauncherPreferencesState } from '@/core/stores/common/app-launcher';

/** The App Launcher's apps as the person arranged them in Manage apps: the panel, the rail and the editor read it. */
export function useAppLauncher() {
	const [stored, setPreferences] = useAtom(appLauncherPreferencesState);
	// Every edit starts from the reconciled value, so a stale pin also leaves the storage at the next save.
	const preferences = reconcileAppLauncherPreferences(EVER_APPS, stored);
	return {
		preferences,
		setPreferences,
		panelSections: panelSections(EVER_APPS, preferences),
		manageSections: manageSections(EVER_APPS, preferences),
		railItems: railItems(EVER_APPS, preferences)
	};
}
