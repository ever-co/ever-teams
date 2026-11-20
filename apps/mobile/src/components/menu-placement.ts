/**
 * Where a menu opens, as the web's menus do (task-property-menu.tsx): under its trigger with a gap of 4, its start on
 * the trigger's start, at most 240 wide, and kept 8 from every edge. A menu with no room below opens above; with room
 * on neither side, it takes the larger one and its list scrolls.
 */
export const MENU_WIDTH = 240;
export const MENU_SIDE_OFFSET = 4;
export const MENU_COLLISION_PADDING = 8;

export interface MenuRect {
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface MenuArea {
	width: number;
	/** Where the area ends for the menu: the bottom of the screen, or the top of the keyboard. */
	bottom: number;
}

export interface MenuPlacement {
	top: number;
	left: number;
	width: number;
	/** The most the menu may take on its side; past it, its list scrolls. */
	maxHeight: number;
}

function clamp(value: number, min: number, max: number) {
	return Math.min(Math.max(value, min), max);
}

/** The menu's place for a trigger and the menu's own height, both in the area's coordinates. */
export function menuPlacementOf(anchor: MenuRect, menuHeight: number, area: MenuArea): MenuPlacement {
	const width = Math.min(MENU_WIDTH, area.width - 2 * MENU_COLLISION_PADDING);
	const rightmostLeft = area.width - MENU_COLLISION_PADDING - width;
	const left = clamp(anchor.x, MENU_COLLISION_PADDING, rightmostLeft);
	const topBelow = anchor.y + anchor.height + MENU_SIDE_OFFSET;
	const bottomAbove = anchor.y - MENU_SIDE_OFFSET;
	const roomBelow = area.bottom - MENU_COLLISION_PADDING - topBelow;
	const roomAbove = bottomAbove - MENU_COLLISION_PADDING;
	const fitsBelow = menuHeight <= roomBelow;
	const fitsAbove = menuHeight <= roomAbove;
	const opensBelow = fitsBelow || (!fitsAbove && roomBelow >= roomAbove);
	if (opensBelow) {
		return { top: topBelow, left, width, maxHeight: roomBelow };
	}
	const heightAbove = Math.min(menuHeight, roomAbove);
	return { top: bottomAbove - heightAbove, left, width, maxHeight: roomAbove };
}
