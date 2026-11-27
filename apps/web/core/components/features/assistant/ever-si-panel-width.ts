/**
 * The Ever SI panel's width, in CSS pixels. It never takes more than half the window, so the page beside it keeps
 * room to work, and never less than a composer and a short answer need.
 */
export const EVER_SI_PANEL_WIDTH = {
	min: 320,
	max: 640,
	default: 384,
	/** One Arrow key press; with Shift, four of them. */
	step: 16
} as const;

/** The widest the panel may be in a window this wide: 640 px, or half the window when that is less. */
export function maxEverSiPanelWidth(viewportWidth: number) {
	const half = Math.floor(viewportWidth / 2);
	const capped = Math.min(EVER_SI_PANEL_WIDTH.max, half);
	return Math.max(EVER_SI_PANEL_WIDTH.min, capped);
}

/** A stored or dragged width brought inside the bounds; anything that is not a number falls back to the default. */
export function clampEverSiPanelWidth(width: unknown, viewportWidth: number) {
	const maxWidth = maxEverSiPanelWidth(viewportWidth);
	let wanted: number = EVER_SI_PANEL_WIDTH.default;
	if (typeof width === 'number' && Number.isFinite(width)) {
		wanted = Math.round(width);
	}
	return Math.min(Math.max(wanted, EVER_SI_PANEL_WIDTH.min), maxWidth);
}
