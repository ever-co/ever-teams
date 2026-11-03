import { DASHBOARD_SURFACE } from '@/core/components/dashboards/kit/recipes';
import { cn } from '@/core/lib/helpers';

export const STATEMENT_GRID = 'grid items-start gap-3 xl:grid-cols-2';

/** A month of statements renders only the cards in view; the intrinsic size keeps the scrollbar steady. */
export const STATEMENT_CARD = cn(
	DASHBOARD_SURFACE,
	'flex flex-col [contain-intrinsic-size:auto_18rem] [content-visibility:auto]'
);

export const STATEMENT_HEADER = 'flex min-h-12 items-center justify-between gap-3 px-4 pt-3 pb-2';

export const STATEMENT_BODY = 'px-4 pb-2';

/**
 * A priced line: the day or the member, the formula, a dotted leader, the amount. On a phone the formula drops
 * under the label so the amount keeps its place at the right.
 */
export const STATEMENT_LINE =
	'grid min-h-8 grid-cols-[minmax(0,auto)_minmax(1rem,1fr)_auto] items-baseline gap-x-2 py-1 sm:grid-cols-[minmax(0,auto)_minmax(0,auto)_minmax(1rem,1fr)_auto]';

export const STATEMENT_PLAIN_LINE =
	'grid min-h-8 grid-cols-[minmax(0,auto)_minmax(1rem,1fr)_auto] items-baseline gap-x-2 py-1';

export const LINE_FORMULA = 'min-w-0 max-sm:col-span-3 max-sm:row-start-2';

export const LINE_LEADER = '-translate-y-[0.3em] border-b border-dotted border-foreground/25';

export const LINE_FIGURE = 'text-right';

export const STATEMENT_FOOTER = 'flex flex-wrap items-end justify-between gap-x-4 gap-y-1 px-4 py-3';

export const FOOTER_AMOUNT = 'text-xl font-semibold text-foreground';

/** Past this many lines a statement folds the rest behind "Show N more", so long months stay scannable. */
export const VISIBLE_STATEMENT_LINES = 5;
