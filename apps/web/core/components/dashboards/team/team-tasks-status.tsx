'use client';

import { memo } from 'react';
import { useTranslations } from 'next-intl';
import { DashboardErrorNotice } from '@/core/components/dashboards/kit/dashboard-states';
import { ShareMeter } from '@/core/components/dashboards/kit/meters';
import { SKELETON_BAR } from '@/core/components/dashboards/kit/recipes';
import { TaskDrawerLink } from '@/core/components/tasks/drawer/task-drawer-link';
import type { TeamDashboardState } from '@/core/hooks/dashboards/team/use-team-dashboard';
import { cn } from '@/core/lib/helpers';
import { formatPercent } from '@/core/lib/utils/dashboard-figures';
import type { LaneTask, StatusRow } from '@/core/lib/utils/dashboards/team';
import { taskNumberLabel } from '@/core/lib/utils/team-tasks-view';
import { TeamCard } from './team-card';
import { FULL_SPAN } from './team-grid';
import { AssigneeStack, StatusTile, statusLabelOf, TimeLine } from './team-task-lanes';

const CARD_CLASS = FULL_SPAN;

/** The in-progress list shows as many rows as the status list beside it, so neither column leaves a gap. */
const MIN_SHOWN_IN_PROGRESS = 4;

const BODY_GRID = 'grid min-h-0 gap-x-6 gap-y-4 md:grid-cols-2';

const STATUS_ROW =
	'grid min-h-8 grid-cols-[minmax(0,1fr)_2rem_minmax(2.5rem,4.5rem)_2.5rem] items-center gap-x-2.5 text-[13px]';

const IN_PROGRESS_ROW = 'grid min-h-8 grid-cols-[minmax(0,1fr)_4.75rem_6.5rem] items-center gap-x-3';

const PART_LABEL = 'pb-1 text-xs font-medium text-muted-foreground';

const SKELETON_ROWS = 5;

const StatusBreakdownRow = memo(function StatusBreakdownRow({ row }: Readonly<{ row: StatusRow }>) {
	const label = statusLabelOf(row.status);
	return (
		<li className={STATUS_ROW}>
			<span className="flex min-w-0 items-center gap-2">
				<StatusTile status={row.status} />
				<span className="truncate capitalize text-foreground">{label}</span>
			</span>
			<span className="text-right font-medium tabular-nums text-foreground">{row.count}</span>
			<ShareMeter share={row.share} />
			<span className="text-right text-xs tabular-nums text-muted-foreground">{formatPercent(row.share)}</span>
		</li>
	);
});

const InProgressRow = memo(function InProgressRow({ laneTask }: Readonly<{ laneTask: LaneTask }>) {
	const { task } = laneTask;
	const numberLabel = taskNumberLabel(task);
	return (
		<li className={IN_PROGRESS_ROW}>
			<TaskDrawerLink
				taskId={task.id}
				prefetch={false}
				className="truncate rounded-sm text-[13px] text-foreground underline-offset-2 outline-none hover:underline focus-visible:underline"
			>
				{numberLabel && <span className="mr-1 tabular-nums text-muted-foreground">{numberLabel}</span>}
				{task.title}
			</TaskDrawerLink>
			<span className="flex justify-end">
				<AssigneeStack task={task} />
			</span>
			<span className="flex justify-end">
				<TimeLine laneTask={laneTask} />
			</span>
		</li>
	);
});

function InProgressSkeleton() {
	return (
		<ul aria-hidden="true" className="flex flex-col">
			{Array.from({ length: MIN_SHOWN_IN_PROGRESS }).map((_, index) => (
				<li key={index} className={IN_PROGRESS_ROW}>
					<span className={cn('h-2.5 w-3/5', SKELETON_BAR)} />
					<span className="ml-auto size-5 animate-pulse rounded-full bg-foreground/[0.06]" />
					<span className={cn('ml-auto h-2.5 w-14', SKELETON_BAR)} />
				</li>
			))}
		</ul>
	);
}

function RowsSkeleton() {
	return (
		<ul aria-hidden="true" className="flex flex-col">
			{Array.from({ length: SKELETON_ROWS }).map((_, index) => (
				<li key={index} className={STATUS_ROW}>
					<span className="flex items-center gap-2">
						<span className="size-5 animate-pulse rounded-md bg-foreground/[0.06]" />
						<span className={cn('h-2.5 w-20', SKELETON_BAR)} />
					</span>
					<span className={cn('ml-auto h-2.5 w-5', SKELETON_BAR)} />
					<span className={cn('h-1 w-full', SKELETON_BAR)} />
					<span className={cn('ml-auto h-2 w-6', SKELETON_BAR)} />
				</li>
			))}
		</ul>
	);
}

export function TeamTasksByStatusSkeleton() {
	const t = useTranslations();
	return (
		<TeamCard title={t('dashboard.team.cards.TASKS_BY_STATUS')} className={CARD_CLASS}>
			<div className={BODY_GRID}>
				<RowsSkeleton />
				<RowsSkeleton />
			</div>
		</TeamCard>
	);
}

export function TeamTasksByStatus({ dashboard }: Readonly<{ dashboard: TeamDashboardState }>) {
	const t = useTranslations();
	const { statusRows, inProgressTasks, taskGroups, isTasksLoading, isTasksError, refetchStatuses } = dashboard.live;

	if (isTasksLoading) {
		return <TeamTasksByStatusSkeleton />;
	}

	const title = t('dashboard.team.cards.TASKS_BY_STATUS');

	if (isTasksError) {
		return (
			<TeamCard title={title} className={CARD_CLASS}>
				<DashboardErrorNotice onRetry={refetchStatuses} />
			</TeamCard>
		);
	}

	const hasRows = statusRows.length > 0;
	if (!hasRows) {
		return (
			<TeamCard title={title} className={CARD_CLASS}>
				<p className="py-6 text-center text-[13px] text-muted-foreground text-balance">
					{t('dashboard.team.tasks.EMPTY')}
				</p>
			</TeamCard>
		);
	}

	const meta = t('dashboard.team.tasks.OPEN_COUNT', { count: taskGroups.open });
	const isWorkLoading = dashboard.isReportLoading;
	const hasNoWorkedTask = inProgressTasks.length === 0;
	const showsNoWorkedTask = hasNoWorkedTask && !isWorkLoading;
	const shownCount = Math.max(statusRows.length, MIN_SHOWN_IN_PROGRESS);
	const shownInProgress = inProgressTasks.slice(0, shownCount);
	return (
		<TeamCard title={title} meta={meta} className={CARD_CLASS}>
			<div className={BODY_GRID}>
				<div className="flex min-w-0 flex-col">
					<h3 className={PART_LABEL}>{t('dashboard.team.tasks.BY_STATUS')}</h3>
					<ul className="flex flex-col">
						{statusRows.map((row) => (
							<StatusBreakdownRow key={row.status.id} row={row} />
						))}
					</ul>
				</div>
				<div className="flex min-w-0 flex-col">
					<h3 className={PART_LABEL}>{t('dashboard.team.tasks.IN_PROGRESS_WORKED')}</h3>
					{isWorkLoading && <InProgressSkeleton />}
					{showsNoWorkedTask && (
						<p className="py-2 text-xs text-muted-foreground text-pretty">
							{t('dashboard.team.tasks.NO_IN_PROGRESS')}
						</p>
					)}
					{!isWorkLoading && (
						<ul className="flex flex-col">
							{shownInProgress.map((laneTask) => (
								<InProgressRow key={laneTask.task.id} laneTask={laneTask} />
							))}
						</ul>
					)}
				</div>
			</div>
		</TeamCard>
	);
}
