/**
 * Below md a row folds into two lines: the name and "6h 10m / 8h", then the meter and the difference. The cells
 * are placed on those two lines explicitly, so their order in the markup stays the order of the columns.
 */
export const PLAN_GRID =
	'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 px-4 py-2 md:grid-cols-[minmax(0,1.4fr)_minmax(5.5rem,0.6fr)_minmax(5.5rem,0.6fr)_minmax(6.5rem,0.7fr)_minmax(13rem,1.5fr)_minmax(5.5rem,0.55fr)] md:gap-y-0';

export const LEAD_CELL = 'min-w-0 max-md:col-start-1 max-md:row-start-1';

export const MOBILE_REACHED_CELL = 'flex justify-end md:hidden max-md:col-start-2 max-md:row-start-1';

export const DIFFERENCE_CELL = 'flex justify-end max-md:col-start-2 max-md:row-start-2';

export const METER_CELL = 'min-w-0 max-md:col-start-1 max-md:row-start-2';

export const DESKTOP_CELL = 'max-md:hidden';

export const PLAN_ROW_HEIGHT = 'min-h-11 [contain-intrinsic-size:auto_44px] [content-visibility:auto]';

/** Day groups past this many start closed, so a month never renders every row at once. */
export const OPEN_DAY_GROUPS_BY_DEFAULT = 7;
