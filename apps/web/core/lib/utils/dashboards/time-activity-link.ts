import { endOfDay, isValid, startOfDay } from 'date-fns';
import { localDayKeyOf } from '@/core/lib/utils/dashboard-export';
import {
	DEFAULT_PERIOD_PRESETS,
	type Period,
	type PeriodPresetKey,
	type WeekStart,
	periodOfPreset,
	presetOfPeriod
} from '@/core/lib/utils/dashboard-period';
import {
	EMPTY_STORED_TIME_ACTIVITY_FILTERS,
	type StoredTimeActivityFilterField,
	type StoredTimeActivityFilters
} from '@/core/lib/utils/dashboards/time-activity';

/**
 * The page link of Time & activity holds its whole view: the period, every filter and the grouping. The client and
 * billable filters and the grouping were already in it (`clients`, `billable`, `groupBy`); the period and the four
 * filters the page also keeps in the browser join them here, so a copied address opens the same report.
 */

/** A period that matches a preset is linked by its name, so "Last month" stays last month when the link is opened. */
export const TIME_ACTIVITY_PERIOD_PARAM = 'period';

/** Any other period is linked by its first and last day, `YYYY-MM-DD`. */
export const TIME_ACTIVITY_FROM_PARAM = 'from';

export const TIME_ACTIVITY_TO_PARAM = 'to';

const LINKED_FILTER_PARAMS: Record<StoredTimeActivityFilterField, string> = {
	teamIds: 'teams',
	employeeIds: 'members',
	projectIds: 'projects',
	taskIds: 'tasks'
};

const LINKED_FILTER_FIELDS = Object.keys(LINKED_FILTER_PARAMS) as StoredTimeActivityFilterField[];

const VALUE_SEPARATOR = ',';

const DAY_KEY_SHAPE = /^(\d{4})-(\d{2})-(\d{2})$/;

type LinkParams = Pick<URLSearchParams, 'get'>;

function isPeriodPreset(value: string): value is PeriodPresetKey {
	const presets: ReadonlyArray<string> = DEFAULT_PERIOD_PRESETS;
	return presets.includes(value);
}

/** A real calendar day written `YYYY-MM-DD`, as a local date; anything else is not a day. */
export function dayOfKey(value: string | null | undefined): Date | null {
	if (!value) {
		return null;
	}
	const match = DAY_KEY_SHAPE.exec(value);
	if (!match) {
		return null;
	}
	const year = Number(match[1]);
	const monthIndex = Number(match[2]) - 1;
	const dayOfMonth = Number(match[3]);
	const day = new Date(year, monthIndex, dayOfMonth);
	if (!isValid(day)) {
		return null;
	}
	const isSameDay = localDayKeyOf(day) === value;
	if (!isSameDay) {
		return null;
	}
	return day;
}

/** Two days in order, both included. */
export function periodOfDays(startKey: string | null | undefined, endKey: string | null | undefined): Period | null {
	const start = dayOfKey(startKey);
	const end = dayOfKey(endKey);
	if (!start || !end) {
		return null;
	}
	if (start > end) {
		return null;
	}
	return { from: startOfDay(start), to: endOfDay(end) };
}

/** The period the link names, or `null` when it names none (or one that is not a real period). */
export function periodOfLink(params: LinkParams, weekStartsOn: WeekStart, now = new Date()): Period | null {
	const preset = params.get(TIME_ACTIVITY_PERIOD_PARAM);
	if (preset && isPeriodPreset(preset)) {
		return periodOfPreset(preset, weekStartsOn, now);
	}
	return periodOfDays(params.get(TIME_ACTIVITY_FROM_PARAM), params.get(TIME_ACTIVITY_TO_PARAM));
}

/** A link that names a period holds the whole view: its filters, even none, are the view's filters. */
export function hasViewInLink(params: LinkParams, weekStartsOn: WeekStart): boolean {
	return periodOfLink(params, weekStartsOn) !== null;
}

/** Changes `params` in place: a preset period by its name, any other by its two days. */
export function writePeriodToLink(params: URLSearchParams, period: Period, weekStartsOn: WeekStart) {
	const preset = presetOfPeriod(period, DEFAULT_PERIOD_PRESETS, weekStartsOn);
	if (preset) {
		params.set(TIME_ACTIVITY_PERIOD_PARAM, preset);
		params.delete(TIME_ACTIVITY_FROM_PARAM);
		params.delete(TIME_ACTIVITY_TO_PARAM);
		return;
	}
	params.delete(TIME_ACTIVITY_PERIOD_PARAM);
	params.set(TIME_ACTIVITY_FROM_PARAM, localDayKeyOf(period.from));
	params.set(TIME_ACTIVITY_TO_PARAM, localDayKeyOf(period.to));
}

function listOf(params: LinkParams, name: string): string[] {
	const value = params.get(name);
	if (!value) {
		return [];
	}
	const parts = value.split(VALUE_SEPARATOR);
	const values = parts.filter(Boolean);
	return [...new Set(values)];
}

/** The teams, members, projects and tasks the link picks; none when it picks none. */
export function linkedFiltersOf(params: LinkParams): StoredTimeActivityFilters {
	return {
		teamIds: listOf(params, LINKED_FILTER_PARAMS.teamIds),
		employeeIds: listOf(params, LINKED_FILTER_PARAMS.employeeIds),
		projectIds: listOf(params, LINKED_FILTER_PARAMS.projectIds),
		taskIds: listOf(params, LINKED_FILTER_PARAMS.taskIds)
	};
}

/** Changes `params` in place: each of the four lists, left out when empty. */
export function writeLinkedFilters(params: URLSearchParams, filters: StoredTimeActivityFilters) {
	for (const field of LINKED_FILTER_FIELDS) {
		const values = filters[field];
		const name = LINKED_FILTER_PARAMS[field];
		if (values.length === 0) {
			params.delete(name);
			continue;
		}
		params.set(name, values.join(VALUE_SEPARATOR));
	}
}

export function clearLinkedFilters(params: URLSearchParams) {
	writeLinkedFilters(params, EMPTY_STORED_TIME_ACTIVITY_FILTERS);
}
