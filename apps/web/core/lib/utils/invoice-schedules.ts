import type { WeekStart } from '@/core/lib/utils/dashboard-period';
import type {
	InvoiceScheduleFrequency,
	InvoiceScheduleInput,
	InvoiceScheduleRunReason,
	InvoiceScheduleRunStatus,
	TInvoiceSchedule,
	TInvoiceScheduleRun
} from '@/core/types/schemas/organization/invoice-schedule.schema';

/** How a run reads at a glance. */
export type InvoiceScheduleRunTone = 'success' | 'neutral' | 'warning' | 'danger' | 'pending';

const RUN_TONES: Record<InvoiceScheduleRunStatus, InvoiceScheduleRunTone> = {
	CLAIMED: 'pending',
	DRAFTED: 'neutral',
	SENT: 'success',
	NOT_SENT: 'warning',
	NO_TIME: 'neutral',
	FAILED: 'danger'
};

export function invoiceScheduleRunToneOf(status: InvoiceScheduleRunStatus): InvoiceScheduleRunTone {
	return RUN_TONES[status];
}

/** Whether the schedule makes no invoice until it is resumed. */
export function isPausedSchedule(schedule: Pick<TInvoiceSchedule, 'pausedAt'>): boolean {
	return Boolean(schedule.pausedAt);
}

const DAY_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** The first day of the month a day key falls in. */
export function firstDayOfMonthOf(dayKey: string): string {
	const match = DAY_KEY_PATTERN.exec(dayKey);
	if (!match) {
		return dayKey;
	}
	return `${match[1]}-${match[2]}-01`;
}

const DAYS_PER_WEEK = 7;

/** The first day of the week a day key falls in, the week starting on `weekStart` (0 for Sunday, 1 for Monday). */
function firstDayOfWeekOf(dayKey: string, weekStart: WeekStart): string {
	const match = DAY_KEY_PATTERN.exec(dayKey);
	if (!match) {
		return dayKey;
	}
	const day = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
	const daysIntoWeek = (day.getUTCDay() - weekStart + DAYS_PER_WEEK) % DAYS_PER_WEEK;
	day.setUTCDate(day.getUTCDate() - daysIntoWeek);
	return day.toISOString().slice(0, 10);
}

/**
 * The first day a new schedule of that frequency starts from: the first day of this month, or of this week as the
 * workspace counts its weeks (#5264), so its periods are the months or the weeks every report of the workspace shows.
 */
export function defaultStartDayOf(frequency: InvoiceScheduleFrequency, todayKey: string, weekStart: WeekStart): string {
	return frequency === 'MONTHLY' ? firstDayOfMonthOf(todayKey) : firstDayOfWeekOf(todayKey, weekStart);
}

/**
 * What a new schedule starts with: every month from the first day of this month, by project, kept as a draft. Its
 * first invoice is then this month's, made on the first day of the next.
 */
export function defaultInvoiceScheduleInput(todayKey: string): InvoiceScheduleInput {
	return {
		frequency: 'MONTHLY',
		startDay: firstDayOfMonthOf(todayKey),
		grouping: 'PROJECT',
		sendInvoice: false
	};
}

/** The form's fields for a saved schedule. */
export function invoiceScheduleInputOf(schedule: TInvoiceSchedule): InvoiceScheduleInput {
	return {
		frequency: schedule.frequency,
		startDay: schedule.startDay,
		grouping: schedule.grouping,
		sendInvoice: schedule.sendInvoice
	};
}

/** Whether a text is a day that exists, `YYYY-MM-DD`. */
export function isRealDayKey(dayKey: string): boolean {
	const match = DAY_KEY_PATTERN.exec(dayKey);
	if (!match) {
		return false;
	}
	const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
	return date.toISOString().slice(0, 10) === dayKey;
}

/** What became of the schedule a form opened on: still the client's, replaced by another one, or deleted. */
export type OpenedScheduleFate = 'current' | 'replaced' | 'deleted';

/**
 * What became of the schedule a form opened on, by the latest read of its client's schedule: a client has one at
 * most, so another one there replaced it, and none there means it was deleted.
 */
export function openedScheduleFateOf(
	openedScheduleId: string,
	latest: Pick<TInvoiceSchedule, 'id'> | null
): OpenedScheduleFate {
	if (!latest) {
		return 'deleted';
	}
	return latest.id === openedScheduleId ? 'current' : 'replaced';
}

/**
 * A change that was not made: the schedule its form opened on was deleted, or replaced by another, since. Nothing of
 * the client's schedule changed, and the form says which.
 */
export class OpenedScheduleGoneError extends Error {
	readonly fate: Exclude<OpenedScheduleFate, 'current'>;

	constructor(fate: Exclude<OpenedScheduleFate, 'current'>) {
		super(`The billing schedule this change was made on was ${fate} since`);
		this.name = 'OpenedScheduleGoneError';
		this.fate = fate;
	}
}

/** What the form changed of a saved schedule; nothing when it changed nothing. */
export function changedScheduleFieldsOf(
	saved: InvoiceScheduleInput,
	edited: InvoiceScheduleInput
): Partial<InvoiceScheduleInput> {
	const changes: Partial<InvoiceScheduleInput> = {};
	if (saved.frequency !== edited.frequency) {
		changes.frequency = edited.frequency;
	}
	if (saved.startDay !== edited.startDay) {
		changes.startDay = edited.startDay;
	}
	if (saved.grouping !== edited.grouping) {
		changes.grouping = edited.grouping;
	}
	if (saved.sendInvoice !== edited.sendInvoice) {
		changes.sendInvoice = edited.sendInvoice;
	}
	return changes;
}

const SECONDS_PER_HOUR = 3600;

/** The billable hours of the period a run left out of its invoice, to the hundredth; 0 when it left none. */
export function leftOutHoursOf(run: Pick<TInvoiceScheduleRun, 'leftOutSeconds'>): number {
	const seconds = run.leftOutSeconds ?? 0;
	if (seconds <= 0) {
		return 0;
	}
	return Math.round((seconds / SECONDS_PER_HOUR) * 100) / 100;
}

/** A reason a run's line explains in a sentence: the time left out is told by its hours instead. */
type ExplainedRunReason = Exclude<InvoiceScheduleRunReason, 'TIME_LEFT_OUT'>;

/** The reasons a run's line explains: a reason this app does not know explains nothing. */
const EXPLAINED_RUN_REASONS: ReadonlyArray<ExplainedRunReason> = [
	'NO_BILLABLE_TIME',
	'NO_PRICED_TIME',
	'AUTHOR_CANNOT_INVOICE',
	'CLIENT_HAS_NO_EMAIL',
	'EMAIL_NOT_SENT',
	'INVOICE_NOT_SAVED'
];

/** The reason a run's line explains, or null: the time left out is told apart, by its hours. */
export function explainedReasonOf(run: Pick<TInvoiceScheduleRun, 'reason'>): ExplainedRunReason | null {
	const reason = run.reason ?? null;
	return EXPLAINED_RUN_REASONS.find((explained) => explained === reason) ?? null;
}

/** Schedules by their next run day, the soonest first; the paused ones last, whatever next period they state. */
export function compareSchedulesByNextRun(first: TInvoiceSchedule, second: TInvoiceSchedule): number {
	const isFirstPaused = isPausedSchedule(first);
	if (isFirstPaused !== isPausedSchedule(second)) {
		return isFirstPaused ? 1 : -1;
	}
	const firstDay = first.nextPeriod?.runDay ?? '9999-12-31';
	const secondDay = second.nextPeriod?.runDay ?? '9999-12-31';
	if (firstDay !== secondDay) {
		return firstDay.localeCompare(secondDay);
	}
	const firstName = first.organizationContact?.name ?? '';
	const secondName = second.organizationContact?.name ?? '';
	return firstName.localeCompare(secondName);
}
