/** The lane look of `kanban.tsx`, shared with its loading skeleton (a server component may import this). */
export const LANE_WIDTH = 'w-[18.5rem]';

/** Opaque so the sticky column header hides the cards scrolling under it; mixed on the card tone of the page panel. */
export const LANE_SURFACE =
	'bg-[color-mix(in_oklab,hsl(var(--foreground))_3%,hsl(var(--card)))] dark:bg-[color-mix(in_oklab,hsl(var(--foreground))_4%,hsl(var(--card)))]';
