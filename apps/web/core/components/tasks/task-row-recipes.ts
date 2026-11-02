/**
 * Shared geometry of task rows in a list (profile tabs, daily plan views): the surface that holds them, the label of
 * a group above it, the row's own grid and the mark of the task being tracked. A row lays itself out from the
 * surface's width, so the surface is the container.
 */

const TASK_LIST_SURFACE_LOOK =
	'overflow-clip rounded-xl bg-card hairline-ring ring-border shadow-[0_1px_2px_rgb(0_0_0/0.04)] hairline-divide-y divide-border';

export const TASK_LIST_SURFACE = `@container ${TASK_LIST_SURFACE_LOOK}`;

/**
 * A list whose rows can be dragged. A CSS container becomes the containing block of fixed descendants, and the drag
 * library lifts the dragged row with `position: fixed`, so here each row is its own container and the list is not.
 */
export const DRAGGABLE_TASK_LIST_SURFACE = TASK_LIST_SURFACE_LOOK;

export const DRAGGABLE_TASK_ROW_CONTAINER = '@container';

export const TASK_GROUP_LABEL = 'flex min-h-8 items-center gap-2 text-xs font-medium text-muted-foreground';

export const TASK_GROUP_COUNT =
	'rounded-sm bg-foreground/5 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground';

export const TASK_GROUP_STACK = 'flex flex-col gap-2';

export const TASK_LIST_STACK = 'flex flex-col gap-6';

/**
 * The surface of the task being tracked now: a fine brand hairline and a shadow tinted with the brand, the same lift
 * as the profile's timer card, so the running task stands out without a bar on its edge.
 */
export const CURRENT_TASK_SURFACE =
	'@container overflow-clip rounded-xl bg-card hairline-ring ring-primary/25 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_8px_24px_-12px_hsl(var(--primary)/0.22)]';

export const TASK_ROW_SKELETON_BAR = 'animate-pulse rounded-full bg-foreground/[0.06]';

/**
 * One row, one DOM for every width. From a 64rem surface: one 52px line of timer, task, chips, a flexible gap, worked,
 * detail, status and menu, the fixed columns aligned from row to row. Under it: timer, task and menu on the first
 * line, the rest wrapping on a second line under the title.
 */
export const TASK_ROW =
	"relative grid grid-cols-[2rem_minmax(0,1fr)_1.75rem] items-center gap-x-2 gap-y-1.5 px-3 py-2.5 [grid-template-areas:'timer_task_menu'_'._meta_meta'] @5xl:min-h-13 @5xl:grid-cols-[2rem_minmax(12rem,max-content)_minmax(0,max-content)_minmax(0,1fr)_8.5rem_13rem_10rem_1.75rem] @5xl:gap-x-3 @5xl:py-1.5 @5xl:[grid-template-areas:'timer_task_chips_._worked_detail_status_menu']";

/** The 32px timer column; empty when the viewer has no timer on the row, so the titles stay aligned. */
export const TASK_ROW_TIMER_CELL = 'flex size-8 items-center justify-center [grid-area:timer]';

export const TASK_ROW_TASK_CELL = 'flex min-w-0 items-center gap-2 [grid-area:task]';

/** The second line under 64rem; from there its cells take their own columns of the row. */
export const TASK_ROW_META = 'flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 [grid-area:meta] @5xl:contents';

/** The property chips' strip is marked so the cell leaves the line when the task has no chip at all. */
export const TASK_ROW_CHIP_STRIP_MARK = 'task-row-chip-strip';

export const TASK_ROW_CHIPS_CELL =
	'min-w-0 max-w-full [grid-area:chips] empty:hidden [&:has(.task-row-chip-strip:empty)]:hidden';

/** Chips at 20px inside the strip, reached from outside because the strip draws them itself. */
export const TASK_ROW_CHIP_STRIP = `${TASK_ROW_CHIP_STRIP_MARK} h-5 space-x-1 [&>div]:h-5 [&>div]:gap-1 [&>div]:rounded-[5px] [&>div]:px-1.5 [&>div]:text-[11px] [&_[data-slot=task-property-icon]]:size-3! [&_img]:size-3! [&_svg]:size-3!`;

export const TASK_ROW_WORKED_CELL = 'min-w-0 [grid-area:worked]';

/** Today and total side by side on the second line, stacked in their column on one line. */
export const TASK_ROW_TIMES = 'flex gap-3 @5xl:flex-col @5xl:gap-0.5';

export const TASK_ROW_DETAIL_CELL = 'w-48 min-w-0 max-w-full [grid-area:detail] @5xl:w-auto';

export const TASK_ROW_STATUS_CELL = 'ml-auto w-40 min-w-0 max-w-full [grid-area:status] @5xl:ml-0 @5xl:w-auto';

export const TASK_ROW_MENU_CELL = 'flex justify-center [grid-area:menu]';
