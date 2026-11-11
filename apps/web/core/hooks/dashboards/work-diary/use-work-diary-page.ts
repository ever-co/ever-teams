'use client';

import { useCallback, useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { useRouter, useSearchParams } from 'next/navigation';
import { parseISO } from 'date-fns';
import { WORK_DIARY_PATH, workDiaryPathOf } from '@/core/components/layouts/my-work-navigation';
import { useCalendarLogs } from '@/core/hooks/calendar/use-calendar-logs';
import { useEmployeeDailyPlans } from '@/core/hooks/daily-plans/use-employee-daily-plans';
import { useIsMemberManager } from '@/core/hooks/organizations/teams/use-team-member';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/cookies';
import { getDefaultTimezone } from '@/core/lib/helpers/date-and-time';
import {
	type CalendarDay,
	type CalendarDayPlan,
	type CalendarEntry,
	calendarDaysOf,
	calendarEntriesOf,
	plansByDayOf,
	visibleRangeOf,
	weekStartOf
} from '@/core/lib/utils/calendar-view';
import { localDayKeyOf } from '@/core/lib/utils/dashboard-export';
import { daysOfPeriod, type Period } from '@/core/lib/utils/dashboard-period';
import { timesheetPathOf } from '@/core/lib/utils/dashboards/team';
import { isOrganizationRole } from '@/core/lib/utils/dashboards/timesheets';
import { DIARY_HISTORY_START, diaryDayOfParam, diaryTasksOf } from '@/core/lib/utils/dashboards/work-diary';
import { currentOrganizationState } from '@/core/stores/user/user-organizations';
import type { TDailyPlan } from '@/core/types/schemas/task/daily-plan.schema';
import { useWorkDiaryDay } from './use-work-diary-day';

/** The page's link names its day with `?date=YYYY-MM-DD`; today's link has none. */
const DAY_PARAM = 'date';

const NO_ENTRIES: CalendarEntry[] = [];
const NO_PLANS: TDailyPlan[] = [];
const NO_PLANS_BY_DAY = new Map<string, CalendarDayPlan>();

function plansOrNone(items: TDailyPlan[] | undefined) {
	if (!items || items.length === 0) {
		return NO_PLANS;
	}
	return items;
}

function readTimeOf(dataUpdatedAt: number) {
	if (dataUpdatedAt > 0) {
		return new Date(dataUpdatedAt);
	}
	return new Date();
}

function emptyDayOf(date: Date): CalendarDay {
	return { key: localDayKeyOf(date), date, entries: [], trackedSeconds: 0, manualSeconds: 0, plan: null };
}

/**
 * The Work diary of the signed-in person, one day at a time: the day the link names (today without one), the days of
 * its week with a mark where time was tracked, the day's time logs as tasks, its plan, and its ten-minute slots with
 * their screenshots and apps. The week's logs come from the Calendar's request (the same cache), the slots and apps
 * from the diary's; picking a day changes the link, so a reload or a shared link opens the same day.
 */
export function useWorkDiaryPage() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const { data: user } = useUserQuery();
	const organization = useAtomValue(currentOrganizationState);
	const { isTeamManager } = useIsMemberManager(user);
	const tenantId = getTenantIdCookie();
	const organizationId = getOrganizationIdCookie();
	const timeZone = useMemo(() => getDefaultTimezone(), []);

	const now = new Date();
	const todayKey = localDayKeyOf(now);
	const dayKey = localDayKeyOf(diaryDayOfParam(searchParams?.get(DAY_PARAM), now));
	const day = useMemo(() => parseISO(dayKey), [dayKey]);
	const isToday = dayKey === todayKey;
	// The strip steps back week by week as far as the diary goes, and never past today
	const history = useMemo<Period>(() => ({ from: DIARY_HISTORY_START, to: parseISO(todayKey) }), [todayKey]);
	const weekStartsOn = weekStartOf(organization?.startWeekOn);
	const week = useMemo(() => visibleRangeOf('week', day, weekStartsOn), [day, weekStartsOn]);
	const stripDays = useMemo(() => daysOfPeriod(week), [week]);

	const employeeId = user?.employee?.id ?? null;
	const isUserReady = user !== undefined;
	const logsQuery = useCalendarLogs({
		tenantId,
		organizationId,
		employeeId,
		view: 'week',
		anchor: day,
		range: week,
		timeZone,
		isEnabled: isUserReady
	});
	const logsResult = logsQuery.data;
	// The previous week stays in the cache while the next loads: its logs are not this week's
	const hasWeekLogs = logsResult !== undefined && !logsQuery.isPlaceholderData;
	const weekLogs = hasWeekLogs ? logsResult.logs : null;
	const dataUpdatedAt = logsQuery.dataUpdatedAt;
	const entries = useMemo(() => {
		if (!weekLogs || !employeeId) {
			return NO_ENTRIES;
		}
		return calendarEntriesOf(weekLogs, week, employeeId, readTimeOf(dataUpdatedAt));
	}, [dataUpdatedAt, employeeId, week, weekLogs]);

	const { employeeDailyPlans } = useEmployeeDailyPlans(employeeId);
	const plans = plansOrNone(employeeDailyPlans.items);
	const plansByDay = useMemo(() => {
		if (!employeeId) {
			return NO_PLANS_BY_DAY;
		}
		return plansByDayOf(plans, employeeId, week);
	}, [employeeId, plans, week]);
	const days = useMemo(() => calendarDaysOf(week, entries, plansByDay), [entries, plansByDay, week]);
	const shownDay = useMemo(() => days.find((item) => item.key === dayKey) ?? emptyDayOf(day), [day, dayKey, days]);
	const trackedKeys = useMemo(
		() => new Set(days.filter((item) => item.trackedSeconds > 0).map((item) => item.key)),
		[days]
	);
	const tasks = useMemo(() => diaryTasksOf(shownDay.entries), [shownDay]);

	const diary = useWorkDiaryDay({ employeeId, isOwn: true, teamId: null, day });

	const pickDay = useCallback(
		(next: Date) => {
			router.replace(workDiaryPathOf(next), { scroll: false });
		},
		[router]
	);
	const showToday = useCallback(() => {
		router.replace(WORK_DIARY_PATH, { scroll: false });
	}, [router]);

	const hasEmployee = Boolean(employeeId);
	const isMemberUnknown = isUserReady && !hasEmployee;
	const isLogsError = logsQuery.isError && !hasWeekLogs;
	const isLogsLoading = !isUserReady || (hasEmployee && !hasWeekLogs && !isLogsError);
	// A manager also reviews their own day with the team's, in Reports › Timesheets
	const canOpenTimesheets = isOrganizationRole(user?.role?.name) || isTeamManager;
	const userName = user?.name || user?.firstName || user?.lastName || user?.username || '';
	const timesheetsPath = user?.id ? timesheetPathOf(user.id, userName) : null;

	return {
		day,
		dayKey,
		isToday,
		history,
		stripDays,
		trackedKeys,
		shownDay,
		tasks,
		diary,
		isMemberUnknown,
		isLogsLoading,
		isLogsError,
		refetchLogs: logsQuery.refetch,
		isUpdating: logsQuery.isFetching && hasWeekLogs,
		timesheetsPath: canOpenTimesheets ? timesheetsPath : null,
		pickDay,
		showToday
	};
}

export type WorkDiaryPageState = ReturnType<typeof useWorkDiaryPage>;
