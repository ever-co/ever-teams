/**
 * The workspace's rule for rounding durations in reports, exports and invoices. Gauzy stores it on the organization
 * (`durationRoundingInterval` in minutes and `durationRoundingDirection`) and rounds nothing itself: stored time never
 * changes, and Timesheets, the Work diary and the calendar always show the time as tracked.
 *
 * Each entry is rounded on its own, then totals add the rounded entries, so a total always matches its lines.
 */
export const DURATION_ROUNDING_INTERVALS = [1, 5, 6, 10, 15, 30, 60] as const;

export type DurationRoundingInterval = (typeof DURATION_ROUNDING_INTERVALS)[number];

export const DURATION_ROUNDING_DIRECTIONS = ['UP', 'DOWN', 'NEAREST'] as const;

export type DurationRoundingDirection = (typeof DURATION_ROUNDING_DIRECTIONS)[number];

export interface DurationRoundingRule {
	intervalMinutes: DurationRoundingInterval;
	direction: DurationRoundingDirection;
}

/** The two fields as an organization carries them; an API without them carries neither. */
export interface StoredDurationRounding {
	durationRoundingInterval?: unknown;
	durationRoundingDirection?: unknown;
}

const SECONDS_PER_MINUTE = 60;

function intervalOf(stored: unknown): DurationRoundingInterval | null {
	const minutes = Number(stored);
	const isSet = stored !== null && stored !== undefined && stored !== '';
	if (!isSet) {
		return null;
	}
	const allowed = DURATION_ROUNDING_INTERVALS.find((interval) => interval === minutes);
	return allowed ?? null;
}

function directionOf(stored: unknown): DurationRoundingDirection | null {
	const allowed = DURATION_ROUNDING_DIRECTIONS.find((direction) => direction === stored);
	return allowed ?? null;
}

/**
 * The organization's rule, or null for no rounding: both fields are needed, as Gauzy stores them together, and a value
 * this app does not know rounds nothing rather than something unexpected.
 */
export function durationRoundingRuleOf(
	organization: StoredDurationRounding | null | undefined
): DurationRoundingRule | null {
	const intervalMinutes = intervalOf(organization?.durationRoundingInterval);
	const direction = directionOf(organization?.durationRoundingDirection);
	const isComplete = intervalMinutes !== null && direction !== null;
	if (!isComplete) {
		return null;
	}
	return { intervalMinutes, direction };
}

function stepsOf(seconds: number, step: number, direction: DurationRoundingDirection): number {
	const steps = seconds / step;
	if (direction === 'UP') {
		return Math.ceil(steps);
	}
	if (direction === 'DOWN') {
		return Math.floor(steps);
	}
	return Math.round(steps);
}

/** One entry's duration in seconds, rounded by the rule; without a rule, the duration as tracked. */
export function roundedSecondsOf(seconds: number, rule: DurationRoundingRule | null): number {
	if (!rule) {
		return seconds;
	}
	const isEmpty = !Number.isFinite(seconds) || seconds <= 0;
	if (isEmpty) {
		return seconds;
	}
	const step = rule.intervalMinutes * SECONDS_PER_MINUTE;
	return stepsOf(seconds, step, rule.direction) * step;
}

/** The total of some entries, each rounded first. */
export function roundedTotalOf(entrySeconds: ReadonlyArray<number>, rule: DurationRoundingRule | null): number {
	let total = 0;
	for (const seconds of entrySeconds) {
		total += roundedSecondsOf(seconds, rule);
	}
	return total;
}

/** Whether a rule changes what a page shows, so the page says it shows rounded time. */
export function roundingChangesOf(rule: DurationRoundingRule | null): rule is DurationRoundingRule {
	return rule !== null;
}
