/**
 * The entry's toggles beside the timer, on the outline button: round, a white pill on a hairline with a muted glyph
 * at rest, the brand tint once their property is set. Their focus ring stands off the edge, as the start button's.
 */
export const TIMER_ENTRY_TOGGLE =
	'relative rounded-full text-muted-foreground hover:text-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-background aria-pressed:bg-primary/10 aria-pressed:text-primary-ink aria-pressed:shadow-none aria-pressed:ring-transparent aria-pressed:hover:bg-primary/15 aria-pressed:hover:text-primary-ink aria-pressed:focus-visible:ring-ring dark:aria-pressed:bg-primary/15 dark:aria-pressed:hover:bg-primary/20 data-filled:bg-primary/10 data-filled:text-primary-ink data-filled:ring-primary/30 data-filled:hover:bg-primary/15 data-filled:hover:text-primary-ink dark:data-filled:bg-primary/15 dark:data-filled:hover:bg-primary/20';

/** The glyph grows with the toggle, 45% of its diameter, and never drops under the 16px of the app's icons. */
export const TIMER_ENTRY_TOGGLE_GLYPH = 'size-[max(45%,1rem)]';

/** A tooltip on the timer answers a pause on the control, as the start button's does. */
export const TIMER_TOOLTIP_DELAY_MS = 400;
