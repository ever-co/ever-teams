/** Below md a row folds into two lines: the member and the amount owed, then the rate and the tracked time. */
export const PAYMENTS_GRID =
	'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-4 py-2 md:grid-cols-[minmax(0,1.6fr)_minmax(7rem,0.8fr)_minmax(6rem,0.7fr)_minmax(7.5rem,0.8fr)] md:gap-y-0';

export const OWED_CELL = 'flex justify-end max-md:order-1';

export const RATE_CELL = 'flex min-w-0 md:justify-end max-md:order-2 max-md:pl-8';

export const TRACKED_CELL = 'flex justify-end max-md:order-3';

export const FORMULA_CELL = 'min-w-0 md:col-span-2 md:text-right max-md:order-2 max-md:col-span-2 max-md:pl-6';

export const ROW_LEAD = 'min-w-0';

export const NESTED_LEAD = 'min-w-0 pl-6';

export const PAYMENTS_ROW_HEIGHT = 'min-h-11 [contain-intrinsic-size:auto_44px] [content-visibility:auto]';

/** Day groups past this many start closed, so a month never renders every member of every day at once. */
export const OPEN_DAY_GROUPS_BY_DEFAULT = 7;
