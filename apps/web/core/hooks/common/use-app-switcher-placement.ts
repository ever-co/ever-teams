'use client';

import { useAtomValue } from 'jotai';
import {
	appSwitcherPlacementState,
	DEFAULT_APP_SWITCHER_PLACEMENT,
	isAppSwitcherPlacement,
	type AppSwitcherPlacement
} from '@/core/stores/common/app-switcher';

export function useAppSwitcherPlacement(): AppSwitcherPlacement {
	const storedPlacement = useAtomValue(appSwitcherPlacementState);
	if (isAppSwitcherPlacement(storedPlacement)) {
		return storedPlacement;
	}
	return DEFAULT_APP_SWITCHER_PLACEMENT;
}
