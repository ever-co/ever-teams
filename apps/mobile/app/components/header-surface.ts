interface HeaderColors {
	background: string;
	background2: string;
}

/** The header's surface, which the band under it takes too: the page color in dark mode, the card color in light. */
export function headerSurfaceOf(dark: boolean, colors: HeaderColors) {
	if (dark) {
		return colors.background2;
	}
	return colors.background;
}
