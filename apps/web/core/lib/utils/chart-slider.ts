export interface ChartSliderValue {
	min: number;
	max: number;
	now: number;
	text: string | undefined;
}

/**
 * A chart the arrow keys walk day by day is exposed as a slider: its value is the position of the active day and
 * its text that day's name, so a screen reader announces where the focus stands.
 */
export function chartSliderValue(
	activeIndex: number | null,
	count: number,
	activeText: string | undefined
): ChartSliderValue {
	const lastIndex = Math.max(count - 1, 0);
	const position = activeIndex ?? 0;
	let valueText: string | undefined;
	if (activeText) {
		valueText = activeText;
	}
	return { min: 0, max: lastIndex, now: position, text: valueText };
}
