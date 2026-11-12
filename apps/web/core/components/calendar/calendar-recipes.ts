import type { CSSProperties } from 'react';
import { memberToneOf } from '@/core/components/dashboards/team/team-series-tone';
import { dataColorHue, isPaintableColor } from '@/core/components/tasks/task-data-color';

/** Time without a project is drawn in a neutral tone. */
const NEUTRAL_ENTRY_TONE = 'hsl(var(--foreground) / 0.42)';

export const HOUR_HEIGHT_PX = 48;

/** Below this height a block keeps its title and duration on one line. */
export const COMPACT_BLOCK_HEIGHT_PX = 40;

export const MIN_BLOCK_HEIGHT_PX = 18;

/** A block shorter than half an hour has no room for resize edges: it still moves, and its menu edits it. */
export const RESIZABLE_BLOCK_HEIGHT_PX = 24;

const MINUTES_PER_HOUR = 60;

export function pixelsOfMinutes(minutes: number) {
	return (minutes / MINUTES_PER_HOUR) * HOUR_HEIGHT_PX;
}

export function blockHeightOfMinutes(minutes: number) {
	const naturalHeight = pixelsOfMinutes(minutes);
	return Math.max(naturalHeight, MIN_BLOCK_HEIGHT_PX);
}

/** The edge of a manual entry that a drag stretches; wider under a finger. */
export const RESIZE_EDGE = 'absolute inset-x-0 z-[1] h-1.5 cursor-ns-resize touch-none [@media(pointer:coarse)]:h-2.5';

/** The time a drag is about to add: an outline, since nothing is saved yet. */
export const SELECTION_GHOST = 'hairline-border border-dashed border-foreground/40 bg-foreground/[0.04]';

export const CALENDAR_ACTION =
	'outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring/25';

/** Tracked time: a tint of the project's hue with a 3px bar on the left, strong enough to read on a short entry. */
export const ENTRY_SOLID = 'bg-[color-mix(in_oklab,var(--entry)_18%,hsl(var(--card)))]';

/** Time added by hand: the same tint, hatched. */
export const ENTRY_HATCHED =
	'bg-[repeating-linear-gradient(135deg,color-mix(in_oklab,var(--entry)_26%,hsl(var(--card)))_0_4px,color-mix(in_oklab,var(--entry)_10%,hsl(var(--card)))_4px_8px)]';

/** Planned work has no hour of its own: it is drawn as an outline, the dashed line of what is not there yet. */
export const PLANNED_OUTLINE = 'hairline-border border-dashed border-foreground/25';

export const ENTRY_BAR = 'absolute inset-y-0 left-0 w-[3px] bg-(--entry)';

export const WEEKEND_TINT = 'bg-foreground/[0.02]';

export const HOUR_LINES_STYLE: CSSProperties = {
	backgroundImage: 'linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)',
	backgroundSize: `100% ${HOUR_HEIGHT_PX}px`
};

/**
 * The colour a project is drawn in: its own when it has one, otherwise the hue the Team dashboard derives from its
 * id (so a project looks the same on both pages, on every range and for every member).
 */
function entryToneOf(color: string | null, projectKey: string | null) {
	if (isPaintableColor(color)) {
		return dataColorHue(color);
	}
	if (projectKey) {
		return memberToneOf(projectKey);
	}
	return NEUTRAL_ENTRY_TONE;
}

export function entryToneStyle(color: string | null, projectKey: string | null = null): CSSProperties {
	const tone = entryToneOf(color, projectKey);
	const variables = { '--entry': tone };
	return variables as CSSProperties;
}

export function entryFillOf(isManual: boolean) {
	if (isManual) {
		return ENTRY_HATCHED;
	}
	return ENTRY_SOLID;
}
