/**
 * One grid for every invoice row and its skeleton. Below `lg` a row keeps the client, the total and one button on its
 * first line, and states the period and the due date on a line of their own (`LEDGER_ROW_DETAILS`). From `lg` the
 * download button and the actions menu sit side by side.
 */
export const LEDGER_ROW_GRID =
	'grid grid-cols-[minmax(0,1fr)_auto_2.25rem] items-center gap-x-3 lg:grid-cols-[minmax(14rem,1fr)_13rem_8rem_7.5rem_9rem_4.5rem]';

/** Below `lg`, where a row keeps one button: the menu, holding the PDF too, or the download alone. */
export const COMPACT_LEDGER_QUERY = '(width < 64rem)';

/** The whole width of the row, past the client's 2rem tile and its gap; from `lg` the columns state the same. */
export const LEDGER_ROW_DETAILS = 'col-span-full min-w-0 text-pretty pl-10.5 lg:hidden';

export const LEDGER_SURFACE = 'rounded-xl bg-card hairline-ring ring-border shadow-sm shadow-black/6.5';
