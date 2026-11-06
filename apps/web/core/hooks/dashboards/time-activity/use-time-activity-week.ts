'use client';

import { useCallback, useMemo, useState } from 'react';
import { useLocale } from 'next-intl';
import { useActivityWeeklyReportQuery } from '@/core/hooks/activities/queries/use-activity-weekly-report-query';
import type { UseReportActivityProps } from '@/core/hooks/activities/use-activity-filters';
import { localDayKeyOf } from '@/core/lib/utils/dashboard-export';
import type { Period } from '@/core/lib/utils/dashboard-period';
import {
	TIME_ACTIVITY_WEEK_START,
	initialWeekIndexOf,
	todayKeyOf,
	weekColumnTotalsOf,
	weekDaysOf,
	weekGridRowsOf,
	weekStartsOfPeriod,
	weekWindowOf
} from '@/core/lib/utils/dashboards/time-activity';
import { ETimeLogType } from '@/core/types/generics/enums/timer';
import type { TimeActivityRequest } from './use-time-activity-queries';

/** The weekly hook reads only the scope, member, team and project ids of these props; the rest mirrors the page. */
function weeklyPropsOf(
	request: TimeActivityRequest | null,
	userId: string | undefined
): Required<UseReportActivityProps> | null {
	if (!request) {
		return null;
	}
	return {
		organizationId: request.organizationId,
		tenantId: request.tenantId,
		startDate: request.startDate,
		endDate: request.endDate,
		timeZone: request.timeZone,
		employeeIds: request.employeeIds,
		teamIds: request.teamIds,
		projectIds: request.projectIds,
		taskIds: request.taskIds,
		logType: [ETimeLogType.TRACKED],
		activityLevel: { start: 0, end: 100 },
		start: 0,
		end: 100,
		groupBy: 'date',
		teamId: '',
		userId: userId ?? '',
		selectedEmployeeIds: request.employeeIds,
		selectedTeamIds: request.teamIds,
		resolvedMemberIds: []
	};
}

export interface WeekDayColumn {
	key: string;
	date: Date;
	isInPeriod: boolean;
	isToday: boolean;
	isFuture: boolean;
}

function dayColumnsOf(weekStart: Date, window: Period, todayKey: string): WeekDayColumn[] {
	const fromKey = localDayKeyOf(window.from);
	const toKey = localDayKeyOf(window.to);
	return weekDaysOf(weekStart).map((date) => {
		const key = localDayKeyOf(date);
		const isAfterStart = key >= fromKey;
		const isBeforeEnd = key <= toKey;
		return {
			key,
			date,
			isInPeriod: isAfterStart && isBeforeEnd,
			isToday: key === todayKey,
			isFuture: key > todayKey
		};
	});
}

export function useTimeActivityWeek({
	period,
	request,
	userId
}: Readonly<{ period: Period; request: TimeActivityRequest | null; userId: string | undefined }>) {
	const locale = useLocale();
	const weekStarts = useMemo(() => weekStartsOfPeriod(period, TIME_ACTIVITY_WEEK_START), [period]);
	const [weekIndex, setWeekIndex] = useState(() => initialWeekIndexOf(weekStarts));
	const lastIndex = weekStarts.length - 1;
	const safeIndex = Math.min(weekIndex, lastIndex);
	const weekStart = weekStarts[safeIndex];

	const window = useMemo(() => weekWindowOf(weekStart, period, TIME_ACTIVITY_WEEK_START), [period, weekStart]);
	const columns = useMemo(() => dayColumnsOf(weekStart, window, todayKeyOf()), [weekStart, window]);
	const mergedProps = useMemo(() => weeklyPropsOf(request, userId), [request, userId]);

	const { weeklyReport, isLoading, isError, refetch } = useActivityWeeklyReportQuery({
		mergedProps,
		startDate: window.from,
		endDate: window.to,
		enabled: mergedProps !== null
	});

	const rows = useMemo(() => {
		const dayKeys = columns.map((column) => column.key);
		return weekGridRowsOf(weeklyReport, dayKeys, locale);
	}, [columns, locale, weeklyReport]);

	const columnTotals = useMemo(() => weekColumnTotalsOf(rows, columns.length), [columns.length, rows]);

	let grandTotal = 0;
	for (const total of columnTotals) {
		grandTotal += total;
	}

	const nextWeekStart = weekStarts[safeIndex + 1];
	const hasNextWeek = safeIndex < lastIndex;
	const isNextWeekStarted = Boolean(nextWeekStart) && localDayKeyOf(nextWeekStart) <= todayKeyOf();
	const canGoNext = hasNextWeek && isNextWeekStarted;
	const canGoPrevious = safeIndex > 0;

	const goPrevious = useCallback(() => setWeekIndex((index) => Math.max(index - 1, 0)), []);
	const goNext = useCallback(() => setWeekIndex((index) => Math.min(index + 1, lastIndex)), [lastIndex]);

	return {
		weekStart,
		window,
		columns,
		rows,
		columnTotals,
		grandTotal,
		isLoading,
		isError,
		refetch,
		canGoPrevious,
		canGoNext,
		goPrevious,
		goNext
	};
}
