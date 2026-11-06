/** Below md a row folds into two lines: the name and the time, then the meter, the percentage and the verdict. */
export const LIMIT_GRID =
	'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 px-4 py-2 md:grid-cols-[minmax(0,1.5fr)_minmax(8.5rem,0.9fr)_minmax(9rem,1fr)_minmax(7rem,0.7fr)_6.5rem] md:gap-y-0';

export const DESKTOP_CELL = 'max-md:hidden';

export const MOBILE_FULL_WIDTH = 'max-md:col-span-2';

export const LIMIT_ROW_HEIGHT = 'min-h-11 [contain-intrinsic-size:auto_44px] [content-visibility:auto]';

/** Groups past this many start closed, so a long period never renders every row at once. */
export const OPEN_GROUPS_BY_DEFAULT = 7;
