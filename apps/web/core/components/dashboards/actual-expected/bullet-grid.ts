/**
 * One column template for the bullet rows, their day lines, the column labels and the totals: lead, meter, the
 * "6h 10m / 8h" figure, then the percentage (rows) or the difference (day lines). Below md a row folds into two
 * lines: the lead and the figure, then the meter and the last cell. Cells are placed on those lines explicitly, so
 * their order in the markup stays the order of the columns.
 */
export const BULLET_GRID =
	'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-4 py-2 md:grid-cols-[minmax(0,1.15fr)_minmax(0,2fr)_8rem_7rem] md:gap-y-0';

export const LEAD_CELL = 'min-w-0 max-md:col-start-1 max-md:row-start-1';

export const METER_CELL = 'flex min-w-0 items-center max-md:col-start-1 max-md:row-start-2';

export const FIGURE_CELL = 'flex min-w-0 justify-end max-md:col-start-2 max-md:row-start-1';

export const END_CELL = 'flex min-w-0 justify-end max-md:col-start-2 max-md:row-start-2';

export const BULLET_ROW_HEIGHT = 'min-h-14 [contain-intrinsic-size:auto_56px] [content-visibility:auto]';

export const DOT_LINE_HEIGHT = 'min-h-11 [contain-intrinsic-size:auto_44px] [content-visibility:auto]';

/** The day lines start under the row's name, past the disclosure chevron. */
export const LINE_LEAD = 'pl-6';

/** Under a member's name: the chevron, the avatar and their gaps. */
export const MEMBER_META_INDENT = 'pl-14.5';
