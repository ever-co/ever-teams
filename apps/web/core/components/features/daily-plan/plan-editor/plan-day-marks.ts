const DAY_MARK =
	'relative after:pointer-events-none after:absolute after:bottom-1 after:left-1/2 after:size-1 after:-translate-x-1/2 after:rounded-full aria-selected:after:bg-primary-foreground';

/** A small dot under a calendar day that already has a plan; it turns light on the picked day. */
export const PLANNED_DAY_MARK = `${DAY_MARK} after:bg-primary`;

/** The same dot for a plan whose day is over. */
export const PAST_PLAN_DAY_MARK = `${DAY_MARK} after:bg-warning`;
