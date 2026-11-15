import { formatISO, isValid } from 'date-fns';
import type { RateSaveOutcome } from '@/core/types/schemas/organization/rates.schema';

/**
 * What a rate change without a day does to the time already tracked in the current organization: with
 * `timeLogsKeepTheirRates` on, each entry keeps the rate it was tracked at; off (Gauzy's default), all of it takes the
 * new rate, as before entries stored their rates.
 */
export type PastTimeRule = 'keepsItsRate' | 'takesNewRate';

/** The answers to "Apply to time already tracked?". */
export type RateApplyChoice = 'fromNow' | 'allTime' | 'fromDay';

const DAY_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * The organization's rule, or null for a Gauzy that does not store rates on time entries (it answers without the
 * field) and while the organization is not read: the rate editors then ask nothing and save as before.
 */
export function pastTimeRuleOf(
	organization: { timeLogsKeepTheirRates?: boolean | null } | null | undefined
): PastTimeRule | null {
	if (!organization) {
		return null;
	}
	const statesRule = 'timeLogsKeepTheirRates' in organization;
	if (!statesRule) {
		return null;
	}
	const keepsItsRate = organization.timeLogsKeepTheirRates === true;
	if (keepsItsRate) {
		return 'keepsItsRate';
	}
	return 'takesNewRate';
}

/** The answers offered, the one a save without a day stands for first. */
export function rateApplyChoicesOf(rule: PastTimeRule): RateApplyChoice[] {
	if (rule === 'keepsItsRate') {
		return ['fromNow', 'fromDay'];
	}
	return ['allTime', 'fromDay'];
}

/** The answer shown: the one picked while the rule offers it, else the first one. */
export function rateApplyChoiceOf(rule: PastTimeRule | null, picked: RateApplyChoice | null): RateApplyChoice | null {
	if (!rule) {
		return null;
	}
	const choices = rateApplyChoicesOf(rule);
	const isOffered = picked !== null && choices.includes(picked);
	if (isOffered) {
		return picked;
	}
	return choices[0];
}

/**
 * The start of a day picked in a date field (`YYYY-MM-DD`), where the editor is, with its offset: Gauzy reads a bare
 * date as UTC midnight, which would leave out or take in the first hours of the day elsewhere.
 */
export function startOfPickedDayOf(day: string): string | null {
	const match = DAY_KEY.exec(day);
	if (!match) {
		return null;
	}
	const year = Number(match[1]);
	const monthIndex = Number(match[2]) - 1;
	const dayOfMonth = Number(match[3]);
	const start = new Date(year, monthIndex, dayOfMonth);
	const isSameDay = isValid(start) && start.getMonth() === monthIndex && start.getDate() === dayOfMonth;
	if (!isSameDay) {
		return null;
	}
	return formatISO(start);
}

/**
 * The day "Yes, all of it" sends: before any time entry. Gauzy re-prices a change without a day on invoiced time too,
 * while a change with one leaves the time a live invoice (or an estimate that is neither void nor rejected) bills at
 * the price it was billed at: time already billed never takes a new rate.
 */
export const ALL_TIME_APPLY_FROM = '1970-01-01T00:00:00Z';

export interface RateApplyFrom {
	/** Sent for "all of it" and "from a date": without it, "from now on", Gauzy applies the organization's rule. */
	applyFrom?: string;
	/** "From a date" is picked without a day: nothing is saved until one is. */
	isDayMissing: boolean;
}

export function applyFromOfChoice(choice: RateApplyChoice, day: string): RateApplyFrom {
	if (choice === 'fromNow') {
		return { isDayMissing: false };
	}
	if (choice === 'allTime') {
		return { isDayMissing: false, applyFrom: ALL_TIME_APPLY_FROM };
	}
	const applyFrom = startOfPickedDayOf(day);
	if (!applyFrom) {
		return { isDayMissing: true };
	}
	return { isDayMissing: false, applyFrom };
}

export interface RateSavedDescription {
	key: 'rates.ENTRIES_REPRICED' | 'rates.PAST_TIME_KEPT';
	count: number;
}

/** What the confirmation of a saved rate says of the time already tracked, when it is known. */
export function rateSavedDescriptionOf(choice: RateApplyChoice, outcome: RateSaveOutcome): RateSavedDescription | null {
	if (outcome.repricedTimeLogs !== null) {
		return { key: 'rates.ENTRIES_REPRICED', count: outcome.repricedTimeLogs };
	}
	if (choice === 'fromNow') {
		return { key: 'rates.PAST_TIME_KEPT', count: 0 };
	}
	return null;
}

const RATE_FIELDS = ['billRateValue', 'billRateCurrency', 'payRateValue', 'payRateCurrency'] as const;

/** Whether a save changes a rate that prices time: a weekly limit alone re-prices nothing and asks nothing. */
export function changesRateIn(changes: Partial<Record<(typeof RATE_FIELDS)[number], unknown>>): boolean {
	return RATE_FIELDS.some((field) => field in changes);
}
