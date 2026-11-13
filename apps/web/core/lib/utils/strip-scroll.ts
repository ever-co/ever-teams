/** Where a horizontal strip sits on screen and how far it is scrolled. */
export interface StripBox {
	left: number;
	scrollLeft: number;
	clientWidth: number;
	scrollWidth: number;
}

/** Where one item of the strip sits on screen. */
export interface StripItemBox {
	left: number;
	width: number;
}

/** Whether the strip is wider than what it shows, so it can scroll at all. */
export function stripOverflows(strip: StripBox): boolean {
	return strip.scrollWidth > strip.clientWidth;
}

/** The scroll position that puts the item in the middle of the strip, never before the strip's start. */
export function centredScrollLeftOf(strip: StripBox, item: StripItemBox): number {
	const itemStart = item.left - strip.left + strip.scrollLeft;
	const sideRoom = (strip.clientWidth - item.width) / 2;
	const centred = itemStart - sideRoom;
	return Math.max(0, centred);
}
