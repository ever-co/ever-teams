'use client';

import { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { ArrowLeftIcon, ChevronUpIcon, ChevronDownIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { TeamStatsChart } from './components/team-stats-chart';

function TeamDashboard() {
	const t = useTranslations();
	const [showChart, setShowChart] = useState(false);
	const router = useRouter();
	const fullWidth = useAtomValue(fullWidthState);
	const paramsUrl = useParams<{ locale: string }>();
	const { isTrackingEnabled } = useOrganizationTeams();

	const {
		rapportChartActivity,
		rapportDailyActivity,
		statisticsCounts,
		updateDateRange,
		loading,
		isManage,
		currentFilters
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
						<div className="flex flex-col gap-3">
							<DashboardHeader
								onUpdateDateRange={updateDateRange}
								title="Team Dashboard"
								isManage={isManage}
								teamName="TEAM-DASHBOARD"
								reportData={rapportDailyActivity || []}
								startDate={new Date(currentFilters.startDate || '')}
								endDate={new Date(currentFilters.endDate || '')}
							/>
							<TeamStatsGrid
								statisticsCounts={statisticsCounts}
								loadingTimesheetStatisticsCounts={loading}
							/>
							<div className="w-full">
								{!showChart && (
									<div className="flex items-center justify-center bg-gradient-to-t from-gray-50/60 dark:from-gray-900/60 to-transparent py-0.5">
										<Button
											variant="ghost"
											size="sm"
											className="gap-0.5 text-[10px] tracking-tight font-normal text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 px-1.5 h-4 rounded-t-none hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-transform duration-300"
											onClick={() => setShowChart(!showChart)}
										>
											<ChevronUpIcon
												className={`h-2.5 w-2.5 transition-transform duration-300 transform rotate-0`}
											/>
										</Button>
									</div>
								)}
								{showChart && (
									<Card className="w-full dark:bg-dark--theme-light transition-all duration-300 ease-in-out transform origin-top overflow-hidden">
										<div className="transition-all duration-300 ease-in-out transform origin-top scale-y-100 opacity-100 h-auto">
											<div className="relative">
												<TeamStatsChart
													rapportChartActivity={rapportChartActivity}
													isLoading={loading}
												/>
												<div className="absolute bottom-0 left-0 right-0 flex items-center justify-center bg-gradient-to-t from-gray-50/60 dark:from-gray-900/60 to-transparent py-0.5">
													<Button
														variant="ghost"
														size="sm"
														className="gap-0.5 text-[10px] tracking-tight font-normal text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 px-1.5 h-4 rounded-t-none hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-transform duration-300"
														onClick={() => setShowChart(!showChart)}
													>
														<ChevronDownIcon
															className={`h-2.5 w-2.5 transition-transform duration-300 rotate-0`}
														/>
													</Button>
												</div>
											</div>
										</div>
									</Card>
								)}
							</div>
						</div>
					</Container>
				</div>
			}
		>
			<Container fullWidth={fullWidth} className={cn('flex flex-col gap-8 !px-4 py-6 w-full')}>
				<Card className="w-full dark:bg-dark--theme-light">
					<TeamStatsTable rapportDailyActivity={rapportDailyActivity} isLoading={loading} />
				</Card>
			</Container>
		</MainLayout>
	);
}

export default withAuthentication(TeamDashboard, {
	displayName: 'Team-dashboard',
	showPageSkeleton: true
});
