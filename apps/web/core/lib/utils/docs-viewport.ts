/**
 * How far above the bottom of the layout the on-screen keyboard reaches: the layout's height less the part of it the
 * visual viewport shows (and where it starts). 0 when the keyboard is closed or the browser has no visual viewport.
 */
export function keyboardInsetOf(layoutHeight: number, viewport: { height: number; offsetTop: number } | null | undefined): number {
	if (!viewport) return 0;
	return Math.max(0, Math.round(layoutHeight - viewport.height - viewport.offsetTop));
}
