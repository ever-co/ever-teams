import { atomWithStorage } from 'jotai/utils';

export type AppSwitcherPlacement = 'sidebar' | 'header' | 'rail';

export const APP_SWITCHER_PLACEMENTS: ReadonlyArray<AppSwitcherPlacement> = ['sidebar', 'header', 'rail'];

export const DEFAULT_APP_SWITCHER_PLACEMENT: AppSwitcherPlacement = 'sidebar';

export function isAppSwitcherPlacement(value: unknown): value is AppSwitcherPlacement {
	return APP_SWITCHER_PLACEMENTS.some((placement) => placement === value);
}

export const appSwitcherPlacementState = atomWithStorage<AppSwitcherPlacement>(
	'app-switcher-placement',
	DEFAULT_APP_SWITCHER_PLACEMENT,
	undefined,
	// Read on the first render, so a rail user never sees the sidebar slide over once the shell mounts. The sidebar
	// renders on the client only; components also rendered on the server wait for the mount before using it.
	{ getOnInit: true }
);
