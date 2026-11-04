/** Base UI marks an open trigger with `data-popup-open`. */
export const VALUE_BUTTON =
	'-mx-1.5 inline-flex h-7 min-w-0 max-w-full cursor-pointer items-center gap-1.5 rounded-md px-1.5 text-[13px] text-foreground outline-none transition-colors hover:bg-foreground/5 focus-visible:ring-[3px] focus-visible:ring-ring/25 data-popup-open:bg-foreground/5 [&_svg]:size-3.5 [&_svg]:shrink-0';

export const EMPTY_VALUE = 'text-muted-foreground/80';

/** Dashed means "add" in this app: an empty slot or an add affordance. */
export const ADD_ROUND_BUTTON =
	'inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full hairline-border border-dashed border-foreground/30 text-muted-foreground outline-none transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25 data-popup-open:bg-foreground/5 [&_svg]:size-3.5';

export const VALUE_CHIP =
	'inline-flex h-6 max-w-48 min-w-0 items-center gap-1.5 bg-foreground/[0.04] text-xs font-medium text-foreground';

export const PERSON_CHIP = 'rounded-full pr-1 pl-0.5';

export const ENTITY_CHIP = 'rounded-md pr-1 pl-1';

export const CHIP_REMOVE_BUTTON =
	'inline-flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-foreground/10 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25 [&_svg]:size-3';

export const FIELD_ERROR = 'basis-full text-xs text-destructive-ink';

export const INLINE_FIELD =
	'-mx-1.5 h-7 w-full min-w-0 rounded-md bg-transparent px-1.5 text-[13px] text-foreground outline-none transition-[background-color,box-shadow] placeholder:text-muted-foreground/70 hover:bg-foreground/[0.03] focus:bg-card focus:shadow-sm focus:shadow-black/10 focus:hairline-ring focus:ring-foreground/15 aria-invalid:ring-destructive/40';

export const PANEL_LABEL = 'text-xs font-medium text-muted-foreground';
