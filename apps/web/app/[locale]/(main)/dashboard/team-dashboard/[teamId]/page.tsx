'use client';

import { Suspense, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Card } from '@/core/components/common/card';
import { ArrowLeftIcon, ChevronUpIcon, ChevronDownIcon } from 'lucide-react';
import { PageLayout } from '@/core/components/layouts/default-layout';
import { Container } from '@/core/components';
import { cn } from '@/core/lib/helpers';
import { useAtomValue } from 'jotai';
import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { useActivityFilters } from '@/core/hooks/activities/use-activity-filters';
import { useActivityChartQuery } from '@/core/hooks/activities/queries/use-activity-chart-query';
import { useActivityDailyReportQuery } from '@/core/hooks/activities/queries/use-activity-daily-report-query';
import { useActivityStatisticsQuery } from '@/core/hooks/activities/queries/use-activity-statistics-query';
import { useTranslations } from 'next-intl';

import { TeamStatsTableSkeleton } from '@/core/components/common/skeleton/team-stats-table-skeleton';
import { TeamDashboardPageSkeleton } from '@/core/components/common/skeleton/team-dashboard-page-skeleton';
// Import optimized components from centralized location
import {
	LazyTeamStatsChart,
	LazyTeamStatsTable,
	LazyTeamStatsGrid
} from '@/core/components/optimized-components/dashboard';
import { Breadcrumb } from '@/core/components/duplicated-components/breadcrumb';
import { Button } from '@/core/components/duplicated-components/_button';
import { LazyDashboardHeader } from '@/core/components/pages/dashboard/team-dashboard/lazy-components';
import { isTrackingEnabledState } from '@/core/stores';
import { DashboardReportFlow } from '@/core/components/pages/dashboard/team-dashboard/dashboard-report-flow';

function TeamDashboard() {
	const t = useTranslations();
	const [showChart, setShowChart] = useState(false);
	const router = useRouter();
	const paramsUrl = useParams<{ locale: string }>();
	const isTrackingEnabled = useAtomValue(isTrackingEnabledState);

	const { mergedProps, enabled, currentFilters, updateDateRange, isManage } = useActivityFilters();
	const {
		rapportChartActivity,
		refetchChartActivity,
		isLoading: isChartLoading
	} = useActivityChartQuery({ mergedProps, enabled });
	const {
		rapportDailyActivity,
		refetchDailyReport,
		isLoading: isDailyLoading
	} = useActivityDailyReportQuery({ mergedProps, enabled });
	const {
		statisticsCounts,
		refetchStatisticsCounts,
		isLoading: isStatsLoading
	} = useActivityStatisticsQuery({ mergedProps, enabled });
	const loading = isChartLoading || isDailyLoading || isStatsLoading;

	const currentLocale = paramsUrl?.locale;

	const breadcrumbPath = useMemo(
		() => [
			{ title: JSON.parse(t('pages.home.BREADCRUMB')), href: '/' },
			{ title: 'Team-Dashboard', href: `/${currentLocale}/dashboard/team-dashboard` }
		],
		[currentLocale, t]
	);

	const handleBack = () => router.back();

	// Handle filter application - triggers data refetch
	const handleFiltersApply = useCallback(() => {
		// Refetch all dashboard data with current filter state
		refetchChartActivity();
		refetchDailyReport();
		refetchStatisticsCounts();
	}, [refetchChartActivity, refetchDailyReport, refetchStatisticsCounts]);

	// IMPORTANT: This must be AFTER all hooks to avoid "Rendered fewer hooks than expected" error
	if (loading && (!rapportDailyActivity || rapportDailyActivity.length === 0)) {
		return <TeamDashboardPageSkeleton showTimer={isTrackingEnabled} />;
	}

	return (
		<PageLayout
			className="items-start pb-1 w-full"
			childrenClassName="w-full"
			showTimer={isTrackingEnabled}
			mainHeaderSlot={
				<div className="flex flex-col py-4 bg-gray-100 dark:bg-dark--theme">
					<Container className={cn('flex flex-col gap-4 w-full')}>
						<div className="flex items-center pt-6 dark:bg-dark--theme">
							<button
								onClick={handleBack}
								className="p-1 rounded-full transition-colors hover:bg-gray-100"
							>
								<ArrowLeftIcon className="text-dark dark:text-[#6b7280] h-6 w-6" />
							</button>
							<Breadcrumb paths={breadcrumbPath} />
						</div>
						<div className="flex flex-col gap-3">
							<LazyDashboardHeader
								onUpdateDateRangeAction={updateDateRange}
								title={t('dashboard.TEAM_DASHBOARD')}
								isManage={isManage}
								teamName="TEAM-DASHBOARD"
								reportData={rapportDailyActivity || []}
								startDate={new Date(currentFilters.startDate || '')}
								endDate={new Date(currentFilters.endDate || '')}
								onFiltersApply={handleFiltersApply}
							/>
							<LazyTeamStatsGrid
								statisticsCounts={statisticsCounts}
								loadingTimesheetStatisticsCounts={loading}
							/>
						</div>
					</Container>
				</div>
			}
		>
			<Container className={cn('py-5 w-full')}>
				<DashboardReportFlow
					chart={
						<div className="w-full">
							{showChart ? (
								<Card className="relative overflow-hidden w-full dark:bg-dark--theme-light">
									<div className="flex items-center justify-end border-b px-3 py-2 dark:border-white/10">
										<Button
											variant="ghost"
											size="sm"
											className="h-8 gap-1 text-xs"
											onClick={() => setShowChart(false)}
										>
											<ChevronUpIcon className="h-3.5 w-3.5" />
											Hide chart
										</Button>
									</div>
									<LazyTeamStatsChart
										rapportChartActivity={rapportChartActivity}
										isLoading={loading}
									/>
								</Card>
							) : (
								<div className="flex justify-center">
									<Button
										variant="outline"
										size="sm"
										className="h-9 gap-1.5 text-xs"
										onClick={() => setShowChart(true)}
									>
										<ChevronDownIcon className="h-3.5 w-3.5" />
										Show activity chart
									</Button>
								</div>
							)}
						</div>
					}
					table={
						<Suspense fallback={<TeamStatsTableSkeleton />}>
							<Card className="w-full dark:bg-dark--theme-light">
								<LazyTeamStatsTable rapportDailyActivity={rapportDailyActivity} isLoading={loading} />
							</Card>
						</Suspense>
					}
				/>
			</Container>
		</PageLayout>
	);
}

export default withAuthentication(TeamDashboard, {
	displayName: 'Team-dashboard',
	showPageSkeleton: true
});
