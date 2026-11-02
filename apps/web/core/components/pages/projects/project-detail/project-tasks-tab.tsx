'use client';

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { AnimatedEmptyState } from '@/core/components/common/empty-state';
import { Skeleton } from '@/core/components/common/skeleton';
import { ChevronRight, Task } from '@/core/components/icons';
import { TaskPropertyIcon } from '@/core/components/tasks/task-property-icon';
import { TaskDrawerLink } from '@/core/components/tasks/drawer/task-drawer-link';
import { AvatarStack, personFromTaskMember } from '@/core/components/teams/people-avatars';
import { formatProjectDay } from '@/core/components/projects/project-cells';
import type { ProjectTaskStatsState } from '@/core/hooks/projects/use-project-task-stats';
import { cn } from '@/core/lib/helpers';
import {
	groupByStatus,
	statusLabelOf,
	realDateOf,
	statusCategoryOf,
	type StatusGroup
} from '@/core/lib/utils/project-list';
import type { TTask } from '@/core/types/schemas/task/task.schema';
import type { TTaskStatus } from '@/core/types/schemas/task/task-status.schema';

const TASK_ROW_GRID =
	'grid grid-cols-[1rem_minmax(0,1fr)_auto] items-center gap-3 px-4 md:grid-cols-[1rem_3.5rem_minmax(0,1fr)_1rem_6rem_5.5rem]';

const SKELETON_ROWS = 6;

function taskNumberOf(task: TTask) {
	const number = task.taskNumber ?? task.number;
	if (!number) {
		return null;
	}
	return `#${number}`;
}

function TaskRow({ task, statuses }: Readonly<{ task: TTask; statuses: TTaskStatus[] }>) {
	const locale = useLocale();
	const number = taskNumberOf(task);
	const people = (task.members ?? []).map(personFromTaskMember);
	const dueDate = realDateOf(task.dueDate);
	const category = statusCategoryOf(task.status, statuses);
	const isDone = category === 'done';
	return (
		<li
			className={cn(
				TASK_ROW_GRID,
				'h-11 transition-colors [contain-intrinsic-size:auto_44px] [content-visibility:auto] hover:bg-foreground/[0.02]'
			)}
		>
			<TaskPropertyIcon kind="issueType" name={task.issueType} />
			<span className="truncate text-xs tabular-nums text-muted-foreground max-md:hidden">{number}</span>
			<TaskDrawerLink
				taskId={task.id}
				className={cn(
					'truncate rounded-sm text-[13px] text-foreground outline-none transition-colors hover:text-primary-ink focus-visible:ring-[3px] focus-visible:ring-ring/25',
					isDone && 'text-muted-foreground line-through decoration-foreground/30'
				)}
			>
				{task.title}
			</TaskDrawerLink>
			<span className="max-md:hidden">
				<TaskPropertyIcon kind="priority" name={task.priority} />
			</span>
			<span className="flex justify-end">
				<AvatarStack people={people} max={3} />
			</span>
			<span className="text-right text-xs tabular-nums text-muted-foreground max-md:hidden">
				{dueDate && formatProjectDay(dueDate, locale)}
			</span>
		</li>
	);
}

function TaskGroup({
	group,
	statuses,
	isCollapsed,
	onToggle
}: Readonly<{ group: StatusGroup<TTask>; statuses: TTaskStatus[]; isCollapsed: boolean; onToggle: () => void }>) {
	const t = useTranslations();
	const noStatusLabel = t('pages.projects.list.NO_STATUS');
	const label = statusLabelOf(group.name, noStatusLabel);
	return (
		<div className="hairline-t border-border first:border-t-0">
			<button
				type="button"
				onClick={onToggle}
				aria-expanded={!isCollapsed}
				className="flex h-10 w-full items-center gap-2 bg-foreground/[0.025] px-3 text-left text-[13px] font-semibold text-foreground outline-none transition-colors hover:bg-foreground/[0.04] focus-visible:bg-foreground/[0.04] dark:bg-foreground/[0.04]"
			>
				<ChevronRight
					className={cn(
						'size-3.5 text-muted-foreground transition-transform duration-200',
						!isCollapsed && 'rotate-90'
					)}
				/>
				<TaskPropertyIcon kind="status" name={group.name} color={group.status?.color} />
				<span className="truncate capitalize">{label}</span>
				<span className="inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-[5px] bg-foreground/[0.06] px-1 text-[11px] font-medium tabular-nums text-muted-foreground">
					{group.items.length}
				</span>
			</button>
			{!isCollapsed && (
				<ul className="hairline-divide-y divide-border">
					{group.items.map((task) => (
						<TaskRow key={task.id} task={task} statuses={statuses} />
					))}
				</ul>
			)}
		</div>
	);
}

function TasksSkeleton() {
	const keys = Array.from({ length: SKELETON_ROWS }, (_, index) => `task-skeleton-${index}`);
	return (
		<div className="rounded-xl bg-card hairline-ring ring-border shadow-sm shadow-black/6.5 hairline-divide-y divide-border">
			{keys.map((key) => (
				<div key={key} className="flex h-11 items-center gap-3 px-4">
					<Skeleton className="size-4 rounded-[4px] bg-foreground/[0.06]" />
					<Skeleton className="h-3 w-56 bg-foreground/[0.06]" />
					<Skeleton className="ml-auto h-5 w-12 rounded-full bg-foreground/[0.06]" />
				</div>
			))}
		</div>
	);
}

export function ProjectTasksTab({
	projectId,
	taskStats,
	statuses
}: Readonly<{ projectId: string; taskStats: ProjectTaskStatsState; statuses: TTaskStatus[] }>) {
	const t = useTranslations();
	const [collapsed, setCollapsed] = useState<string[]>([]);
	const stats = taskStats.statsOf(projectId);
	const tasks = stats?.tasks;
	const groups = useMemo(() => groupByStatus(tasks ?? [], (task) => task.status, statuses), [statuses, tasks]);

	if (!taskStats.hasTeam) {
		return (
			<AnimatedEmptyState
				title={t('pages.projects.detail.NO_TEAM_TITLE')}
				message={t('pages.projects.detail.PICK_TEAM_FOR_TASKS')}
				icon={<Task />}
				minHeight="360px"
			/>
		);
	}
	if (!taskStats.isReady) {
		return <TasksSkeleton />;
	}
	if (!stats) {
		return (
			<AnimatedEmptyState
				title={t('pages.projects.detail.NO_TASKS_TITLE')}
				message={t('pages.projects.list.NO_TASKS_IN_TEAM', { team: taskStats.teamName ?? '' })}
				icon={<Task />}
				minHeight="360px"
			/>
		);
	}

	const toggle = (key: string) => {
		setCollapsed((current) => {
			if (current.includes(key)) {
				return current.filter((value) => value !== key);
			}
			return [...current, key];
		});
	};

	return (
		<div className="mx-auto flex w-full max-w-6xl flex-col gap-2">
			<p className="text-xs text-muted-foreground">
				{t('pages.projects.detail.TASKS_IN_TEAM', { team: taskStats.teamName ?? '' })}
			</p>
			<div className="overflow-clip rounded-xl bg-card hairline-ring ring-border shadow-sm shadow-black/6.5">
				{groups.map((group) => (
					<TaskGroup
						key={group.key}
						group={group}
						statuses={statuses}
						isCollapsed={collapsed.includes(group.key)}
						onToggle={() => toggle(group.key)}
					/>
				))}
			</div>
		</div>
	);
}
