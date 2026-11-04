import type { CSSProperties } from 'react';

/**
 * The widths of the pinned task column and of the status column, set per breakpoint on the sheet's frame and read by
 * every row, so the header, the rows and the totals keep one column template. A week fits beside the member rail
 * from `xl`; the status column shows the glyph alone until `2xl`, where the chip has room.
 */
export const SHEET_COLUMN_WIDTHS =
	'[--sheet-task:10.5rem] [--sheet-status:2.75rem] sm:[--sheet-task:13rem] lg:[--sheet-task:12rem] xl:[--sheet-task:13rem] 2xl:[--sheet-task:16rem] 2xl:[--sheet-status:7rem]';

const DAY_COLUMN = 'minmax(3.75rem,1fr)';

const TOTAL_COLUMN = '5rem';

/** One column per day of the period: a week fits the panel, a month scrolls sideways under the pinned task column. */
export function sheetGridStyleOf(dayCount: number): CSSProperties {
	const columnCount = Math.max(dayCount, 1);
	const dayColumns = `repeat(${columnCount}, ${DAY_COLUMN})`;
	const template = `var(--sheet-task) ${dayColumns} ${TOTAL_COLUMN} var(--sheet-status)`;
	return { gridTemplateColumns: template };
}

/** The span of the day columns, for the cell of the totals row that sits under them. */
export function dayColumnsSpanOf(dayCount: number): CSSProperties {
	const columnCount = Math.max(dayCount, 1);
	return { gridColumn: `span ${columnCount}` };
}

export const SHEET_ROW = 'grid w-full';

/** The task column stays in view while the days scroll sideways; it carries the card's fill so nothing shows through. */
export const PINNED_CELL = 'sticky left-0 z-[1] bg-card';

export const PINNED_TOTALS_CELL = PINNED_CELL;

export const WEEKEND_CELL = 'bg-foreground/[0.03]';

export const TOTAL_CELL = 'flex items-center justify-center px-2';
