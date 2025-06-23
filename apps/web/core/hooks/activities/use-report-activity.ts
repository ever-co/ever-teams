import { useCallback, useEffect, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAtom } from 'jotai';
import {
	activityReportState,
	timeLogsRapportChartState,
	timeLogsRapportDailyState,
	timesheetStatisticsCountsState
} from '@/core/stores';
import { useTimelogFilterOptions } from './use-timelog-filter-options';
import { activityService } from '@/core/services/client/api/activities';
import { statisticsService } from '@/core/services/client/api/timesheets/statistic.service';
import { timeLogService } from '@/core/services/client/api/timesheets/time-log.service';
import { useAuthenticateUser } from '../auth';
import { ETimeLogType } from '@/core/types/generics/enums/timer';
import { queryKeys } from '@/core/query/keys';
import { ITimeLogReportDailyChartProps } from '@/core/types/interfaces/activity/activity-report';

export interface UseReportActivityProps
	extends Omit<ITimeLogReportDailyChartProps, 'logType' | 'activityLevel' | 'start' | 'end' | 'groupBy'> {
	logType?: ETimeLogType[];
	activityLevel: {
		start: number;
		end: number;
	};
	start?: number;
	end?: number;
	projectIds?: string[];
	employeeIds?: string[];
	teamIds?: string[];
	groupBy?: string;
}

const now = new Date();
const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

const defaultProps: Required<
	Pick<
		UseReportActivityProps,
		| 'startDate'
		| 'endDate'
		| 'groupBy'
		| 'activityLevel'
		| 'logType'
		| 'start'
		| 'end'
		| 'employeeIds'
		| 'projectIds'
		| 'teamIds'
	>
> = {
	startDate: firstDayOfMonth.toISOString().split('T')[0],
	endDate: lastDayOfMonth.toISOString().split('T')[0],
	groupBy: 'date',
	activityLevel: {
		start: 0,
		end: 100
	},
	logType: [ETimeLogType.TRACKED],
	start: 0,
	end: 100,
	employeeIds: [],
	projectIds: [],
	teamIds: []
};

export type GroupByType = 'date' | 'project' | 'employee' | 'application' | 'daily' | 'weekly' | 'member';

export function useReportActivity({ types }: { types?: 'TEAM-DASHBOARD' | 'APPS-URLS' | 'TIME-AND-ACTIVITY' }) {
	// User and authentication
	const { user } = useAuthenticateUser();
	const { allteamsState, alluserState, isUserAllowedToAccess } = useTimelogFilterOptions();
	const isManage = useMemo(() => user && isUserAllowedToAccess(user), [user, isUserAllowedToAccess]);

	// State management - For compatibility
	const [currentFilters, setCurrentFilters] = useState<Partial<UseReportActivityProps>>(defaultProps);
	const [, setRapportChartActivity] = useAtom(timeLogsRapportChartState);
	const [, setRapportDailyActivity] = useAtom(timeLogsRapportDailyState);
	const [, setStatisticsCounts] = useAtom(timesheetStatisticsCountsState);
	const [, setActivityReport] = useAtom(activityReportState);

	// Memoized employee and team IDs
	const employeeIds = useMemo(
		() =>
			isManage
				? alluserState?.map(({ employee }) => employee?.id).filter(Boolean)
				: user?.employee?.id
					? [user.employee.id]
					: [],
		[isManage, alluserState, user?.employee?.id]
	);

	const teamIds = useMemo(() => allteamsState?.map(({ id }) => id).filter(Boolean) || [], [allteamsState]);

	// Props merging logic
	const getMergedProps = useMemo(() => {
		if (!user?.employee?.organizationId) {
			return null;
		}

		return (customProps?: Partial<UseReportActivityProps>) => {
			const merged = {
				...defaultProps,
				...currentFilters,
				...(customProps || {}),
				organizationId: user?.employee?.organizationId,
				teamId: customProps?.teamId || currentFilters.teamId,
				userId: customProps?.userId || currentFilters.userId,
				tenantId: user?.tenantId ?? '',
				logType: (customProps?.logType || currentFilters.logType || defaultProps.logType) as ETimeLogType[],
				startDate: (customProps?.startDate || currentFilters.startDate || defaultProps.startDate) as string,
				endDate: (customProps?.endDate || currentFilters.endDate || defaultProps.endDate) as string,
				groupBy: (customProps?.groupBy || currentFilters.groupBy || defaultProps.groupBy) as string,
				projectIds: (customProps?.projectIds ||
					currentFilters.projectIds ||
					defaultProps.projectIds) as string[],
				employeeIds: isManage ? employeeIds : [user?.employee?.id],
				teamIds: teamIds,
				activityLevel: {
					start:
						customProps?.activityLevel?.start ??
						currentFilters.activityLevel?.start ??
						defaultProps.activityLevel.start,
					end:
						customProps?.activityLevel?.end ??
						currentFilters.activityLevel?.end ??
						defaultProps.activityLevel.end
				},
				start: customProps?.start ?? currentFilters.start ?? defaultProps.start,
				end: customProps?.end ?? currentFilters.end ?? defaultProps.end
			};
			return merged as Required<UseReportActivityProps>;
		};
	}, [
		user?.employee?.organizationId,
		user?.employee?.id,
		user?.tenantId,
		currentFilters,
		isManage,
		employeeIds,
		teamIds
	]);

	// True MIGRATION REACT QUERY - Using useQuery (for compatibility)
	const mergedProps = getMergedProps?.() || null;
	const enabled = !!user && !!mergedProps;

	// Chart Activity Query
	const chartActivityQuery = useQuery({
		queryKey: [
			queryKeys.activities.dailyChart({
				tenantId: user?.tenantId,
				organizationId: user?.employee?.organizationId,
				...currentFilters
			})
		],
		queryFn: () => timeLogService.getTimeLogReportDailyChart(mergedProps!),
		enabled: enabled && types !== 'APPS-URLS',
		staleTime: 1000 * 60 * 10,
		gcTime: 1000 * 60 * 30,
		retry: 3,
		retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
	});

	// Daily Report Query
	const dailyReportQuery = useQuery({
		queryKey: [
			queryKeys.activities.daily({
				tenantId: user?.tenantId,
				organizationId: user?.employee?.organizationId,
				...currentFilters
			})
		],
		queryFn: () => timeLogService.getTimeLogReportDaily(mergedProps!),
		enabled: enabled && types !== 'APPS-URLS',
		staleTime: 1000 * 60 * 10,
		gcTime: 1000 * 60 * 30,
		retry: 3
	});

	// Statistics Query
	const statisticsQuery = useQuery({
		queryKey: [
			queryKeys.activities.statisticsCounts({
				tenantId: user?.tenantId,
				organizationId: user?.employee?.organizationId,
				...currentFilters
			})
		],
		queryFn: () =>
			statisticsService.getTimesheetStatisticsCounts({
				...mergedProps!,
				logType: [ETimeLogType.TRACKED]
			}),
		enabled: enabled && types !== 'APPS-URLS',
		staleTime: 1000 * 60 * 10,
		gcTime: 1000 * 60 * 30,
		retry: 3
	});

	// Activity Report Query
	const activityReportQuery = useQuery({
		queryKey: [
			queryKeys.activities.activityReport({
				tenantId: user?.tenantId,
				organizationId: user?.employee?.organizationId,
				...currentFilters
			})
		],
		queryFn: () => activityService.getActivitiesReport(mergedProps!),
		enabled: enabled && types === 'APPS-URLS',
		staleTime: 1000 * 60 * 10,
		gcTime: 1000 * 60 * 30,
		retry: 3
	});
	// Sync React Query data with Jotai atoms (for compatibility)
	useEffect(() => {
		if (chartActivityQuery.data?.data) {
			setRapportChartActivity(chartActivityQuery.data.data);
		}
	}, [chartActivityQuery.data, setRapportChartActivity]);

	useEffect(() => {
		if (dailyReportQuery.data?.data) {
			setRapportDailyActivity(dailyReportQuery.data.data);
		}
	}, [dailyReportQuery.data, setRapportDailyActivity]);

	useEffect(() => {
		if (statisticsQuery.data?.data) {
			setStatisticsCounts(statisticsQuery.data.data);
		}
	}, [statisticsQuery.data, setStatisticsCounts]);

	useEffect(() => {
		if (activityReportQuery.data?.data) {
			setActivityReport(activityReportQuery.data.data);
		}
	}, [activityReportQuery.data, setActivityReport]);

	// Combined loading state
	const loading = useMemo(() => {
		if (types === 'APPS-URLS') {
			return activityReportQuery.isLoading;
		}
		return chartActivityQuery.isLoading || dailyReportQuery.isLoading || statisticsQuery.isLoading;
	}, [
		types,
		chartActivityQuery.isLoading,
		dailyReportQuery.isLoading,
		statisticsQuery.isLoading,
		activityReportQuery.isLoading
	]);

	// Update handlers with React Query invalidation
	const updateDateRange = useCallback((startDate: Date, endDate: Date) => {
		const newFilters = {
			startDate: startDate.toISOString().split('T')[0],
			endDate: endDate.toISOString().split('T')[0]
		};
		setCurrentFilters((prev) => ({ ...prev, ...newFilters }));
	}, []);

	const handleGroupByChange = useCallback((groupByType: GroupByType) => {
		const options = {
			groupBy: groupByType === 'application' ? 'date' : groupByType
		};
		setCurrentFilters((prev) => ({ ...prev, ...options }));
	}, []);

	const updateFilters = useCallback((newFilters: Partial<UseReportActivityProps>) => {
		setCurrentFilters((prev) => ({ ...prev, ...newFilters }));
	}, []);

	// Refetch functions for compatibility
	const fetchReportActivity = useCallback(
		async (customProps?: Partial<UseReportActivityProps>) => {
			if (customProps) {
				setCurrentFilters((prev) => ({ ...prev, ...customProps }));
			}
			return chartActivityQuery.refetch();
		},
		[chartActivityQuery]
	);

	const fetchDailyReport = useCallback(
		async (customProps?: Partial<UseReportActivityProps>) => {
			if (customProps) {
				setCurrentFilters((prev) => ({ ...prev, ...customProps }));
			}
			return dailyReportQuery.refetch();
		},
		[dailyReportQuery]
	);

	const fetchActivityReport = useCallback(
		async (customProps?: Partial<UseReportActivityProps>) => {
			if (customProps) {
				setCurrentFilters((prev) => ({ ...prev, ...customProps }));
			}
			return activityReportQuery.refetch();
		},
		[activityReportQuery]
	);

	const fetchStatisticsCounts = useCallback(
		async (customProps?: Partial<UseReportActivityProps>) => {
			if (customProps) {
				setCurrentFilters((prev) => ({ ...prev, ...customProps }));
			}
			return statisticsQuery.refetch();
		},
		[statisticsQuery]
	);

	return {
		// Loading states
		loading,
		// Data states - Direct access to React Query data
		rapportChartActivity: chartActivityQuery.data?.data || [],
		rapportDailyActivity: dailyReportQuery.data?.data || [],
		statisticsCounts: statisticsQuery.data?.data || null,
		activityReport: Array.isArray(activityReportQuery.data?.data) ? activityReportQuery.data.data : [],

		// Update handlers
		updateDateRange,
		updateFilters,
		handleGroupByChange,
		fetchActivityReport,

		// Refetch functions for compatibility
		fetchReportActivity,
		fetchDailyReport,
		fetchStatisticsCounts,

		// Other states
		currentFilters,
		setStatisticsCounts,
		isManage,

		// React Query states for debug/monitoring
		queries: {
			chartActivity: chartActivityQuery,
			dailyReport: dailyReportQuery,
			statistics: statisticsQuery,
			activityReport: activityReportQuery
		}
	};
}
