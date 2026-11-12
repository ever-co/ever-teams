'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useLocale, useTranslations } from 'next-intl';
import { AnimatedEmptyState } from '@/core/components/common/empty-state';
import { SegmentedControl, type SegmentedControlItem } from '@/core/components/common/segmented-control';
import { Skeleton } from '@/core/components/common/skeleton';
import { Tooltip } from '@/core/components/duplicated-components/tooltip';
import { ChevronRight, Task } from '@/core/components/icons';
import { TEAM_TASKS_LAYOUT_OPTIONS } from '@/core/components/pages/teams/team/tasks/list/team-tasks-layout-options';
import { TaskPropertyIcon } from '@/core/components/tasks/task-property-icon';
import { TaskDrawerLink } from '@/core/components/tasks/drawer/task-drawer-link';
import { AvatarStack, personFromTaskMember } from '@/core/components/teams/people-avatars';
import { formatProjectDay } from '@/core/components/projects/project-cells';
import { useLocalStorageState } from '@/core/hooks/common/use-local-storage-state';
import type { ProjectTaskStatsState } from '@/core/hooks/projects/use-project-task-stats';
import { cn } from '@/core/lib/helpers';
import {
	groupByStatus,
	statusLabelOf,
	realDateOf,
	statusCategoryOf,
	type StatusGroup
} from '@/core/lib/utils/project-list';
import { isTaskViewsEnabled } from '@/core/lib/utils/task-views-enabled';
import type { TTask } from '@/core/types/schemas/task/task.schema';
import type { TTaskStatus } from '@/core/types/schemas/task/task-status.schema';
import type { ProjectTasksLayout } from './project-tasks-view';

const TASK_ROW_GRID =
	'grid grid-cols-[1rem_minmax(0,1fr)_auto] items-center gap-3 px-4 md:grid-cols-[1rem_3.5rem_minmax(0,1fr)_1rem_6rem_5.5rem]';

const SKELETON_ROWS = 6;

/** The layout picked for a project's tasks, on this device, the same for every project. */
const LAYOUT_STORAGE_KEY = 'project-tasks-layout';

type ProjectTasksTabLayout = 'list' | ProjectTasksLayout;

const LAYOUTS_ON_EVERY_DEPLOYMENT: ProjectTasksTabLayout[] = ['list', 'calendar'];

/** The timeline comes with the saved views, as on Team tasks. */
const LAYOUTS_WITH_SAVED_VIEWS: ProjectTasksTabLayout[] = ['list', 'calendar', 'timeline'];

/**
 * The frame of the calendar and the timeline: most of the screen, its small height (the one without the browser's
 * bars) so it never jumps on a scroll, and a lower floor on a phone, where it would not fit in landscape.
 */
const LAYOUT_FRAME = 'h-[min(78svh,760px)] min-h-80 sm:min-h-120 rounded-xl bg-card hairline-ring ring-border';

/** The calendar and the timeline load when one is first picked, so the project's page keeps its weight. */
const ProjectTasksLayoutView = dynamic(
	() => import('./project-tasks-layouts').then((mod) => ({ default: mod.ProjectTasksLayoutView })),
	{ ssr: false, loading: () => <Skeleton className={cn(LAYOUT_FRAME, 'bg-foreground/[0.04]')} /> }
);

function projectTasksLayouts() {
	if (isTaskViewsEnabled()) {
		return LAYOUTS_WITH_SAVED_VIEWS;
	}
	return LAYOUTS_ON_EVERY_DEPLOYMENT;
}

/** The layout the tab shows: the one stored on the device when this deployment offers it, the list otherwise. */
function shownLayoutOf(stored: unknown, layouts: readonly ProjectTasksTabLayout[]): ProjectTasksTabLayout {
	const isOffered = layouts.includes(stored as ProjectTasksTabLayout);
	if (!isOffered) {
		return 'list';
	}
	return stored as ProjectTasksTabLayout;
}

/** The switch of Team tasks, with the layouts a project's tasks are shown in: glyph, name and the same hints. */
function ProjectTasksLayoutSwitch({
	layouts,
	value,
	onChange
}: Readonly<{
	layouts: readonly ProjectTasksTabLayout[];
	value: ProjectTasksTabLayout;
	onChange: (layout: ProjectTasksTabLayout) => void;
}>) {
	const t = useTranslations();
	const items = useMemo<SegmentedControlItem<ProjectTasksTabLayout>[]>(
		() =>
			layouts.map((layout) => {
				const { Icon, labelKey } = TEAM_TASKS_LAYOUT_OPTIONS[layout];
				return {
					value: layout,
					icon: <Icon />,
					label: <span className="max-sm:sr-only">{t(labelKey)}</span>
				};
			}),
		[layouts, t]
	);
	return (
		<SegmentedControl
			items={items}
			value={value}
			onValueChange={onChange}
			ariaLabel={t('pages.teamTasks.LAYOUT')}
			renderItem={(item, button) => (
				<Tooltip
					label={t(TEAM_TASKS_LAYOUT_OPTIONS[item.value].hintKey)}
					placement="bottom"
					className="z-20"
					labelContainerClassName="w-fit! max-w-64"
				>
					{button}
				</Tooltip>
			)}
		/>
	);
}

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

/**
 * A project's tasks of the active team, as a list grouped by status, a calendar or a timeline (the Team tasks views),
 * picked from the same switch as Team tasks and remembered on the device.
 */
export function ProjectTasksTab({
	projectId,
	taskStats,
	statuses
}: Readonly<{ projectId: string; taskStats: ProjectTaskStatsState; statuses: TTaskStatus[] }>) {
	const t = useTranslations();
	const [collapsed, setCollapsed] = useState<string[]>([]);
	const [storedLayout, setStoredLayout] = useLocalStorageState<unknown>(LAYOUT_STORAGE_KEY, 'list');
	const stats = taskStats.statsOf(projectId);
	const tasks = stats?.tasks;
	const groups = useMemo(() => groupByStatus(tasks ?? [], (task) => task.status, statuses), [statuses, tasks]);
	const layouts = projectTasksLayouts();
	const layout = shownLayoutOf(storedLayout, layouts);

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

	const isList = layout === 'list';

	return (
		<div className="mx-auto flex w-full max-w-6xl flex-col gap-2">
			<div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
				<p className="text-xs text-muted-foreground">
					{t('pages.projects.detail.TASKS_IN_TEAM', { team: taskStats.teamName ?? '' })}
				</p>
				<ProjectTasksLayoutSwitch layouts={layouts} value={layout} onChange={setStoredLayout} />
			</div>
			{isList && (
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
			)}
			{!isList && <ProjectTasksLayoutView layout={layout} tasks={stats.tasks} className={LAYOUT_FRAME} />}
		</div>
	);
}
