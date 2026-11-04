import type { CSSProperties } from 'react';
import { dataColorHue, isPaintableColor } from '@/core/components/tasks/task-data-color';

/** A project without a colour (or before Gauzy returns it with each log) is drawn in a neutral tone. */
const NEUTRAL_ENTRY_TONE = 'hsl(var(--foreground) / 0.42)';

export const HOUR_HEIGHT_PX = 48;

/** Below this height a block keeps its title and duration on one line. */
export const COMPACT_BLOCK_HEIGHT_PX = 40;

export const MIN_BLOCK_HEIGHT_PX = 18;

export const CALENDAR_ACTION =
	'outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring/25';

/** Tracked time: a tint of the project's hue with a 3px bar on the left. */
export const ENTRY_SOLID = 'bg-[color-mix(in_oklab,var(--entry)_13%,hsl(var(--card)))]';

/** Time added by hand: the same tint, hatched. */
export const ENTRY_HATCHED =
	'bg-[repeating-linear-gradient(135deg,color-mix(in_oklab,var(--entry)_20%,hsl(var(--card)))_0_4px,color-mix(in_oklab,var(--entry)_7%,hsl(var(--card)))_4px_8px)]';

/** Planned work has no hour of its own: it is drawn as an outline, the dashed line of what is not there yet. */
export const PLANNED_OUTLINE = 'hairline-border border-dashed border-foreground/25';

export const ENTRY_BAR = 'absolute inset-y-0 left-0 w-[3px] bg-(--entry)';

export const WEEKEND_TINT = 'bg-foreground/[0.02]';

export const HOUR_LINES_STYLE: CSSProperties = {
	backgroundImage: 'linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)',
	backgroundSize: `100% ${HOUR_HEIGHT_PX}px`
};

export function entryToneStyle(color: string | null): CSSProperties {
	let tone = NEUTRAL_ENTRY_TONE;
	if (isPaintableColor(color)) {
		tone = dataColorHue(color);
	}
	const variables = { '--entry': tone };
	return variables as CSSProperties;
}

export function entryFillOf(isManual: boolean) {
	if (isManual) {
		return ENTRY_HATCHED;
	}
	return ENTRY_SOLID;
}
