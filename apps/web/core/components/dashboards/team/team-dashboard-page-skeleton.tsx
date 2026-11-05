'use client';

import { useTranslations } from 'next-intl';
import { PageSkeletonFrame, ToolbarBandSkeleton } from '@/core/components/layouts/page-skeleton';
import { TeamDayTimelineSkeleton } from './team-day-timeline';
import { TeamFiguresSkeleton } from './team-figures';
import { TEAM_GRID } from './team-grid';
import { TeamHourHeatmapSkeleton } from './team-hour-heatmap';
import { TeamMembersTableSkeleton } from './team-members-table';
import { TeamTasksByStatusSkeleton } from './team-tasks-status';
import { TeamTimeByDaySkeleton } from './team-time-by-day';

/** The filter menu's width, also held by the toolbar while the teams it lists are not read yet. */
export const TEAM_FILTER_PILL_WIDTH = 'w-21';

const ACTION_WIDTHS = ['w-29.25'];

const CONTROL_WIDTHS = ['w-42.25', 'w-px', TEAM_FILTER_PILL_WIDTH];

export function TeamDashboardPageSkeleton() {
	const t = useTranslations();
	return (
		<PageSkeletonFrame
			toolbar={
				<ToolbarBandSkeleton
					title={t('dashboard.TEAM_DASHBOARD')}
					actionWidths={ACTION_WIDTHS}
					controlWidths={CONTROL_WIDTHS}
				/>
			}
		>
			<div inert className={TEAM_GRID}>
				<TeamFiguresSkeleton />
				<TeamTimeByDaySkeleton />
				<TeamHourHeatmapSkeleton />
				<TeamDayTimelineSkeleton />
				<TeamTasksByStatusSkeleton />
				<TeamMembersTableSkeleton />
			</div>
		</PageSkeletonFrame>
	);
}
