import { useCallback, useState, useMemo } from 'react';
import { useAuthenticateUser } from '../auth';
import { useTimelogFilterOptions } from './use-timelog-filter-options';
import { ETimeLogType } from '@/core/types/generics/enums/timer';
import { ITimeLogReportDailyChartProps } from '@/core/types/interfaces/activity/activity-report';

// ==================== TYPES ====================

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

export type GroupByType = 'date' | 'project' | 'employee' | 'application' | 'daily' | 'weekly' | 'member';

// ==================== HELPERS ====================

/**
 * Formats a Date to a 'YYYY-MM-DD' string using **local** time.
 *
 * `Date.toISOString()` converts to UTC first, which silently shifts the day
 * for users east of UTC (e.g. UTC+1: Feb 1 00:00 local → Jan 31 23:00 UTC).
 */
const formatLocalDate = (date: Date): string => {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
};

// ==================== DEFAULTS ====================

/** Default date range: last 7 days (today inclusive).
 *  Keeps the initial API payload light — users can still widen the range
 *  via the date-picker in the UI.
 */
const now = new Date();
const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
const sevenDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);

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
	startDate: formatLocalDate(sevenDaysAgo),
	endDate: formatLocalDate(today),
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

// ==================== HOOK ====================

/**
 * Hook for managing activity report filters, auth context, and merged props.
 *
 * Extracts the shared filter logic from the old monolithic `useReportActivity`.
 * All granular query hooks (`useActivityChartQuery`, `useActivityDailyReportQuery`, etc.)
 * consume the `mergedProps` returned by this hook.
 *
 * @example
 * ```typescript
 * const { mergedProps, currentFilters, updateDateRange, isManage } = useActivityFilters();
 * const { data: chartData } = useActivityChartQuery({ mergedProps, enabled: true });
 * ```
 */
export function useActivityFilters() {
	// User and authentication
	const { user } = useAuthenticateUser();
	const { allteamsState, alluserState, isUserAllowedToAccess } = useTimelogFilterOptions();
	const isManage = useMemo(() => user && isUserAllowedToAccess(user), [user, isUserAllowedToAccess]);

	// State management
	const [currentFilters, setCurrentFilters] = useState<Partial<UseReportActivityProps>>(defaultProps);

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
	const mergedProps = useMemo(() => {
		if (!user?.employee?.organizationId) {
			return null;
		}

		return {
			...defaultProps,
			...currentFilters,
			organizationId: user.employee.organizationId,
			teamId: currentFilters.teamId,
			userId: currentFilters.userId,
			tenantId: user.tenantId ?? '',
			logType: (currentFilters.logType || defaultProps.logType) as ETimeLogType[],
			startDate: (currentFilters.startDate || defaultProps.startDate) as string,
			endDate: (currentFilters.endDate || defaultProps.endDate) as string,
			groupBy: (currentFilters.groupBy || defaultProps.groupBy) as string,
			projectIds: (currentFilters.projectIds || defaultProps.projectIds) as string[],
			employeeIds: isManage ? employeeIds : [user?.employee?.id],
			teamIds: teamIds,
			activityLevel: {
				start: currentFilters.activityLevel?.start ?? defaultProps.activityLevel.start,
				end: currentFilters.activityLevel?.end ?? defaultProps.activityLevel.end
			},
			start: currentFilters.start ?? defaultProps.start,
			end: currentFilters.end ?? defaultProps.end
		} as Required<UseReportActivityProps>;
	}, [user?.employee?.organizationId, user?.employee?.id, user?.tenantId, currentFilters, isManage, employeeIds, teamIds]);

	const enabled = !!user && !!mergedProps;

	// ==================== UPDATE HANDLERS ====================

	const updateDateRange = useCallback((startDate: Date, endDate: Date) => {
		setCurrentFilters((prev) => ({
			...prev,
			startDate: formatLocalDate(startDate),
			endDate: formatLocalDate(endDate)
		}));
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

	return {
		user,
		isManage,
		mergedProps,
		enabled,
		currentFilters,
		setCurrentFilters,
		updateDateRange,
		handleGroupByChange,
		updateFilters
	};
}

