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

/** The gap between a menu and the submenu it opens, and how far above its row the submenu starts (the web's 6 and 4). */
export const SUBMENU_SIDE_OFFSET = 6;
export const SUBMENU_ALIGN_OFFSET = 4;

/**
 * Where a submenu opens beside its menu, as the web's filter submenus do: left of the menu, its top 4 above the row it
 * opens from; right of the menu when the left has no room; over the menu, kept on screen, when neither side has, as
 * on a phone. It stays above the bottom of the area, its list scrolling past it.
 */
export function submenuPlacementOf(
	menu: MenuRect,
	row: MenuRect,
	submenuHeight: number,
	area: MenuArea,
	wantedWidth: number
): MenuPlacement {
	const width = Math.min(wantedWidth, area.width - 2 * MENU_COLLISION_PADDING);
	const rightmostLeft = area.width - MENU_COLLISION_PADDING - width;
	const leftOfMenu = menu.x - SUBMENU_SIDE_OFFSET - width;
	const rightOfMenu = menu.x + menu.width + SUBMENU_SIDE_OFFSET;
	const fitsLeft = leftOfMenu >= MENU_COLLISION_PADDING;
	const fitsRight = rightOfMenu <= rightmostLeft;
	let left = clamp(leftOfMenu, MENU_COLLISION_PADDING, rightmostLeft);
	if (fitsLeft) {
		left = leftOfMenu;
	} else if (fitsRight) {
		left = rightOfMenu;
	}
	const highestTop = area.top + MENU_COLLISION_PADDING;
	const lowestBottom = area.bottom - MENU_COLLISION_PADDING;
	const maxHeight = lowestBottom - highestTop;
	const height = Math.min(submenuHeight, maxHeight);
	const wantedTop = row.y - SUBMENU_ALIGN_OFFSET;
	const top = clamp(wantedTop, highestTop, lowestBottom - height);
	return { top, left, width, maxHeight: lowestBottom - top };
}
