'use client';

import { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { ArrowLeftIcon } from 'lucide-react';
import { TeamStatsChart } from './components/team-stats-chart';
import { TeamStatsGrid } from './components/team-stats-grid';
import { TeamStatsTable } from './components/team-stats-table';
import { DashboardHeader } from './components/dashboard-header';
import { useOrganizationTeams } from '@app/hooks/features/useOrganizationTeams';
import { MainLayout } from '@/lib/layout';
import { Breadcrumb, Container } from '@/lib/components';
import { cn } from '@/lib/utils';
import { useAtomValue } from 'jotai';
import { fullWidthState } from '@app/stores/fullWidth';
import { withAuthentication } from '@/lib/app/authenticator';
import { useReportActivity } from '@/app/hooks/features/useReportActivity';
import { useTranslations } from 'next-intl';

function TeamDashboard() {
	const t = useTranslations();
	const router = useRouter();
	const fullWidth = useAtomValue(fullWidthState);
	const paramsUrl = useParams<{ locale: string }>();
	const { isTrackingEnabled } = useOrganizationTeams();

	const {
		rapportChartActivity,
		rapportDailyActivity,
		statisticsCounts,
		updateDateRange,
		updateFilters,
		loadingTimeLogReportDailyChart,
		loadingTimeLogReportDaily,
		loadingTimesheetStatisticsCounts,
		isManage
	} = useReportActivity({ types: 'TEAM-DASHBOARD' });

	const currentLocale = paramsUrl?.locale;

	const breadcrumbPath = useMemo(
		() => [
			{ title: JSON.parse(t('pages.home.BREADCRUMB')), href: '/' },
			{ title: 'Team-Dashboard', href: `/${currentLocale}/dashboard/team-dashboard` }
		],
		[currentLocale, t]
	);

	const handleBack = () => router.back();

	return (
		<MainLayout
			className="items-start pb-1 !overflow-hidden w-full"
			childrenClassName="w-full"
			showTimer={isTrackingEnabled}
			mainHeaderSlot={
				<div className="flex flex-col py-4 bg-gray-100 dark:bg-dark--theme">
					<Container fullWidth={fullWidth} className={cn('flex flex-col gap-4 w-full')}>
						<div className="flex items-center pt-6 dark:bg-dark--theme">
							<button
								onClick={handleBack}
								className="p-1 rounded-full transition-colors hover:bg-gray-100"
							>
								<ArrowLeftIcon className="text-dark dark:text-[#6b7280] h-6 w-6" />
							</button>
							<Breadcrumb paths={breadcrumbPath} />
						</div>
						<div className="flex flex-col gap-6">
							<DashboardHeader
								onUpdateDateRange={updateDateRange}
								onUpdateFilters={updateFilters}
								title="Team Dashboard"
								isManage={isManage}
							/>
							<TeamStatsGrid
								statisticsCounts={statisticsCounts}
								loadingTimesheetStatisticsCounts={loadingTimesheetStatisticsCounts}
							/>

							<Card className="w-full dark:bg-dark--theme-light">
								<TeamStatsChart
									rapportChartActivity={rapportChartActivity}
									isLoading={loadingTimeLogReportDailyChart}
								/>
							</Card>
						</div>
					</Container>
				</div>
			}
		>
			<Container fullWidth={fullWidth} className={cn('flex flex-col gap-8 !px-4 py-6 w-full')}>
				<Card className="w-full dark:bg-dark--theme-light min-h-[500px]">
					<TeamStatsTable
						rapportDailyActivity={rapportDailyActivity}
						isLoading={loadingTimeLogReportDaily}
					/>
				</Card>
			</Container>
		</MainLayout>
	);
}

export default withAuthentication(TeamDashboard, {
	displayName: 'Team-dashboard',
	showPageSkeleton: true
});
