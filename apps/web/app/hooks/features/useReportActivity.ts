import { useCallback, useEffect, useState, useMemo } from 'react';
import { ITimeLogReportDailyChartProps } from '@/app/interfaces/timer/ITimerLog';
import {
	getActivityReport,
	getTimeLogReportDaily,
	getTimeLogReportDailyChart,
	getTimesheetStatisticsCounts
} from '@/app/services/client/api/timer/timer-log';
import { useAuthenticateUser } from './useAuthenticateUser';
import { useQuery } from '../useQuery';
import { useAtom } from 'jotai';
import {
	activityReportState,
	timeLogsRapportChartState,
	timeLogsRapportDailyState,
	timesheetStatisticsCountsState
} from '@/app/stores';
import { TimeLogType } from '@/app/interfaces';
import { useTimelogFilterOptions } from './useTimelogFilterOptions';

export interface UseReportActivityProps
	extends Omit<ITimeLogReportDailyChartProps, 'logType' | 'activityLevel' | 'start' | 'end' | 'groupBy'> {
	logType?: TimeLogType[];
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
	startDate: new Date().toISOString().split('T')[0],
	endDate: new Date().toISOString().split('T')[0],
	groupBy: 'date',
	activityLevel: {
		start: 0,
		end: 100
	},
	logType: [TimeLogType.TRACKED],
	start: 0,
	end: 100,
	employeeIds: [],
	projectIds: [],
	teamIds: []
};

export type GroupByType = 'date' | 'project' | 'employee';

interface GroupByOptions {
	groupBy: GroupByType;
}

export function useReportActivity({ types }: { types?: 'TEAM-DASHBOARD' | 'APPS-URLS' }) {
	// User and authentication
	const { user } = useAuthenticateUser();
	const { allteamsState, alluserState, isUserAllowedToAccess } = useTimelogFilterOptions();
	const isManage = user && isUserAllowedToAccess(user);

	// State management
	const [currentFilters, setCurrentFilters] = useState<Partial<UseReportActivityProps>>(defaultProps);
	const [rapportChartActivity, setRapportChartActivity] = useAtom(timeLogsRapportChartState);
	const [rapportDailyActivity, setRapportDailyActivity] = useAtom(timeLogsRapportDailyState);
	const [statisticsCounts, setStatisticsCounts] = useAtom(timesheetStatisticsCountsState);
	const [activityReport, setActivityReport] = useAtom(activityReportState);

	// API queries
	const { loading: loadingTimeLogReportDailyChart, queryCall: queryTimeLogReportDailyChart } =
		useQuery(getTimeLogReportDailyChart);
	const { loading: loadingTimeLogReportDaily, queryCall: queryTimeLogReportDaily } =
		useQuery(getTimeLogReportDaily);
	const { loading: loadingTimesheetStatisticsCounts, queryCall: queryTimesheetStatisticsCounts } =
		useQuery(getTimesheetStatisticsCounts);
	const { loading: loadingActivityReport, queryCall: queryActivityReport } =
		useQuery(getActivityReport);

	// Props merging logic
	const getMergedProps = useMemo(() => {
		if (!user?.employee.organizationId) {
			return null;
		}

		return (customProps?: Partial<UseReportActivityProps>) => {
			const merged = {
				...defaultProps,
				...currentFilters,
				...(customProps || {}),
				organizationId: user.employee.organizationId,
				teamId: customProps?.teamId || currentFilters.teamId,
				userId: customProps?.userId || currentFilters.userId,
				tenantId: user.tenantId ?? '',
				logType: (customProps?.logType || currentFilters.logType || defaultProps.logType) as TimeLogType[],
				startDate: (customProps?.startDate || currentFilters.startDate || defaultProps.startDate) as string,
				endDate: (customProps?.endDate || currentFilters.endDate || defaultProps.endDate) as string,
				groupBy: (customProps?.groupBy || currentFilters.groupBy || defaultProps.groupBy) as string,
				projectIds: (customProps?.projectIds || currentFilters.projectIds || defaultProps.projectIds) as string[],
				employeeIds: isManage
					? alluserState?.map(({ employee: { id } }) => id).filter(Boolean)
					: [user.employee.id],
				teamIds: allteamsState?.map(({ id }) => id).filter(Boolean),
				activityLevel: {
					start: customProps?.activityLevel?.start ??
						currentFilters.activityLevel?.start ??
						defaultProps.activityLevel.start,
					end: customProps?.activityLevel?.end ??
						currentFilters.activityLevel?.end ??
						defaultProps.activityLevel.end
				},
				start: customProps?.start ?? currentFilters.start ?? defaultProps.start,
				end: customProps?.end ?? currentFilters.end ?? defaultProps.end
			};
			return merged as Required<UseReportActivityProps>;
		};
	}, [
		user?.employee.organizationId,
		user?.employee.id,
		user?.tenantId,
		currentFilters,
		isManage,
		alluserState,
		allteamsState
	]);

	// Generic fetch function
	const fetchReport = useCallback(
		async <T>(
			queryFn: typeof queryTimeLogReportDailyChart |
				typeof queryTimeLogReportDaily |
				typeof queryTimesheetStatisticsCounts |
				typeof queryActivityReport,
			setData: ((data: T[]) => void) | null,
			customProps?: Partial<UseReportActivityProps>
		) => {
			if (!user || !getMergedProps) {
				if (setData) {
					setData([]);
				}
				return;
			}

			try {
				const mergedProps = getMergedProps(customProps);
				if (!mergedProps) {
					if (setData) {
						setData([]);
					}
					return;
				}

				const response = await queryFn(mergedProps);

				if (setData) {
					if (response?.data && Array.isArray(response.data)) {
						setData(response.data as T[]);
					} else {
						setData([]);
					}
				}

				if (customProps) {
					setCurrentFilters((prev) => ({
						...prev,
						...customProps
					}));
				}
			} catch (err) {
				console.error('Failed to fetch report:', err);
				if (setData) {
					setData([]);
				}
			}
		},
		[user, getMergedProps]
	);

	// Specific fetch functions
	const fetchReportActivity = useCallback(
		(customProps?: Partial<UseReportActivityProps>) =>
			fetchReport(queryTimeLogReportDailyChart, setRapportChartActivity, customProps),
		[fetchReport, queryTimeLogReportDailyChart, setRapportChartActivity]
	);

	const fetchDailyReport = useCallback(
		(customProps?: Partial<UseReportActivityProps>) =>
			fetchReport(queryTimeLogReportDaily, setRapportDailyActivity, customProps),
		[fetchReport, queryTimeLogReportDaily, setRapportDailyActivity]
	);

	const fetchActivityReport = useCallback(
		(customProps?: Partial<UseReportActivityProps>) =>
			fetchReport(queryActivityReport, setActivityReport, customProps),
		[fetchReport, queryActivityReport, setActivityReport]
	);

	const fetchStatisticsCounts = useCallback(
		async (customProps?: Partial<UseReportActivityProps>) => {
			if (!user || !getMergedProps) {
				return;
			}
			try {
				const mergedProps = getMergedProps(customProps);
				const response = await queryTimesheetStatisticsCounts({
					...mergedProps,
					logType: [TimeLogType.TRACKED]
				});
				setStatisticsCounts(response.data);
				if (customProps) {
					setCurrentFilters((prev) => ({
						...prev,
						...customProps
					}));
				}
			} catch (error) {
				console.error('Error fetching statistics:', error);
				setStatisticsCounts(null);
			}
		},
		[user, getMergedProps, queryTimesheetStatisticsCounts, setStatisticsCounts]
	);

	// Update handlers
	const updateDateRange = useCallback(
		(startDate: Date, endDate: Date) => {
			const newProps = {
				startDate: startDate.toISOString().split('T')[0],
				endDate: endDate.toISOString().split('T')[0]
			};

			Promise.all([
				fetchReportActivity(newProps),
				fetchDailyReport(newProps),
				fetchStatisticsCounts(newProps),
				(types === 'APPS-URLS' && fetchActivityReport(newProps)) || null
			]).catch(console.error);
		},
		[fetchReportActivity, fetchDailyReport, fetchStatisticsCounts, fetchActivityReport, types]
	);

	const handleGroupByChange = useCallback(
		async (groupByType: GroupByType): Promise<void> => {
			try {
				const options: GroupByOptions = { groupBy: groupByType };
				await fetchActivityReport(options);
			} catch (error) {
				console.error('Failed to update activity grouping:', error);
			}
		},
		[fetchActivityReport]
	);

	const updateFilters = useCallback(
		(newFilters: Partial<UseReportActivityProps>) => {
			Promise.all([
				fetchReportActivity(newFilters),
				fetchDailyReport(newFilters),
				fetchStatisticsCounts(newFilters),
				(types === 'APPS-URLS' && fetchActivityReport(newFilters)) || null
			]).catch(console.error);
		},
		[fetchReportActivity, fetchDailyReport, fetchStatisticsCounts, fetchActivityReport, types]
	);

	// Initial data fetch
	useEffect(() => {
		if (user) {
			Promise.all([
				fetchReportActivity(),
				fetchDailyReport(),
				fetchStatisticsCounts(),
				(types === 'APPS-URLS' && fetchActivityReport()) || null
			]).catch(console.error);
		}
	}, [user, fetchReportActivity, fetchDailyReport, fetchStatisticsCounts, fetchActivityReport, types]);

	return {
		// Loading states
		loadingTimeLogReportDailyChart,
		loadingTimeLogReportDaily,
		loadingTimesheetStatisticsCounts,
		loadingActivityReport,

		// Data states
		rapportChartActivity,
		rapportDailyActivity,
		statisticsCounts,
		activityReport,

		// Update handlers
		updateDateRange,
		updateFilters,
		handleGroupByChange,

		// Other states
		currentFilters,
		setStatisticsCounts,
		isManage
	};
}
