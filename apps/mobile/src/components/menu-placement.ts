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
	/** Where the area starts for the menu: under the status bar. */
	top: number;
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

export interface MenuShape {
	/** 240 unless the menu asks for another, as the web's filter menu does with 224. */
	width?: number;
	/** The menu's start on the trigger's start, or its end on the trigger's end. */
	align?: 'start' | 'end';
	/** The gap between the trigger and the menu: 4 unless the menu asks for another. */
	offset?: number;
}

function startOf(anchor: MenuRect, width: number, align: 'start' | 'end') {
	if (align === 'end') {
		return anchor.x + anchor.width - width;
	}
	return anchor.x;
}

/** The menu's place for a trigger and the menu's own height, both in the area's coordinates. */
export function menuPlacementOf(
	anchor: MenuRect,
	menuHeight: number,
	area: MenuArea,
	shape: MenuShape = {}
): MenuPlacement {
	const { width: wantedWidth = MENU_WIDTH, align = 'start', offset = MENU_SIDE_OFFSET } = shape;
	const width = Math.min(wantedWidth, area.width - 2 * MENU_COLLISION_PADDING);
	const rightmostLeft = area.width - MENU_COLLISION_PADDING - width;
	const left = clamp(startOf(anchor, width, align), MENU_COLLISION_PADDING, rightmostLeft);
	const highestTop = area.top + MENU_COLLISION_PADDING;
	const lowestBottom = area.bottom - MENU_COLLISION_PADDING;
	const topBelow = anchor.y + anchor.height + offset;
	// a trigger the keyboard covers keeps its menu above the keyboard
	const bottomAbove = Math.min(anchor.y - offset, lowestBottom);
	const roomBelow = lowestBottom - topBelow;
	const roomAbove = bottomAbove - highestTop;
	const fitsBelow = menuHeight <= roomBelow;
	const fitsAbove = menuHeight <= roomAbove;
	const belowIsLarger = roomBelow >= roomAbove;
	const fallsBackBelow = !fitsAbove && belowIsLarger;
	const opensBelow = fitsBelow || fallsBackBelow;
	if (opensBelow) {
		return { top: topBelow, left, width, maxHeight: roomBelow };
	}
	const heightAbove = Math.min(menuHeight, roomAbove);
	return { top: bottomAbove - heightAbove, left, width, maxHeight: roomAbove };
}
