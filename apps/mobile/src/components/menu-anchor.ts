import { useCallback, useRef, useState } from 'react';
import type { View } from 'react-native';
import type { MenuRect } from './menu-placement';

/**
 * The chip a menu opens under: its ref goes on the chip, and opening first measures where the chip is on the screen,
 * so the menu opens right under it. A chip not on screen yet opens the menu without a place, as a dialog.
 */
export function useMenuAnchor() {
	const anchorRef = useRef<View>(null);
	const [anchor, setAnchor] = useState<MenuRect | null>(null);
	const openFromAnchor = useCallback((open: () => void) => {
		const trigger = anchorRef.current;
		if (!trigger) {
			open();
			return;
		}
		trigger.measureInWindow((x, y, width, height) => {
			setAnchor({ x, y, width, height });
			open();
		});
	}, []);
	return { anchorRef, anchor, openFromAnchor };
}
