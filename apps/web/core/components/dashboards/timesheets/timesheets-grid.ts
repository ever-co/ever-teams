/**
 * One column template shared by the column labels, the day headers and every log row, so the figures line up from
 * the header to the last row. Below `lg` a row keeps the checkbox, the task (with its status, project and time
 * under it), the duration and the menu.
 */
const LOG_GRID_WITH_MEMBER =
	'grid grid-cols-[1rem_minmax(0,1fr)_auto_auto] items-center gap-x-3 px-4 lg:grid-cols-[1rem_7.25rem_minmax(0,1fr)_minmax(0,10rem)_minmax(0,10rem)_7.5rem_4.75rem_6rem]';

const LOG_GRID_WITHOUT_MEMBER =
	'grid grid-cols-[1rem_minmax(0,1fr)_auto_auto] items-center gap-x-3 px-4 lg:grid-cols-[1rem_7.25rem_minmax(0,1fr)_minmax(0,14rem)_7.5rem_4.75rem_6rem]';

/** The span of a day's name in its header: from the status column to the column before the time. */
const DAY_LABEL_SPAN_WITH_MEMBER = 'lg:col-span-4';

const DAY_LABEL_SPAN_WITHOUT_MEMBER = 'lg:col-span-3';

/** A day's "4 logs · 6h 40m" spans the time and duration columns, so its total ends where the durations end. */
export const DAY_SUMMARY_SPAN = 'lg:col-span-2';

export function logGridOf(showsMember: boolean) {
	if (showsMember) {
		return LOG_GRID_WITH_MEMBER;
	}
	return LOG_GRID_WITHOUT_MEMBER;
}

export function dayLabelSpanOf(showsMember: boolean) {
	if (showsMember) {
		return DAY_LABEL_SPAN_WITH_MEMBER;
	}
	return DAY_LABEL_SPAN_WITHOUT_MEMBER;
}

/** Columns hidden on a phone, where the task cell carries their values on its second line. */
export const WIDE_ONLY = 'max-lg:hidden';

export const NARROW_ONLY = 'lg:hidden';

/** Rows far below the fold skip layout and paint until they come near, with the height they will take. */
export const DEFERRED_ROW = '[content-visibility:auto] [contain-intrinsic-size:auto_2.75rem]';
