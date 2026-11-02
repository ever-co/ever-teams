/**
 * Fills and borders, by meaning (DESIGN-SYSTEM, "Fills and borders"): a dashed hairline is a slot that invites an
 * addition, a value that is not set yet is quiet muted text in its place, never a box.
 */

/** The last row of a list, to add one more: full width, dashed, brighter on hover. */
export const ADD_ROW_RECIPE =
	'flex h-10 w-full items-center justify-center gap-2 rounded-xl hairline-border border-dashed border-foreground/20 text-[13px] text-muted-foreground outline-none transition-colors hover:border-foreground/35 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25 [&_svg]:size-3.5';

/** A value not set yet, where the value would be: "+ Add date", "+ Estimate". */
export const EMPTY_VALUE_RECIPE =
	'inline-flex h-7 min-w-0 items-center gap-1.5 rounded-md px-1.5 -ml-1.5 text-[13px] text-muted-foreground outline-none transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25 aria-expanded:bg-foreground/5 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-3.5 [&_svg]:shrink-0';

/**
 * An editable value that stands on its own (an estimate in a card or a plan row) shows it is editable at rest, since
 * touch screens have no hover: a small, light dashed outline, stronger on hover, tinted on press.
 */
const EDITABLE_FIELD_BASE =
	'group/field inline-flex h-6 shrink-0 items-center gap-1 rounded-md px-1.5 text-[13px] tabular-nums hairline-border border-dashed border-foreground/20 outline-none transition-[background-color,border-color,color] hover:border-foreground/35 hover:bg-foreground/[0.03] active:bg-foreground/[0.06] focus-visible:ring-[3px] focus-visible:ring-ring/25 data-[state=open]:border-primary/40 data-[state=open]:bg-foreground/[0.03] disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-3 [&_svg]:shrink-0';

/** The field holding its value, with its pencil. */
export const VALUE_FIELD_RECIPE = `${EDITABLE_FIELD_BASE} font-medium text-foreground`;

/** The same field with no value yet: "+ …" in muted text. */
export const EMPTY_FIELD_RECIPE = `${EDITABLE_FIELD_BASE} text-muted-foreground hover:text-foreground`;

/**
 * The toasts' material, quieter: a card on a hairline, a brand wash from the top corner, a shadow tinted with the
 * brand and a white inner rim. The plans calendar and the "working on now" card of a profile stand on it.
 */
export const BRAND_WASH_PANEL = [
	'relative rounded-2xl bg-card hairline-ring ring-border',
	'shadow-[0_1px_2px_rgb(0_0_0/0.04),0_8px_24px_-12px_hsl(var(--primary)/0.18)]',
	'bg-[radial-gradient(120%_70%_at_0%_0%,hsl(var(--primary)/0.07),transparent_60%)]',
	'before:pointer-events-none before:absolute before:inset-px before:rounded-[15px] before:shadow-[inset_0_1px_0_rgb(255_255_255/0.7)] dark:before:shadow-[inset_0_1px_0_rgb(255_255_255/0.05)]'
].join(' ');
