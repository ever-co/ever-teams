/**
 * Linear's action menu, for the menus that are not built on `DropdownMenu` (Headless UI popovers and menus, Base UI
 * popovers): 32px rows of 13px text behind a muted 16px icon, hairline separators between groups, the destructive
 * row last in its own ink.
 */
export const MENU_SURFACE =
	'rounded-xl bg-popover p-1 text-popover-foreground hairline-ring ring-border shadow-md shadow-black/6.5';

export const MENU_ROW =
	"flex h-8 w-full cursor-pointer select-none items-center gap-2.5 whitespace-nowrap rounded-md px-2 text-left text-[13px] font-normal text-foreground outline-none transition-colors hover:bg-foreground/5 focus-visible:bg-foreground/5 data-focus:bg-foreground/5 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg:not([class*='text-'])]:text-muted-foreground";

export const MENU_ROW_DESTRUCTIVE =
	"text-destructive-ink hover:bg-destructive/10 focus-visible:bg-destructive/10 data-focus:bg-destructive/10 [&_svg:not([class*='text-'])]:text-destructive-ink";

export const MENU_SEPARATOR = '-mx-1 my-1 h-px bg-border';

/** A Headless UI panel anchored to its trigger is portalled, so a card or a scroll area can no longer cut it. */
export const MENU_ANCHORED_PANEL =
	'z-[1000] min-w-52 outline-none transition duration-100 ease-out data-closed:scale-95 data-closed:opacity-0';

export const MENU_ANCHOR = { to: 'bottom end', gap: 6 } as const;

/**
 * Tooltips are small bubbles: the popover's outline and shadow, a vertical gradient from the popover to a touch of
 * the brand hue, and an arrow toward the element (`TooltipBubbleArrow`), the hint bubbles of the user's portfolio.
 * The two gradient stops are variables so the arrow takes the colour of the edge it leaves from.
 */
export const TOOLTIP_SURFACE =
	'max-w-64 rounded-lg [--tooltip-top:hsl(var(--popover))] [--tooltip-bottom:color-mix(in_oklab,hsl(var(--popover)),hsl(var(--primary))_9%)] bg-linear-to-b from-(--tooltip-top) to-(--tooltip-bottom) px-2 py-1 text-xs font-medium normal-case leading-snug tracking-normal text-balance text-popover-foreground hairline-ring ring-border shadow-md shadow-black/6.5';

/** The arrow's fill per side: under a bubble above the element it leaves from the bottom stop, and so on. */
export const TOOLTIP_ARROW_FILL =
	'fill-(--tooltip-bottom) data-[side=bottom]:fill-(--tooltip-top) [&_polyline]:stroke-border';
