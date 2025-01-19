'use client';
import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeftIcon, ChevronDown } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TeamStatsChart } from './components/team-stats-chart';
import { TeamStatsGrid } from './components/team-stats-grid';
import { TeamStatsTable } from './components/team-stats-table';
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
	const currentLocale = paramsUrl ? paramsUrl.locale : null;
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
				<div className="py-6 w-full bg-white dark:bg-dark--theme">
					<Container
						fullWidth={fullWidth}
						className={cn('flex flex-row gap-8 justify-start items-center w-full')}
					>
						<ArrowLeftIcon className="text-dark dark:text-[#6b7280] h-6 w-6" />
						<Breadcrumb paths={breadcrumbPath} className="text-sm" />
					</Container>
				</div>
			}
		>
			<div className="flex flex-col gap-4 p-6 w-full">
				<div className="flex justify-between items-center">
					<h1 className="text-2xl font-semibold">Team Dashboard</h1>
					<div className="flex gap-4 items-center">
						<Button variant="outline" className="gap-2">
							Oct 1-7 2024
							<ChevronDown className="w-4 h-4" />
						</Button>
						<Select defaultValue="filter">
							<SelectTrigger className="w-[100px]">
								<SelectValue placeholder="Filter" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="filter">Filter</SelectItem>
								<SelectItem value="today">Today</SelectItem>
								<SelectItem value="week">This Week</SelectItem>
								<SelectItem value="month">This Month</SelectItem>
							</SelectContent>
						</Select>
						<Select defaultValue="export">
							<SelectTrigger className="w-[100px]">
								<SelectValue placeholder="Export" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="export">Export</SelectItem>
								<SelectItem value="csv">CSV</SelectItem>
								<SelectItem value="pdf">PDF</SelectItem>
								<SelectItem value="excel">Excel</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>
				<TeamStatsGrid />
				<Card className="p-6">
					<TeamStatsChart />
				</Card>
				<Card className="p-6">
					<TeamStatsTable />
				</Card>
			</div>
		</MainLayout>
	);
}
export default withAuthentication(TeamDashboard, { displayName: 'Team-dashboard', showPageSkeleton: true });
