'use client';

import { memo, type CSSProperties, type ReactNode } from 'react';
import { useAtomValue } from 'jotai';
import { useTranslations } from 'next-intl';
import { Checkbox } from '@/core/components/common/checkbox';
import { ChevronRight, Plus, User } from '@/core/components/icons';
import { TaskPropertyIcon, TaskPropertyPlaceholderIcon } from '@/core/components/tasks/task-property-icon';
import { PersonAvatar } from '@/core/components/teams/people-avatars';
import { activeTeamWorkedDurationByTaskState } from '@/core/stores';
import { secondsToTime } from '@/core/lib/helpers/date-and-time';
import { cn } from '@/core/lib/helpers';
import { NONE_VALUE, type TeamTasksGroup } from '@/core/lib/utils/team-tasks-view';
import type { TTask } from '@/core/types/schemas/task/task.schema';
import { useTeamTasksList } from './team-tasks-list-context';
import { TEAM_TASK_WIDE_CELL } from './team-tasks-grid';

const COUNT_CHIP =
	'inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-[5px] bg-foreground/[0.06] px-1 text-[11px] font-medium tabular-nums text-muted-foreground';

type CheckedState = boolean | 'indeterminate';

function readableName(value: string | null | undefined) {
	const text = value ?? '';
	return text.split('-').join(' ');
}

function uniqueIdsOf(tasks: TTask[]) {
	const ids = new Set<string>();
	for (const task of tasks) {
		ids.add(task.id);
	}
	return [...ids];
}

function assigneeOf(tasks: TTask[], employeeId: string) {
	for (const task of tasks) {
		const member = (task.members ?? []).find((candidate) => candidate.id === employeeId);
		if (member) {
			return member;
		}
	}
	return undefined;
}

function workedTotalOf(tasks: TTask[], durations: Map<string, number>) {
	let total = 0;
	for (const task of tasks) {
		total += durations.get(task.id) ?? 0;
	}
	return total;
}

function formatDuration(seconds: number) {
	const { hours, minutes } = secondsToTime(seconds);
	return `${hours}h ${minutes}m`;
}

interface GroupIdentity {
	glyph: ReactNode;
	name: string;
	keepsCase: boolean;
}

function useGroupIdentity(group: TeamTasksGroup): GroupIdentity {
	const t = useTranslations();
	const { priorityItems, memberNames, projectNames } = useTeamTasksList();
	const isNone = group.value === NONE_VALUE;

	if (group.grouping === 'status') {
		if (!group.status) {
			return {
				glyph: <TaskPropertyPlaceholderIcon kind="status" />,
				name: t('pages.teamTasks.NO_STATUS'),
				keepsCase: true
			};
		}
		const glyph = (
			<TaskPropertyIcon
				kind="status"
				name={group.status.name}
				color={group.status.color}
				icon={group.status.icon}
				iconUrl={group.status.fullIconUrl}
			/>
		);
		return { glyph, name: readableName(group.status.name), keepsCase: false };
	}
	if (group.grouping === 'priority') {
		if (isNone) {
			const glyph = <TaskPropertyPlaceholderIcon kind="priority" />;
			return { glyph, name: t('pages.teamTasks.NO_PRIORITY'), keepsCase: true };
		}
		const color = priorityItems.get(group.value)?.bgColor;
		const glyph = <TaskPropertyIcon kind="priority" name={group.value} color={color} />;
		return { glyph, name: readableName(group.value), keepsCase: false };
	}
	if (group.grouping === 'assignee') {
		if (isNone) {
			const glyph = <User className="size-4 text-muted-foreground" />;
			return { glyph, name: t('pages.teamTasks.NO_USER_ASSIGNED'), keepsCase: true };
		}
		const member = assigneeOf(group.tasks, group.value);
		const name = memberNames.get(group.value) ?? member?.fullName ?? '';
		const person = { id: group.value, name, imageUrl: member?.user?.imageUrl };
		const glyph = <PersonAvatar person={person} className="size-5 text-[9px] ring-0" />;
		return { glyph, name, keepsCase: true };
	}
	if (group.grouping === 'project') {
		if (isNone) {
			const glyph = <TaskPropertyPlaceholderIcon kind="project" />;
			return { glyph, name: t('pages.teamTasks.NO_PROJECT'), keepsCase: true };
		}
		const name = projectNames.get(group.value) ?? '';
		return { glyph: <TaskPropertyIcon kind="project" />, name, keepsCase: true };
	}
	if (isNone) {
		const glyph = <TaskPropertyPlaceholderIcon kind="issueType" />;
		return { glyph, name: t('pages.teamTasks.NO_ISSUE_TYPE'), keepsCase: true };
	}
	const glyph = <TaskPropertyIcon kind="issueType" name={group.value} />;
	return { glyph, name: group.value, keepsCase: true };
}

function selectionStateOf(ids: string[], selectedIds: ReadonlySet<string>): CheckedState {
	let selectedCount = 0;
	for (const id of ids) {
		if (selectedIds.has(id)) {
			selectedCount += 1;
		}
	}
	const hasIds = ids.length > 0;
	const isAll = hasIds && selectedCount === ids.length;
	if (isAll) {
		return true;
	}
	if (selectedCount > 0) {
		return 'indeterminate';
	}
	return false;
}

function GroupTotal({ tasks, style }: Readonly<{ tasks: TTask[]; style: CSSProperties }>) {
	const durations = useAtomValue(activeTeamWorkedDurationByTaskState);
	const total = workedTotalOf(tasks, durations);
	if (total <= 0) {
		return null;
	}
	return (
		<span style={style} className="px-1.5 text-xs font-medium tabular-nums text-muted-foreground max-lg:ml-auto">
			{formatDuration(total)}
		</span>
	);
}

/**
 * A group band: fold chevron, the group's glyph and name, its count, "+" to create a task with that status, and
 * the time worked on its tasks under the time column. It stays under the column labels while its rows scroll.
 */
export const TeamTasksGroupHeader = memo(function TeamTasksGroupHeader({
	group,
	isCollapsed,
	selectedIds
}: Readonly<{ group: TeamTasksGroup; isCollapsed: boolean; selectedIds: ReadonlySet<string> }>) {
	const t = useTranslations();
	const { grid, toggleGroup, setManySelected, createTaskInGroup } = useTeamTasksList();
	const identity = useGroupIdentity(group);
	const ids = uniqueIdsOf(group.tasks);
	const checked = selectionStateOf(ids, selectedIds);
	const count = group.tasks.length;
	const isStatusGroup = group.grouping === 'status';
	const progressColumn = grid.columnOf('progress');
	const labelStyle: CSSProperties = { gridColumn: `2 / ${grid.titleColumn + 1}` };
	const showsTotal = progressColumn !== null;
	const totalStyle: CSSProperties = { gridColumn: `${progressColumn}` };

	const handleCheckedChange = (value: boolean) => setManySelected(ids, value);
	const handleCreate = () => createTaskInGroup(group.status?.name ?? null);

	return (
		<div
			role="row"
			aria-expanded={!isCollapsed}
			className="group/band flex h-9 items-center bg-[color-mix(in_oklab,hsl(var(--background)),hsl(var(--foreground))_2.5%)] pr-1 hairline-b border-border max-lg:pl-2 lg:grid lg:[grid-template-columns:var(--team-task-grid)]"
		>
			<span role="gridcell" className={cn(TEAM_TASK_WIDE_CELL, 'flex justify-center')}>
				<Checkbox
					checked={checked}
					onCheckedChange={handleCheckedChange}
					aria-label={t('pages.teamTasks.SELECT_GROUP', { group: identity.name })}
					className={cn(
						checked === false &&
							'opacity-0 transition-opacity group-hover/band:opacity-100 group-focus-within/band:opacity-100 [@media(hover:none)]:opacity-100'
					)}
				/>
			</span>
			<span role="gridcell" style={labelStyle} className="flex min-w-0 items-center gap-1">
				<button
					type="button"
					onClick={() => toggleGroup(group.key)}
					aria-expanded={!isCollapsed}
					className="flex h-7 min-w-0 items-center gap-2 rounded-md pr-2 pl-1 text-[13px] font-semibold text-foreground outline-none transition-colors hover:bg-foreground/5 focus-visible:ring-[3px] focus-visible:ring-ring/25"
				>
					<ChevronRight
						className={cn(
							'size-3.5 shrink-0 text-muted-foreground transition-transform duration-200',
							!isCollapsed && 'rotate-90'
						)}
					/>
					<span className="flex size-4 shrink-0 items-center justify-center">{identity.glyph}</span>
					<span className={cn('truncate', !identity.keepsCase && 'capitalize')}>{identity.name}</span>
					<span className={COUNT_CHIP}>{count}</span>
				</button>
				{isStatusGroup && (
					<button
						type="button"
						onClick={handleCreate}
						aria-label={t('pages.teamTasks.CREATE_IN_GROUP', { group: identity.name })}
						className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 outline-none transition-[opacity,background-color] hover:bg-foreground/5 hover:text-foreground focus-visible:opacity-100 focus-visible:ring-[3px] focus-visible:ring-ring/25 group-hover/band:opacity-100 [@media(hover:none)]:opacity-100"
					>
						<Plus className="size-3.5" />
					</button>
				)}
			</span>
			{showsTotal && <GroupTotal tasks={group.tasks} style={totalStyle} />}
		</div>
	);
});
