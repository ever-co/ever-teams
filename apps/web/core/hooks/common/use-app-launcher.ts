'use client';

import { useAtom } from 'jotai';
import { EVER_APPS } from '@/core/constants/config/ever-apps';
import { manageSections, panelSections, railItems } from '@/core/lib/utils/app-launcher';
import { appLauncherPreferencesState } from '@/core/stores/common/app-launcher';

/** The App Launcher's apps as the person arranged them in Manage apps: the panel, the rail and the editor read it. */
export function useAppLauncher() {
	const [preferences, setPreferences] = useAtom(appLauncherPreferencesState);
	return {
		preferences,
		setPreferences,
		panelSections: panelSections(EVER_APPS, preferences),
		manageSections: manageSections(EVER_APPS, preferences),
		railItems: railItems(EVER_APPS, preferences)
	};
}
