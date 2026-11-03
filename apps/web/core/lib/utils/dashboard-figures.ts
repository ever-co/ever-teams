const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3600;

export interface DurationParts {
	hours: number;
	minutes: number;
}

export function durationPartsOf(seconds: number): DurationParts {
	const safeSeconds = Math.max(0, Math.round(seconds || 0));
	const hours = Math.floor(safeSeconds / SECONDS_PER_HOUR);
	const minutes = Math.floor((safeSeconds % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE);
	return { hours, minutes };
}

/** The app's one way of writing a duration in figures and reports: `6h 18m`, `0h 35m`. */
export function formatDurationShort(seconds: number): string {
	const { hours, minutes } = durationPartsOf(seconds);
	return `${hours}h ${minutes}m`;
}

/** A tick or limit label: whole hours read `8h`, anything else falls back to the short duration. */
export function formatHoursLabel(seconds: number): string {
	const { hours, minutes } = durationPartsOf(seconds);
	if (minutes === 0) {
		return `${hours}h`;
	}
	return `${hours}h ${minutes}m`;
}

export function formatClockDuration(seconds: number): string {
	const safeSeconds = Math.max(0, Math.round(seconds || 0));
	const hours = Math.floor(safeSeconds / SECONDS_PER_HOUR);
	const minutes = Math.floor((safeSeconds % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE);
	const remainingSeconds = safeSeconds % SECONDS_PER_MINUTE;
	const paddedMinutes = String(minutes).padStart(2, '0');
	const paddedSeconds = String(remainingSeconds).padStart(2, '0');
	return `${hours}:${paddedMinutes}:${paddedSeconds}`;
}

export function percentOf(part: number, whole: number): number {
	if (!whole) {
		return 0;
	}
	return (part / whole) * 100;
}

/** `47%`, or the reader's own form (`47 %` in French, `٪47` in Arabic) when the locale is given. */
export function formatPercent(value: number, locale?: string): string {
	const rounded = Math.round(value);
	if (!locale) {
		return `${rounded}%`;
	}
	return new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 }).format(rounded / 100);
}

/** Hour steps that keep a time axis to three or four lines whatever the longest day. */
const HOUR_STEPS = [1, 2, 4, 6, 8, 12, 24, 48, 96, 168];
const MAX_TICK_COUNT = 4;

export interface TimeAxis {
	max: number;
	ticks: number[];
}

export function timeAxisOf(maxSeconds: number): TimeAxis {
	const maxHours = Math.max(maxSeconds, 0) / SECONDS_PER_HOUR;
	const fittingStep = HOUR_STEPS.find((step) => maxHours <= step * MAX_TICK_COUNT);
	const step = fittingStep ?? HOUR_STEPS[HOUR_STEPS.length - 1];
	const tickCount = Math.max(1, Math.ceil(maxHours / step));
	const ticks: number[] = [];
	for (let index = 0; index <= tickCount; index += 1) {
		ticks.push(index * step * SECONDS_PER_HOUR);
	}
	const max = ticks[ticks.length - 1];
	return { max, ticks };
}

/** Plain numbers (counts, amounts) get the same restraint: three or four lines on round values. */
export function valueAxisOf(maxValue: number): TimeAxis {
	const safeMax = Math.max(maxValue, 0);
	if (safeMax === 0) {
		return { max: 1, ticks: [0, 1] };
	}
	const roughStep = safeMax / MAX_TICK_COUNT;
	const magnitude = 10 ** Math.floor(Math.log10(roughStep));
	const normalized = roughStep / magnitude;
	const niceFactor = [1, 2, 2.5, 5, 10].find((factor) => normalized <= factor) ?? 10;
	const step = niceFactor * magnitude;
	const tickCount = Math.ceil(safeMax / step);
	const ticks: number[] = [];
	for (let index = 0; index <= tickCount; index += 1) {
		ticks.push(index * step);
	}
	return { max: ticks[ticks.length - 1], ticks };
}

export interface ShareRow<T> {
	key: string;
	item: T | null;
	value: number;
	share: number;
	/** The "N other ..." bucket that closes a capped list. */
	isOther: boolean;
	otherCount: number;
}

/** The leading items with their share of the total, the rest merged into one closing bucket. */
export function shareRowsOf<T>(
	items: readonly T[],
	valueOf: (item: T) => number,
	keyOf: (item: T) => string,
	leadingCount: number
): ShareRow<T>[] {
	const sorted = [...items].sort((first, second) => valueOf(second) - valueOf(first));
	const total = sorted.reduce((sum, item) => sum + valueOf(item), 0);
	const leading = sorted.slice(0, leadingCount);
	const rest = sorted.slice(leadingCount);
	const rows: ShareRow<T>[] = leading.map((item) => ({
		key: keyOf(item),
		item,
		value: valueOf(item),
		share: percentOf(valueOf(item), total),
		isOther: false,
		otherCount: 0
	}));
	const restValue = rest.reduce((sum, item) => sum + valueOf(item), 0);
	const hasRest = rest.length > 0;
	if (hasRest) {
		rows.push({
			key: 'other',
			item: null,
			value: restValue,
			share: percentOf(restValue, total),
			isOther: true,
			otherCount: rest.length
		});
	}
	return rows;
}

export type LimitVerdict = 'within' | 'near' | 'over';

/** From this share of the limit on, a member is close enough to it that the report says so. */
export const NEAR_LIMIT_SHARE = 90;

export function limitVerdictOf(usedSeconds: number, limitSeconds: number): LimitVerdict {
	const share = percentOf(usedSeconds, limitSeconds);
	if (share > 100) {
		return 'over';
	}
	if (share >= NEAR_LIMIT_SHARE) {
		return 'near';
	}
	return 'within';
}

/** The bands the team dashboard already coloured its activity with: up to 20% low, up to 50% medium. */
export type ActivityBand = 'low' | 'medium' | 'high';

const LOW_ACTIVITY_CEILING = 20;
const MEDIUM_ACTIVITY_CEILING = 50;

export function activityBandOf(percent: number): ActivityBand {
	if (percent <= LOW_ACTIVITY_CEILING) {
		return 'low';
	}
	if (percent <= MEDIUM_ACTIVITY_CEILING) {
		return 'medium';
	}
	return 'high';
}
