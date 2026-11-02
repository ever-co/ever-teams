import type { CSSProperties } from 'react';

/**
 * Status, priority, size and label colours come from the API, mostly as pastels that vanish in a light tint.
 * The hue is kept and its lightness and chroma are pinned, so the same colour reads as a tint, a ring or a dot
 * on light and dark surfaces.
 */
export function dataColorHue(color: string) {
	return `oklch(from ${color} 0.62 min(c * 3, 0.16) h)`;
}

export function isPaintableColor(color: string | null | undefined): color is string {
	const hasColor = Boolean(color);
	const isTransparent = color === 'transparent';
	return hasColor && !isTransparent;
}

/** Feeds the `chip-3d` utility of styles/globals.css: the element carries the class, this style gives it the hue. */
export function dataColorChipStyle(color: string): CSSProperties {
	const chipVariables = { '--chip': dataColorHue(color) };
	return chipVariables as CSSProperties;
}

/** Feeds the `gem-plate` utility: the faceted plate of issue types, team and workspace tiles, placeholder avatars. */
export function dataColorGemStyle(color: string): CSSProperties {
	const gemVariables = { '--gem': dataColorHue(color) };
	return gemVariables as CSSProperties;
}

export function dataColorDotStyle(color: string): CSSProperties {
	return { backgroundColor: dataColorHue(color) };
}
