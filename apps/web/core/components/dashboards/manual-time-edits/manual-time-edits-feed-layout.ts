import type { RailPosition } from '@/core/lib/utils/dashboards/manual-time-edits';

export const FEED_LAYOUT = 'grid min-w-0 gap-x-6 gap-y-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start';

export const FEED_COLUMN = 'flex min-w-0 flex-col gap-5';

export const GROUP_HEADER = 'flex min-h-8 flex-wrap items-center justify-between gap-x-3 gap-y-1 px-1 pb-1.5';

export const ENTRY_GRID = 'relative grid grid-cols-[1.5rem_minmax(0,1fr)_1.75rem] gap-x-3 px-3 py-3 sm:px-4';

export const ENTRY_ROW = '[content-visibility:auto] [contain-intrinsic-size:auto_5.5rem]';

/** The 20px avatar and its 8px gap, so the lines under the sentence start under the name. */
export const ENTRY_INDENT = 'pl-7';

const RAIL_LINE = 'pointer-events-none absolute left-6 w-0 hairline-l border-border sm:left-7';

/** The first tile ends at 36px (12px padding and 24px), the last one starts at 12px. */
const RAIL_EXTENTS: Record<RailPosition, string> = {
	only: 'hidden',
	first: 'top-9 bottom-0',
	middle: 'inset-y-0',
	last: 'top-0 h-3'
};

export function railLineClassOf(position: RailPosition) {
	return `${RAIL_LINE} ${RAIL_EXTENTS[position]}`;
}

/**
 * Sticky beside the feed from `lg`, never taller than the content scroller (the viewport less the shell's top bar,
 * the toolbar band with a row of filter chips and the page padding), so its last rows stay reachable: the body
 * scrolls inside the surface instead.
 */
export const SUMMARY_RAIL = 'lg:sticky lg:top-4 lg:flex lg:max-h-[calc(100dvh-16rem)] lg:flex-col';

export const SUMMARY_RAIL_BODY = 'min-h-0 lg:overflow-y-auto';
