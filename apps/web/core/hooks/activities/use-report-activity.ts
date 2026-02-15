import { useMemo } from 'react';
import { useActivityFilters } from './use-activity-filters';
import { useActivityChartQuery } from './queries/use-activity-chart-query';
import { useActivityDailyReportQuery } from './queries/use-activity-daily-report-query';
import { useActivityStatisticsQuery } from './queries/use-activity-statistics-query';
import { useActivityReportListQuery } from './queries/use-activity-report-list-query';

// Re-export types for backward compatibility
export type { UseReportActivityProps, GroupByType } from './use-activity-filters';

/**
 * @deprecated Use the granular hooks directly instead:
 * - `useActivityFilters()` for filter state, auth context, and merged props
 * - `useActivityChartQuery()` for chart data
 * - `useActivityDailyReportQuery()` for daily report data
 * - `useActivityStatisticsQuery()` for statistics counts
 * - `useActivityReportListQuery()` for activity report (Apps & URLs)
 *
 * This wrapper composes the new hooks to maintain backward compatibility.
 * It will be removed in a future release.
 */
export function useReportActivity({ types }: { types?: 'TEAM-DASHBOARD' | 'APPS-URLS' | 'TIME-AND-ACTIVITY' }) {
	const {
		isManage,
		mergedProps,
		enabled,
		currentFilters,
		updateDateRange,
		handleGroupByChange,
		updateFilters
	} = useActivityFilters();

	const isNotAppsUrls = types !== 'APPS-URLS';
	const isAppsUrls = types === 'APPS-URLS';

	const {
		rapportChartActivity,
		refetchChartActivity,
		query: chartActivityQuery
	} = useActivityChartQuery({ mergedProps, enabled: enabled && isNotAppsUrls });

	const {
		rapportDailyActivity,
		refetchDailyReport,
		query: dailyReportQuery
	} = useActivityDailyReportQuery({ mergedProps, enabled: enabled && isNotAppsUrls });

	const {
		statisticsCounts,
		refetchStatisticsCounts,
		query: statisticsQuery
	} = useActivityStatisticsQuery({ mergedProps, enabled: enabled && isNotAppsUrls });

	const {
		activityReport,
		refetchActivityReport,
		query: activityReportQuery
	} = useActivityReportListQuery({ mergedProps, enabled: enabled && isAppsUrls });

	// Combined loading state
	const loading = useMemo(() => {
		if (isAppsUrls) {
			return activityReportQuery.isLoading;
		}
		return chartActivityQuery.isLoading || dailyReportQuery.isLoading || statisticsQuery.isLoading;
	}, [isAppsUrls, chartActivityQuery.isLoading, dailyReportQuery.isLoading, statisticsQuery.isLoading, activityReportQuery.isLoading]);

	return {
		// Loading states
		loading,
		// Data states
		rapportChartActivity,
		rapportDailyActivity,
		statisticsCounts,
		activityReport,

		// Update handlers
		updateDateRange,
		updateFilters,
		handleGroupByChange,

		// Refetch functions
		fetchReportActivity: refetchChartActivity,
		fetchActivityReport: refetchActivityReport,
		fetchDailyReport: refetchDailyReport,
		fetchStatisticsCounts: refetchStatisticsCounts,

		// Other states
		currentFilters,
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
