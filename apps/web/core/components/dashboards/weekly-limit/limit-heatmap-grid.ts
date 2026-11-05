import type { CSSProperties } from 'react';
import type { LimitDuration, LimitHeatStep } from '@/core/lib/utils/dashboards/weekly-limit';

/**
 * Below lg the member column also carries the period total, so the total column collapses to nothing and the days
 * get the room; from lg the total has its own pinned column at the row's end.
 */
export const HEAT_FRAME_VARS = '[--wl-member:8.75rem] [--wl-total:0px] lg:[--wl-member:13rem] lg:[--wl-total:15rem]';

/**
 * A month of days is wider than the page. A scroll container still reports its content's width to the ancestors
 * that size themselves on their content, so the frame contains its inline size: the matrix scrolls inside its own
 * frame and never widens the panel, whatever the parents do.
 */
export const HEAT_FRAME_BOUNDS = 'w-full min-w-0 max-w-full [contain:inline-size]';

export const HEAT_SLOT_VARS: Record<LimitDuration, string> = {
	day: '[--wl-slot:2.5rem]',
	week: '[--wl-slot:4.5rem]'
};

/** Member, one slot per day or week, a spacer that keeps the total at the far end, then the total. */
export function heatTemplateOf(columnCount: number): CSSProperties {
	const slotCount = Math.max(columnCount, 1);
	return {
		gridTemplateColumns: `var(--wl-member) repeat(${slotCount}, var(--wl-slot)) minmax(0, 1fr) var(--wl-total)`
	};
}

export const HEAT_ROW = 'grid min-h-10 [contain-intrinsic-size:auto_40px] [content-visibility:auto]';

export const HEAT_STICKY_START = 'sticky start-0 z-[2] bg-card';

export const HEAT_STICKY_END = 'sticky end-0 z-[2] col-[-2/-1] bg-card max-lg:hidden';

/** A slot pads its square by 2px on each side: 4px between squares, and weekend tints that join from top to bottom. */
export const HEAT_SLOT = 'flex items-center justify-center py-0.5';

export const HEAT_WEEKEND = 'bg-foreground/[0.03]';

export const HEAT_CELL_SIZES: Record<LimitDuration, string> = {
	day: 'size-9',
	week: 'h-9 w-16'
};

export const HEAT_CELL_BASE =
	'flex items-center justify-center rounded-sm text-[11px] font-medium tabular-nums group-focus-visible:ring-2 group-focus-visible:ring-ring';

/**
 * Hours stay in foreground ink on every brand step (5.9:1 on the darkest one in both themes). White on the
 * destructive fill measures 3.76:1 in light mode, so a day over the limit is destructive ink on a destructive tint.
 */
export const HEAT_STEP_CLASSES: Record<LimitHeatStep, string> = {
	empty: 'hairline-ring ring-border',
	low: 'bg-primary/10 text-foreground',
	medium: 'bg-primary/25 text-foreground',
	high: 'bg-primary/45 text-foreground',
	full: 'bg-primary/70 text-foreground',
	over: 'bg-destructive/15 text-destructive-ink hairline-ring ring-destructive/40',
	unmeasured: 'bg-foreground/[0.06] text-foreground'
};

export const HEAT_FUTURE = 'hairline-border border-dashed border-border';

export type LegendStep = Extract<LimitHeatStep, 'low' | 'medium' | 'high' | 'full'>;

export const LEGEND_STEPS: ReadonlyArray<LegendStep> = ['low', 'medium', 'high', 'full'];

export const LEGEND_SWATCH = 'block size-3 shrink-0 rounded-[2px]';
