import { useCallback, useRef, useState } from 'react';
import type { View } from 'react-native';
import type { MenuRect } from './menu-placement';

/** A chip not laid out yet measures as an empty box at the corner of the screen: no place to open under. */
function anchorOf(measured: MenuRect): MenuRect | null {
	if (measured.width === 0 && measured.height === 0) {
		return null;
	}
	return measured;
}

/**
 * The chip a menu opens under: its ref goes on the chip, and opening first measures where the chip is on the screen,
 * so the menu opens right under it. A chip not on screen yet opens the menu without a place, as a dialog.
 */
export function useMenuAnchor() {
	const anchorRef = useRef<View>(null);
	const [anchor, setAnchor] = useState<MenuRect | null>(null);
	const openFromAnchor = useCallback((open: () => void) => {
		const trigger = anchorRef.current;
		// a place measured for an earlier opening is not the chip's place now
		if (!trigger) {
			setAnchor(null);
			open();
			return;
		}
		trigger.measureInWindow((x, y, width, height) => {
			setAnchor(anchorOf({ x, y, width, height }));
			open();
		});
	}, []);
	return { anchorRef, anchor, openFromAnchor };
}
