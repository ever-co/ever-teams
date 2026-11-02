/**
 * One column template for the member list of the team pages: the column labels, every member card, every pending
 * invitation and the task rows unfolded under a member share it, so their dividers line up from top to bottom.
 * The cells carry their own padding (no grid gap) so each divider sits exactly on a column boundary.
 */
export const MEMBER_ROW_GRID =
	'grid w-full grid-cols-[minmax(12rem,1.15fr)_minmax(12rem,1.8fr)_minmax(9.5rem,0.9fr)_minmax(9.5rem,1fr)_minmax(10.5rem,0.95fr)_2.25rem] items-stretch';

/** The same columns from xl only, for blocks that wrap freely below it (the totals strip of a plan). */
export const MEMBER_GRID_COLUMNS_FROM_XL =
	'xl:grid xl:grid-cols-[minmax(12rem,1.15fr)_minmax(12rem,1.8fr)_minmax(9.5rem,0.9fr)_minmax(9.5rem,1fr)_minmax(10.5rem,0.95fr)_2.25rem]';

/** The first cell: flush with the card's own padding. */
export const MEMBER_FIRST_CELL = 'flex min-w-0 items-center pr-4';

/** Every following cell, with the hairline that separates it from the previous one. */
export const MEMBER_CELL = 'flex min-w-0 items-center px-4 hairline-l border-border';

/** A cell whose content is centred in its column, under its centred label (times, estimate, totals). */
export const MEMBER_CELL_CENTER = 'justify-center text-center';

/** The trailing menu cell. */
export const MEMBER_MENU_CELL = 'flex items-center justify-end';

/** Horizontal padding of a member card, shared by the column labels so they start where the cells start. */
export const MEMBER_CARD_PADDING = 'px-4';

/** The grid only holds from xl: below it the cards stack their cells (the columns would not fit the panel). */
export const MEMBER_GRID_FROM = 'hidden xl:block';
export const MEMBER_STACK_UNTIL = 'xl:hidden';

/**
 * The height of a member row once its task is loaded (title and labels). Every row keeps it whatever its state
 * (loading, no task, invitation, invite button), so the list never jumps when the data arrives.
 */
export const MEMBER_ROW_MIN_HEIGHT = 'min-h-17';

/** The same height for a whole card that carries its own vertical padding (`py-2` around the row). */
export const MEMBER_CARD_MIN_HEIGHT = 'min-h-21';

/** The table view's single surface: its member rows share it, split by hairlines. */
export const MEMBER_TABLE_SURFACE =
	'overflow-hidden rounded-xl bg-card hairline-ring ring-border shadow-sm shadow-black/6.5';

/** A member card of the cards view: its own surface, one hairline, a light drop. */
export const MEMBER_CARD =
	'rounded-xl bg-card hairline-ring ring-border shadow-[0_1px_2px_rgb(0_0_0/0.04)] transition-[box-shadow] hover:shadow-[0_2px_6px_rgb(0_0_0/0.06)]';

/**
 * The scroll container of the member list in every view (cards, table, blocks, and their skeletons): the same top
 * gap under the column labels or the filter tabs, and room for the cards' outline and shadow on every side.
 */
export const MEMBER_LIST_CONTAINER = '-mx-2 overflow-x-auto px-2 pt-3 pb-2';
