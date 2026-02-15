'use client';

import { useAtom } from 'jotai';
import { timesheetRapportState } from '@/core/stores/timer/time-logs';
import { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import moment from 'moment';
import { useTimelogFilterOptions } from '../activities/use-timelog-filter-options';
import { timeLogService } from '@/core/services/client/api/timesheets/time-log.service';
import { useAuthenticateUser } from '../auth';
import { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import { ETimesheetStatus } from '@/core/types/generics/enums/timesheet';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { useConditionalUpdateEffect } from '../common/use-has-mounted';
import {
	type TimesheetParams,
	areArraysEqual,
	groupByDate,
	groupByWeek,
	groupByMonth,
	reGroupByDate,
	getStatusTimesheet
} from '@/core/lib/helpers/timesheet-grouping';

/**
 * Hook for fetching and transforming timesheet data.
 * Handles: query, params synchronization, Jotai sync, search filtering, and view-mode grouping.
 */
export function useTimesheetQuery({ startDate, endDate, timesheetViewMode, inputSearch }: TimesheetParams) {
	const { user } = useAuthenticateUser();
	const [timesheet, setTimesheet] = useAtom(timesheetRapportState);
	const {
		employee,
		project,
		task,
		statusState,
		timesheetGroupByDays,
		puTimesheetStatus,
		isUserAllowedToAccess,
		normalizeText,
		setSelectTimesheetId,
		selectTimesheetId,
		handleSelectRowByStatusAndDate,
		handleSelectRowTimesheet
	} = useTimelogFilterOptions();

	const isManage = user && isUserAllowedToAccess(user);

	// ─── Query Params State ──────────────────────────────────────────────────
	const [timesheetParams, setTimesheetParams] = useState<{
		organizationId: string;
		tenantId: string;
		startDate: string | Date;
		endDate: string | Date;
		timeZone?: string;
		projectIds?: string[];
		employeeIds?: string[];
		taskIds?: string[];
		status?: ETimesheetStatus[];
	} | null>(null);

	// ─── React Query ─────────────────────────────────────────────────────────
	const timesheetLogsQuery = useQuery({
		queryKey: queryKeys.timesheet.logs(
			timesheetParams?.tenantId,
			timesheetParams?.organizationId,
			String(timesheetParams?.startDate),
			String(timesheetParams?.endDate),
			timesheetParams?.employeeIds,
			timesheetParams?.projectIds,
			timesheetParams?.taskIds,
			timesheetParams?.status
		),
		queryFn: async () => {
			if (!timesheetParams) {
				throw new Error('Timesheet query parameters are required');
			}
			// organizationId & tenantId are handled by the service instance — exclude them from the request
			const { organizationId: _orgId, tenantId: _tenantId, ...requestParams } = timesheetParams;
			const response = await timeLogService.getTimeLogs(requestParams);
			return response as unknown as ITimeLog[];
		},
		enabled: !!timesheetParams && !!timesheetParams.startDate && !!timesheetParams.endDate,
		staleTime: 1000 * 60 * 3,
		gcTime: 1000 * 60 * 15
	});

	// ─── Memoized Filter IDs ─────────────────────────────────────────────────
	const memoizedFilterIds = useMemo(
		() => ({
			employeeIds: isManage
				? employee?.map(({ employee }) => employee?.id || '').filter(Boolean) || []
				: [user?.employee?.id || ''].filter(Boolean),
			projectIds: project?.map((p) => p.id).filter((id) => id !== undefined) || [],
			taskIds: task?.map((t) => t.id).filter((id) => id !== undefined) || [],
			status: statusState?.map((s) => s.value).filter((v) => v !== undefined) || []
		}),
		[employee, project, task, statusState, isManage, user?.employee?.id]
	);

	const prevFilterIdsRef = useRef(memoizedFilterIds);

	// ─── Params Synchronization ──────────────────────────────────────────────
	useEffect(() => {
		if (!user || !startDate || !endDate) return;

		const from = moment(startDate).format('YYYY-MM-DD');
		const to = moment(endDate).format('YYYY-MM-DD');

		const newParams = {
			startDate: from,
			endDate: to,
			organizationId: user.employee?.organizationId || '',
			tenantId: user.tenantId ?? '',
			timeZone: user.timeZone?.split('(')[0].trim() || 'UTC',
			employeeIds: memoizedFilterIds.employeeIds,
			projectIds: memoizedFilterIds.projectIds,
			taskIds: memoizedFilterIds.taskIds,
			status: memoizedFilterIds.status as ETimesheetStatus[]
		};

		const filtersChanged =
			!areArraysEqual(prevFilterIdsRef.current.employeeIds, memoizedFilterIds.employeeIds, (id) => id) ||
			!areArraysEqual(prevFilterIdsRef.current.projectIds, memoizedFilterIds.projectIds, (id) => id) ||
			!areArraysEqual(prevFilterIdsRef.current.taskIds, memoizedFilterIds.taskIds, (id) => id) ||
			!areArraysEqual(prevFilterIdsRef.current.status, memoizedFilterIds.status, (val) => val);

		const paramsChanged =
			!timesheetParams ||
			timesheetParams.startDate !== from ||
			timesheetParams.endDate !== to ||
			timesheetParams.organizationId !== newParams.organizationId ||
			timesheetParams.tenantId !== newParams.tenantId ||
			filtersChanged;

		if (paramsChanged) {
			setTimesheetParams(newParams);
			prevFilterIdsRef.current = memoizedFilterIds;
		}
	}, [startDate, endDate, user?.employee?.organizationId, user?.tenantId, user?.timeZone, memoizedFilterIds, timesheetParams]);


	// ─── Jotai Sync (backward compat) ────────────────────────────────────────
	useConditionalUpdateEffect(
		() => {
			if (timesheetLogsQuery.data) {
				setTimesheet(timesheetLogsQuery.data);
			}
		},
		[timesheetLogsQuery.data],
		() => timesheetLogsQuery.isLoading
	);

	// ─── Date Utilities ──────────────────────────────────────────────────────
	const currentDateRange = useMemo(() => {
		if (!startDate || !endDate) return '';
		const start = moment(startDate);
		const end = moment(endDate);
		if (start.isSame(end, 'day')) return start.format('MMMM DD, YYYY');
		if (start.isSame(end, 'month')) return `${start.format('MMMM DD')} - ${end.format('DD, YYYY')}`;
		return `${start.format('MMMM DD')} - ${end.format('MMMM DD, YYYY')}`;
	}, [startDate, endDate]);

	const formatDate = useCallback((date: Date | string) => moment(date).format('YYYY-MM-DD'), []);

	// ─── Imperative API (getTaskTimesheet) ───────────────────────────────────
	const getTaskTimesheet = useCallback(
		async (params: Record<string, string | string[] | boolean | undefined>) => {
			if (!user) return [];
			try {
				const response = await timeLogService.getTimeLogs({
					startDate: moment(startDate).format('YYYY-MM-DD'),
					endDate: moment(endDate).format('YYYY-MM-DD'),
					timeZone: user.timeZone?.split('(')[0].trim() || 'UTC',
					...params
				});
				return response as unknown as ITimeLog[];
			} catch (error) {
				console.error('Error fetching task timesheet:', error);
				return [];
			}
		},
		[user, startDate, endDate]
	);

	// ─── Status Timesheet (memoized) ─────────────────────────────────────────
	const statusTimesheet = useMemo(
		() => getStatusTimesheet(timesheetLogsQuery.data ?? timesheet),
		[timesheetLogsQuery.data, timesheet]
	);

	// ─── Search Filtering ────────────────────────────────────────────────────
	const filterDataTimesheet = useMemo(() => {
		const data = timesheetLogsQuery.data ?? timesheet;
		if (!inputSearch?.trim()) return data;
		const searchTerm = normalizeText(inputSearch);
		return data.filter((item) => {
			const taskName = normalizeText(item.task?.title || '');
			const employeeName = normalizeText(item.employee?.fullName || '');
			const projectName = normalizeText(item.project?.name || '');
			return taskName.includes(searchTerm) || employeeName.includes(searchTerm) || projectName.includes(searchTerm);
		});
	}, [timesheetLogsQuery.data, timesheet, inputSearch, normalizeText]);

	// ─── View-Mode Grouping ──────────────────────────────────────────────────
	const timesheetElementGroup = useMemo(() => {
		const data = filterDataTimesheet;
		switch (timesheetViewMode) {
			case 'ListView': {
				const grouped = (() => {
					switch (timesheetGroupByDays) {
						case 'Daily':
							return groupByDate(data);
						case 'Weekly':
							return groupByWeek(data);
						case 'Monthly':
							return groupByMonth(data);
						default:
							return groupByDate(data);
					}
				})();
				return reGroupByDate(grouped);
			}
			case 'CalendarView':
				return reGroupByDate(groupByDate(data));
			default:
				return reGroupByDate(groupByDate(data));
		}
	}, [filterDataTimesheet, timesheetViewMode, timesheetGroupByDays]);

	// ─── Return ──────────────────────────────────────────────────────────────
	return {
		// Query state
		timesheet: filterDataTimesheet,
		loadingTimesheet: timesheetLogsQuery.isLoading,
		timesheetLogsQuery,

		// Grouping & status
		statusTimesheet,
		timesheetElementGroup,

		// Date utilities
		currentDateRange,
		formatDate,

		// Imperative API
		getTaskTimesheet,

		// Filter options (pass-through)
		isManage,
		timesheetGroupByDays,
		puTimesheetStatus,
		selectTimesheetId,
		setSelectTimesheetId,
		handleSelectRowByStatusAndDate,
		handleSelectRowTimesheet,
		normalizeText
	};
}
