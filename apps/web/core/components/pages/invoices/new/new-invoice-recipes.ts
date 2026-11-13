/** The invoice sheet and, beside it from `lg`, the rail of its details; one column below. */
export const NEW_INVOICE_LAYOUT = 'grid grid-cols-1 items-start gap-4 pb-6 lg:grid-cols-[minmax(0,1fr)_20rem]';

/**
 * The lines switch shares the row of the client and the period, at its end from `sm`. Below, it wraps onto a row of
 * its own with equal options: three options beside the two pickers would cover them on a phone.
 */
export const GROUPING_SWITCH = 'sm:ml-auto max-sm:w-full max-sm:[&>[data-segment]]:flex-1';

/**
 * One grid for every line of the sheet. From `lg` a line is one row: description, hours, rate, amount, remove.
 * Below, the description takes the first row and the figures the second.
 */
export const LINE_GRID =
	'grid grid-cols-[auto_auto_minmax(0,1fr)_2rem] items-center gap-x-4 gap-y-1.5 lg:grid-cols-[minmax(0,1fr)_5.5rem_7rem_8rem_2rem]';

/** A field that is edited in place inside the sheet: a tint at rest, the field's halo on focus, no outline. */
export const QUIET_FIELD =
	'h-8 w-full min-w-0 rounded-md bg-foreground/[0.04] px-2.5 text-base text-foreground outline-none transition-colors placeholder:text-muted-foreground/75 hover:bg-foreground/[0.06] focus-visible:bg-card focus-visible:ring-[3px] focus-visible:ring-ring/25 md:text-[13px]';

export const FIELD_LABEL = 'text-xs font-medium text-muted-foreground';

export const QUIET_LINK =
	'rounded-sm text-[13px] font-medium text-primary-ink underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50';
