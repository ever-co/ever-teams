'use client';

import { useParams, usePathname } from 'next/navigation';
import { useAtomValue } from 'jotai';
import { useTranslations } from 'next-intl';
import { PageLayout } from '@/core/components/layouts/default-layout';
import { BreadcrumbSkeleton } from '@/core/components/layouts/page-skeleton';
import { DashboardBreadcrumb } from '@/core/components/dashboards/kit/dashboard-breadcrumb';
import { Dashboard } from '@/core/components/icons';
import { useTeamDashboard } from '@/core/hooks/dashboards/team/use-team-dashboard';
import { useTeamDayBoard } from '@/core/hooks/dashboards/team/use-team-day-board';
import { isTrackingEnabledState } from '@/core/stores';
import { TeamDayTimeline } from './team-day-timeline';
import { TeamFigures } from './team-figures';
import { TEAM_GRID } from './team-grid';
import { TeamHourHeatmap } from './team-hour-heatmap';
import { TeamMembersTable } from './team-members-table';
import { TeamTasksByStatus } from './team-tasks-status';
import { TeamTimeByDay } from './team-time-by-day';
import { TeamToolbar } from './team-toolbar';
import { useTeamExportOptions } from './use-team-export-options';

/**
 * The team at a glance: the figures, the period by day beside the hours of work, today hour by hour, the tasks by
 * status, then every member with time. Each subject appears once.
 */
export function TeamDashboardPage() {
	const t = useTranslations();
	const params = useParams<{ teamId?: string }>();
	const pathname = usePathname();
	const isTrackingEnabled = useAtomValue(isTrackingEnabledState);
	const dashboard = useTeamDashboard({ routeTeamId: params?.teamId });
	const dayBoard = useTeamDayBoard(dashboard);
	const exportOptions = useTeamExportOptions(dashboard);

	const pageTitle = t('dashboard.TEAM_DASHBOARD');
	const teamName = dashboard.pageTeam?.name || t('common.ALL_TEAMS');
	const breadcrumbPaths = [
		{ title: teamName, href: '/' },
		{ title: pageTitle, href: pathname }
	];
	let breadcrumb = <BreadcrumbSkeleton />;
	if (dashboard.areTeamsSettled) {
		breadcrumb = <DashboardBreadcrumb icon={<Dashboard aria-hidden="true" />} paths={breadcrumbPaths} />;
	}

	return (
		<PageLayout
			title={pageTitle}
			showTimer={isTrackingEnabled}
			breadcrumb={breadcrumb}
			mainHeaderSlot={<TeamToolbar dashboard={dashboard} exportOptions={exportOptions} />}
		>
			<div className={TEAM_GRID}>
				<TeamFigures dashboard={dashboard} />
				<TeamTimeByDay dashboard={dashboard} />
				<TeamHourHeatmap
					heat={dayBoard.heat}
					isLoading={dayBoard.isLoading}
					isError={dayBoard.isError}
					onRetry={dayBoard.refetch}
				/>
				<TeamDayTimeline
					timeline={dayBoard.timeline}
					notStarted={dayBoard.notStarted}
					isLoading={dayBoard.isLoading}
					isError={dayBoard.isError}
					onRetry={dayBoard.refetch}
				/>
				<TeamTasksByStatus dashboard={dashboard} />
				<TeamMembersTable dashboard={dashboard} />
			</div>
		</PageLayout>
	);
}
