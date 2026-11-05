/**
 * One column template shared by the column labels, the group headers, every entry and the totals row. From `xl`:
 * checkbox, member (or day), task, change, time, duration, billable, status, menu. Below it a row keeps the
 * checkbox, the task (with its chips, time and member on a second line), the duration and the menu.
 */
export const EDITS_GRID =
	'grid grid-cols-[1rem_minmax(0,1fr)_auto_1.75rem] items-center gap-x-3 px-4 xl:grid-cols-[1rem_minmax(0,9rem)_minmax(0,1fr)_9rem_7.25rem_4.75rem_1.5rem_6.75rem_1.75rem]';

export const WIDE_ONLY = 'max-xl:hidden';

export const NARROW_ONLY = 'xl:hidden';

/** Group header: the name spans member to change, the count and total span time and duration. */
export const GROUP_NAME_SPAN = 'xl:col-span-3';

export const GROUP_TOTAL_SPAN = 'xl:col-span-2';

export const GROUP_TRAILING_SPAN = 'xl:col-span-3';

export const TOTALS_LABEL_SPAN = 'max-xl:col-span-2 xl:col-span-5';

/** Rows far below the fold skip layout and paint until they come near, with the height they will take. */
export const EDITS_ROW = 'min-h-12 [content-visibility:auto] [contain-intrinsic-size:auto_3rem]';

/** Groups past this many start closed, so a long period never renders every row at once. */
export const OPEN_GROUPS_BY_DEFAULT = 7;
