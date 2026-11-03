export {
	ADD_ROW_RECIPE as DETAIL_ADD_ROW,
	EMPTY_VALUE_RECIPE as DETAIL_EMPTY_VALUE
} from '@/core/components/common/surface-recipes';

export const DETAIL_SECTION_TITLE = 'text-[13px] font-semibold text-foreground';

export const DETAIL_SECTION_COUNT = 'text-xs font-medium tabular-nums text-muted-foreground';

export const DETAIL_MUTED_TEXT = 'text-[13px] text-muted-foreground';

export const DETAIL_LIST_SURFACE =
	'overflow-hidden rounded-xl bg-card hairline-ring ring-border hairline-divide-y divide-border';

export const DETAIL_GHOST_ACTION =
	'inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2 text-[13px] font-medium text-muted-foreground outline-none transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25 aria-expanded:bg-foreground/5 aria-expanded:text-foreground disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-3.5 [&_svg]:shrink-0';

export const DETAIL_ICON_ACTION =
	'inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25 aria-expanded:bg-foreground/5 aria-expanded:text-foreground disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-4';

export const DETAIL_ROW_ACTION =
	'opacity-0 transition-opacity group-hover/row:opacity-100 group-focus-within/row:opacity-100 [@media(hover:none)]:opacity-100';

export const DETAIL_ISSUE_ROW =
	'group/row flex min-h-9 items-center gap-2 pr-1.5 text-[13px] transition-colors hover:bg-foreground/[0.025]';

export const DETAIL_TASK_CHIP =
	'inline-flex h-7 max-w-full min-w-0 items-center gap-1.5 rounded-md bg-card px-2 text-xs font-medium text-foreground hairline-ring ring-border shadow-[0_1px_1px_rgb(0_0_0/0.04)] outline-none transition-colors hover:bg-foreground/[0.03] focus-visible:ring-[3px] focus-visible:ring-ring/25';
