'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
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

function TeamDashboard() {
	const { activeTeam, isTrackingEnabled } = useOrganizationTeams();
	const t = useTranslations();
	const fullWidth = useAtomValue(fullWidthState);
	const paramsUrl = useParams<{ locale: string }>();
	const currentLocale = paramsUrl?.locale;

	const breadcrumbPath = useMemo(
		() => [
			{ title: JSON.parse(t('pages.home.BREADCRUMB')), href: '/' },
			{ title: activeTeam?.name || '', href: '/' },
			{ title: 'team-dashboard', href: `/${currentLocale}/dashboard/team-dashboard` }
		],
		[activeTeam?.name, currentLocale, t]
	);

	return (
		<MainLayout
			className="items-start pb-1 !overflow-hidden w-full"
			childrenClassName="w-full"
			showTimer={isTrackingEnabled}
			mainHeaderSlot={
				<div className="flex flex-col py-4 bg-gray-100 dark:bg-dark--theme">
					<Container fullWidth={fullWidth} className={cn('flex flex-col gap-4 w-full')}>
						<div className="flex pt-6 w-full dark:bg-dark--theme">
							<ArrowLeftIcon className="text-dark dark:text-[#6b7280] h-6 w-6" />
							<Breadcrumb paths={breadcrumbPath} className="text-sm" />
						</div>
						<div className="flex flex-col gap-4 px-6 pt-4 w-full">
							<DashboardHeader />
							<TeamStatsGrid />
							<Card className="p-6 w-full">
								<TeamStatsChart />
							</Card>
						</div>
					</Container>
				</div>
			}
		>
			<Container fullWidth={fullWidth} className={cn('flex flex-col gap-8 py-6 w-full')}>
				<Card className="p-6 w-full">
					<TeamStatsTable />
				</Card>
			</Container>
		</MainLayout>
	);
}

export default withAuthentication(TeamDashboard, { 
	displayName: 'Team-dashboard', 
	showPageSkeleton: true 
});
