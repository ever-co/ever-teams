'use client';

import { useCallback, useMemo, useState } from 'react';
import { parseISO } from 'date-fns';
import { useCalendarLogs } from '@/core/hooks/calendar/use-calendar-logs';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/cookies';
import { getDefaultTimezone } from '@/core/lib/helpers/date-and-time';
import type { CalendarView } from '@/core/lib/utils/calendar-view';
import { localDayKeyOf } from '@/core/lib/utils/dashboard-export';
import { type Period, presetOfPeriod } from '@/core/lib/utils/dashboard-period';
import {
	dailyLimitSecondsOf,
	DEFAULT_MY_WEEK_PERIOD,
	isWeekPeriod,
	MY_WEEK_PERIODS,
	MY_WEEK_STARTS_ON,
	type MyWeekEntry,
	type MyWeekPeriodKey,
	myWeekDaysOf,
	myWeekEntriesOf,
	myWeekFiguresOf,
	myWeekPeriodOf,
	myWeekProjectsOf,
	myWeekTargetOf,
	projectsInMinutesOf,
	RECENT_ENTRY_COUNT,
	weeklyLimitSecondsOf
} from '@/core/lib/utils/dashboards/my-week';

const NO_ENTRIES: MyWeekEntry[] = [];

function calendarViewOf(key: MyWeekPeriodKey): CalendarView {
	if (isWeekPeriod(key)) {
		return 'week';
	}
	return 'month';
}

/** Running entries end at the time of the read that returned them, so they grow with each live read. */
function readTimeOf(dataUpdatedAt: number) {
	if (dataUpdatedAt > 0) {
		return new Date(dataUpdatedAt);
	}
	return new Date();
}

/** The period the figures come from: the picked one, or the previous one kept on screen while the next loads. */
function shownPeriodOf(picked: Period, loaded: Period | undefined, isPlaceholder: boolean): Period {
	if (!loaded) {
		return picked;
	}
	if (!isPlaceholder) {
		return picked;
	}
	return loaded;
}

function isPeriodKey(value: string | null): value is MyWeekPeriodKey {
	const keys: ReadonlyArray<string | null> = MY_WEEK_PERIODS;
	return keys.includes(value);
}

function shownKeyOf(shownPeriod: Period, pickedKey: MyWeekPeriodKey): MyWeekPeriodKey {
	const matchingKey = presetOfPeriod(shownPeriod, MY_WEEK_PERIODS, MY_WEEK_STARTS_ON);
	if (isPeriodKey(matchingKey)) {
		return matchingKey;
	}
	return pickedKey;
}

/**
 * The signed-in person's own week, last week or month. There is no member to pick: the one request of a period always
 * asks for the signed-in member's employee id, on the time-log list the Work diary and the Calendar read (the same
 * cache for the same days), and the weekly limit is the one of their own employee profile.
 */
export function useMyWeekPage() {
	const { data: user } = useUserQuery();
	const tenantId = getTenantIdCookie();
	const organizationId = getOrganizationIdCookie();
	const timeZone = useMemo(() => getDefaultTimezone(), []);
	const [periodKey, setPeriodKey] = useState<MyWeekPeriodKey>(DEFAULT_MY_WEEK_PERIOD);

	const now = new Date();
	const todayKey = localDayKeyOf(now);
	const today = useMemo(() => parseISO(todayKey), [todayKey]);
	const period = useMemo(() => myWeekPeriodOf(periodKey, today), [periodKey, today]);

	const employeeId: string | null = user?.employee?.id ?? null;
	const isUserReady = user !== undefined;
	const logsQuery = useCalendarLogs({
		tenantId,
		organizationId,
		employeeId,
		view: calendarViewOf(periodKey),
		anchor: period.from,
		range: period,
		timeZone,
		isEnabled: isUserReady
	});

	const result = logsQuery.data;
	const loadedPeriod = result?.request.range;
	const isPlaceholder = logsQuery.isPlaceholderData;
	const shownPeriod = useMemo(
		() => shownPeriodOf(period, loadedPeriod, isPlaceholder),
		[isPlaceholder, loadedPeriod, period]
	);
	const shownKey = shownKeyOf(shownPeriod, periodKey);
	const dataUpdatedAt = logsQuery.dataUpdatedAt;
	const resultLogs = result?.logs;

	const entries = useMemo(() => {
		if (!resultLogs) {
			return NO_ENTRIES;
		}
		const readTime = readTimeOf(dataUpdatedAt);
		return myWeekEntriesOf(resultLogs, shownPeriod, employeeId, readTime);
	}, [dataUpdatedAt, employeeId, resultLogs, shownPeriod]);

	const days = useMemo(() => myWeekDaysOf(shownPeriod, entries, today), [entries, shownPeriod, today]);
	const figures = useMemo(() => myWeekFiguresOf(entries, days), [days, entries]);
	const projects = useMemo(() => {
		const exactProjects = myWeekProjectsOf(entries);
		return projectsInMinutesOf(exactProjects);
	}, [entries]);
	const recentEntries = useMemo(() => entries.slice(0, RECENT_ENTRY_COUNT), [entries]);

	const weeklyLimitSeconds = weeklyLimitSecondsOf(user?.employee?.reWeeklyLimit);
	const dailyLimitSeconds = dailyLimitSecondsOf(weeklyLimitSeconds);
	const trackedSeconds = figures.trackedSeconds;
	const target = useMemo(
		() => myWeekTargetOf(shownKey, weeklyLimitSeconds, trackedSeconds),
		[shownKey, trackedSeconds, weeklyLimitSeconds]
	);

	const hasData = result !== undefined;
	const hasEmployee = Boolean(employeeId);
	const isMemberUnknown = isUserReady && !hasEmployee;
	const showsError = logsQuery.isError && !hasData;
	const isWaitingForData = hasEmployee && !hasData && !showsError;
	const isLoading = !isUserReady || isWaitingForData;
	const isUpdating = logsQuery.isFetching && hasData;
	const isEmpty = hasData && entries.length === 0;

	const refetchLogs = logsQuery.refetch;
	const refetch = useCallback(() => {
		void refetchLogs();
	}, [refetchLogs]);

	return {
		periodKey,
		pickPeriod: setPeriodKey,
		shownKey,
		shownPeriod,
		days,
		figures,
		target,
		weeklyLimitSeconds,
		dailyLimitSeconds,
		projects,
		recentEntries,
		entryCount: entries.length,
		isMemberUnknown,
		isLoading,
		showsError,
		isUpdating,
		isEmpty,
		refetch
	};
}

export type MyWeekPageState = ReturnType<typeof useMyWeekPage>;
