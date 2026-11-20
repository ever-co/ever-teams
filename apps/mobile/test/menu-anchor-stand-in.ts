import type { MenuRect } from '../src/components/menu-placement';

/** Where a test's menus open: jest's views never measure, so the real hook would never open one. */
export const STAND_IN_ANCHOR: MenuRect = { x: 320, y: 200, width: 28, height: 28 };

/** The menu anchor hook for a test: it opens at once, under a button at a fixed place. */
export function menuAnchorStandIn() {
	return {
		useMenuAnchor: () => ({
			anchorRef: { current: null },
			anchor: STAND_IN_ANCHOR,
			openFromAnchor: (open: () => void) => open()
		})
	};
}
