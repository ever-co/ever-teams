/**
 * One grid for the column labels, the rows, the foot and the skeleton of the clients table. From lg: client, contact,
 * projects, client since, menu; below it: client, projects, menu.
 */
export const CLIENTS_TABLE_GRID =
	'grid grid-cols-[minmax(0,1fr)_auto_2.25rem] items-center lg:grid-cols-[minmax(14rem,1fr)_17rem_8rem_7.5rem_2.25rem]';

export const WIDE_CELL = 'flex min-w-0 items-center px-2 max-lg:hidden';

export const CELL = 'flex min-w-0 items-center px-2';

export const CLIENTS_TABLE_SURFACE = 'rounded-xl bg-card hairline-ring ring-border shadow-sm shadow-black/6.5';

export const CLIENTS_CARDS_GRID = 'grid grid-cols-[repeat(auto-fill,minmax(18rem,1fr))] gap-3';

export const SKELETON_BAR = 'bg-foreground/[0.06]';

/** The client's name stretched over its whole row or card: the row opens from anywhere, as a real link. */
export const ROW_LINK = "after:absolute after:inset-0 after:content-['']";

/** A control of a row raised over the stretched name, so it keeps its own click. */
export const ABOVE_ROW_LINK = 'relative z-10';
