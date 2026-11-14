export interface StripBox {
	left: number;
	scrollLeft: number;
	clientWidth: number;
	scrollWidth: number;
}

interface StripItemBox {
	left: number;
	width: number;
}

export function stripOverflows(strip: StripBox): boolean {
	return strip.scrollWidth > strip.clientWidth;
}

export function centredScrollLeftOf(strip: StripBox, item: StripItemBox): number {
	const itemStart = item.left - strip.left + strip.scrollLeft;
	const sideRoom = (strip.clientWidth - item.width) / 2;
	const centred = itemStart - sideRoom;
	return Math.max(0, centred);
}
