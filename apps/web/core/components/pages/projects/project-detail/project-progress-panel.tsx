'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { SegmentedControl } from '@/core/components/common/segmented-control';
import { Skeleton } from '@/core/components/common/skeleton';
import { Avatar, AvatarFallback } from '@/core/components/common/avatar';
import { User } from '@/core/components/icons';
import { TaskPropertyIcon } from '@/core/components/tasks/task-property-icon';
import { PersonAvatar, personFromTaskMember, type Person } from '@/core/components/teams/people-avatars';
import { MUTED_VALUE, ProgressRing } from '@/core/components/projects/project-cells';
import type { ProjectTaskStatsState } from '@/core/hooks/projects/use-project-task-stats';
import { cn } from '@/core/lib/helpers';
import {
	completionPercentOf,
	groupByStatus,
	statusLabelOf,
	statusCategoryOf,
	type ProjectTaskStats
} from '@/core/lib/utils/project-list';
import type { TTask } from '@/core/types/schemas/task/task.schema';
import type { TTaskStatus } from '@/core/types/schemas/task/task-status.schema';
import { isSavedTeamLoading } from '@/core/lib/helpers/saved-team';
import { ProjectActivityChart } from './project-activity-chart';
import { ProjectProgressFiguresSkeleton } from './project-detail-skeleton';

type Breakdown = 'assignees' | 'status';

const NO_ASSIGNEE_KEY = '__no-assignee__';

const SQUARE = 'size-2 shrink-0 rounded-[2px]';

interface AssigneeShare {
	key: string;
	person: Person | null;
	total: number;
	done: number;
}

function sharesByAssignee(tasks: TTask[], statuses: TTaskStatus[]) {
	const shares = new Map<string, AssigneeShare>();
	const addTo = (key: string, person: Person | null, isDone: boolean) => {
		const share = shares.get(key) ?? { key, person, total: 0, done: 0 };
		share.total += 1;
		if (isDone) {
			share.done += 1;
		}
		shares.set(key, share);
	};
	for (const task of tasks) {
		const category = statusCategoryOf(task.status, statuses);
		const isDone = category === 'done';
		const members = task.members ?? [];
		if (members.length === 0) {
			addTo(NO_ASSIGNEE_KEY, null, isDone);
			continue;
		}
		for (const member of members) {
			const person = personFromTaskMember(member);
			addTo(person.id, person, isDone);
		}
	}
	const ordered = [...shares.values()];
	ordered.sort((a, b) => {
		const isNoAssigneeA = a.key === NO_ASSIGNEE_KEY;
		const isNoAssigneeB = b.key === NO_ASSIGNEE_KEY;
		if (isNoAssigneeA !== isNoAssigneeB) {
			return Number(isNoAssigneeA) - Number(isNoAssigneeB);
		}
		return b.total - a.total;
	});
	return ordered;
}

function percentOf(part: number, total: number) {
	if (total === 0) {
		return 0;
	}
	return (part / total) * 100;
}

function Figure({ label, value, squareClass }: Readonly<{ label: string; value: number; squareClass: string }>) {
	return (
		<div className="flex flex-col gap-1">
			<span className="flex items-center gap-1.5 text-xs text-muted-foreground">
				<span className={cn(SQUARE, squareClass)} />
				{label}
			</span>
			<span className="text-lg font-semibold tabular-nums text-foreground">{value}</span>
		</div>
	);
}

function ScopeBar({ stats }: Readonly<{ stats: ProjectTaskStats }>) {
	const doneWidth = percentOf(stats.done, stats.total);
	const startedWidth = percentOf(stats.started, stats.total);
	return (
		<div className="flex h-1.5 w-full overflow-hidden rounded-full bg-foreground/[0.07]">
			<span className="h-full bg-primary" style={{ width: `${doneWidth}%` }} />
			<span className="h-full bg-warning" style={{ width: `${startedWidth}%` }} />
		</div>
	);
}

function NoAssigneeFace() {
	return (
		<Avatar className="size-6 border border-dashed border-foreground/25 bg-transparent ring-0">
			<AvatarFallback className="bg-transparent text-muted-foreground">
				<User className="size-3.5" />
			</AvatarFallback>
		</Avatar>
	);
}

function AssigneeRows({ tasks, statuses }: Readonly<{ tasks: TTask[]; statuses: TTaskStatus[] }>) {
	const t = useTranslations();
	const shares = useMemo(() => sharesByAssignee(tasks, statuses), [statuses, tasks]);
	return (
		<ul className="flex flex-col">
			{shares.map((share) => {
				const percent = completionPercentOf(share);
				const name = share.person?.name ?? t('pages.projects.detail.NO_ASSIGNEE');
				return (
					<li key={share.key} className="flex h-10 items-center gap-2.5">
						{share.person && <PersonAvatar person={share.person} size="sm" className="ring-0" />}
						{!share.person && <NoAssigneeFace />}
						<span className="min-w-0 flex-1 truncate text-[13px] text-foreground">{name}</span>
						<ProgressRing percent={percent} />
						<span className="w-24 text-right text-xs tabular-nums text-muted-foreground">
							{t('pages.projects.detail.SHARE_OF', { percent, total: share.total })}
						</span>
					</li>
				);
			})}
		</ul>
	);
}

function StatusRows({ tasks, statuses }: Readonly<{ tasks: TTask[]; statuses: TTaskStatus[] }>) {
	const t = useTranslations();
	const noStatusLabel = t('pages.projects.list.NO_STATUS');
	const groups = useMemo(() => groupByStatus(tasks, (task) => task.status, statuses), [statuses, tasks]);
	return (
		<ul className="flex flex-col">
			{groups.map((group) => {
				const count = group.items.length;
				const share = percentOf(count, tasks.length);
				const label = statusLabelOf(group.name, noStatusLabel);
				return (
					<li key={group.key} className="flex h-10 flex-col justify-center gap-1.5">
						<span className="flex items-center gap-2">
							<TaskPropertyIcon kind="status" name={group.name} color={group.status?.color} />
							<span className="min-w-0 flex-1 truncate text-[13px] capitalize text-foreground">
								{label}
							</span>
							<span className="text-xs tabular-nums text-muted-foreground">{count}</span>
						</span>
						<span className="ml-6 h-1 overflow-hidden rounded-full bg-foreground/[0.06]">
							<span
								className="block h-full rounded-full bg-foreground/25"
								style={{ width: `${share}%` }}
							/>
						</span>
					</li>
				);
			})}
		</ul>
	);
}

function PanelShell({
	caption,
	isCaptionLoading = false,
	children
}: Readonly<{ caption: string | null; isCaptionLoading?: boolean; children: React.ReactNode }>) {
	const t = useTranslations();
	return (
		<section className="flex flex-col gap-4 p-4">
			<div className="flex flex-col gap-0.5">
				<h2 className="text-[13px] font-semibold text-foreground">{t('common.PROGRESS')}</h2>
				{isCaptionLoading && (
					<span className="flex h-4 items-center">
						<Skeleton className="h-2.5 w-40 rounded-full bg-foreground/[0.06]" />
					</span>
				)}
				{caption && <p className="text-xs text-muted-foreground">{caption}</p>}
			</div>
			{children}
		</section>
	);
}

export function ProjectProgressPanel({
	projectId,
	taskStats,
	statuses
}: Readonly<{ projectId: string; taskStats: ProjectTaskStatsState; statuses: TTaskStatus[] }>) {
	const t = useTranslations();
	const [breakdown, setBreakdown] = useState<Breakdown>('assignees');

	if (isSavedTeamLoading(taskStats.hasTeam)) {
		return (
			<PanelShell caption={null} isCaptionLoading>
				<ProjectProgressFiguresSkeleton />
			</PanelShell>
		);
	}

	if (!taskStats.hasTeam) {
		return (
			<PanelShell caption={null}>
				<p className={MUTED_VALUE}>{t('pages.projects.detail.PICK_TEAM_FOR_PROGRESS')}</p>
			</PanelShell>
		);
	}

	const caption = t('pages.projects.detail.TASKS_IN_TEAM', { team: taskStats.teamName ?? '' });

	if (!taskStats.isReady) {
		return (
			<PanelShell caption={caption}>
				<ProjectProgressFiguresSkeleton />
			</PanelShell>
		);
	}

	const stats = taskStats.statsOf(projectId);
	if (!stats) {
		return (
			<PanelShell caption={caption}>
				<p className={MUTED_VALUE}>
					{t('pages.projects.list.NO_TASKS_IN_TEAM', { team: taskStats.teamName ?? '' })}
				</p>
			</PanelShell>
		);
	}

	const isByAssignee = breakdown === 'assignees';

	return (
		<PanelShell caption={caption}>
			<div className="grid grid-cols-3 gap-3">
				<Figure label={t('pages.projects.detail.SCOPE')} value={stats.total} squareClass="bg-foreground/25" />
				<Figure label={t('pages.projects.list.STARTED')} value={stats.started} squareClass="bg-warning" />
				<Figure label={t('pages.projects.detail.COMPLETED')} value={stats.done} squareClass="bg-primary" />
			</div>
			<ScopeBar stats={stats} />
			<SegmentedControl<Breakdown>
				items={[
					{ value: 'assignees', label: t('pages.projects.detail.BY_ASSIGNEE') },
					{ value: 'status', label: t('common.STATUS') }
				]}
				value={breakdown}
				onValueChange={setBreakdown}
				ariaLabel={t('pages.projects.detail.BREAKDOWN')}
				className="w-full [&>button]:flex-1"
			/>
			{isByAssignee && <AssigneeRows tasks={stats.tasks} statuses={statuses} />}
			{!isByAssignee && <StatusRows tasks={stats.tasks} statuses={statuses} />}
			<ProjectActivityChart tasks={stats.tasks} statuses={statuses} />
		</PanelShell>
	);
}
