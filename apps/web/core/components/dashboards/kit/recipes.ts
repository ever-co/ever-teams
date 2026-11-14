/** The one surface of a dashboard block: white on a hairline, the shadow of the member cards. */
export const DASHBOARD_SURFACE =
	'overflow-clip rounded-xl bg-card hairline-ring ring-border shadow-[0_1px_2px_rgb(0_0_0/0.04)]';

export const SECTION_HEADER = 'flex min-h-11 flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-2';

export const SECTION_TITLE = 'text-[13px] font-medium text-foreground';

export const SECTION_META = 'text-xs tabular-nums text-muted-foreground';

export const SKELETON_BAR = 'animate-pulse rounded-full bg-foreground/[0.06]';

export const NUMBER_CELL = 'text-right text-[13px] tabular-nums';

/** Gaps between the blocks of a dashboard page; the page panel gives the outer padding. */
export const DASHBOARD_STACK = 'flex flex-col gap-4 pb-6';

export const TOOLBAR_SEPARATOR = 'h-4 w-px shrink-0 bg-border max-sm:hidden';

/** A pill control of a toolbar: the period picker and the pickers beside it share its frame and its trigger. */
export const PILL_GROUP =
	'inline-flex h-8 shrink-0 items-center rounded-full bg-card p-0.5 hairline-ring ring-foreground/10 shadow-[0_1px_2px_rgb(0_0_0/0.06)] dark:bg-foreground/5';

export const PILL_TRIGGER =
	'inline-flex h-7 min-w-0 items-center gap-1.5 rounded-full px-2 text-[13px] font-medium text-foreground outline-none transition-colors hover:bg-foreground/5 focus-visible:ring-[3px] focus-visible:ring-ring/25 data-[state=open]:bg-foreground/5 data-popup-open:bg-foreground/5 [&_svg]:size-4 [&_svg]:text-muted-foreground';
