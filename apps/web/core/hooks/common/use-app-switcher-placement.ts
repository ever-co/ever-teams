'use client';

import { useAtomValue } from 'jotai';
import { HAS_EVER_APP_SWITCHER } from '@/core/constants/config/ever-apps';
import {
	appSwitcherPlacementState,
	DEFAULT_APP_SWITCHER_PLACEMENT,
	isAppSwitcherPlacement,
	type AppSwitcherPlacement
} from '@/core/stores/common/app-switcher';

/** Null when the deployment links no other app: then no placement shows the switcher. */
export function useAppSwitcherPlacement(): AppSwitcherPlacement | null {
	const storedPlacement = useAtomValue(appSwitcherPlacementState);
	if (!HAS_EVER_APP_SWITCHER) {
		return null;
	}
	if (isAppSwitcherPlacement(storedPlacement)) {
		return storedPlacement;
	}
	return DEFAULT_APP_SWITCHER_PLACEMENT;
}
