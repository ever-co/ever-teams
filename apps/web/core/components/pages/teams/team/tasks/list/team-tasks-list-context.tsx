'use client';

import { createContext, ReactNode, useContext, useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import { useLocale } from 'next-intl';
import { useTaskPrioritiesValue } from '@/core/hooks/tasks/use-task-priorities-value';
import { useTaskSizesValue } from '@/core/hooks/tasks/use-task-sizes-value';
import { activeTeamState, activeTeamTaskState } from '@/core/stores';
import { teamTimerStatusState } from '@/core/stores/timer/team-timer-status';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { ETimerStatus } from '@/core/types/generics/enums/timer';
import { isDoneStatus, statusOfTask, type TeamTasksViewSettings } from '@/core/lib/utils/team-tasks-view';
import type { Person } from '@/core/components/teams/people-avatars';
import type { TStatus, TStatusItem } from '@/core/types/interfaces/task/task-card';
import type { TOrganizationTeamEmployee, TTaskStatus } from '@/core/types/schemas';
import type { TTask } from '@/core/types/schemas/task/task.schema';
import type { TeamTasksGrid } from './team-tasks-grid';

/** What a cell can open in place: the shared picker of the list. */
export type TeamTaskPickerKind = 'status' | 'priority' | 'size' | 'issueType' | 'labels' | 'assignees' | 'dueDate';

export interface TeamTasksListActions {
	openTask: (taskId: string) => void;
	openPicker: (kind: TeamTaskPickerKind, taskIds: string[], anchor: Element) => void;
	openRowMenu: (taskId: string, anchor: Element) => void;
	toggleSelected: (taskId: string, extendsRange: boolean) => void;
	setManySelected: (taskIds: string[], isSelected: boolean) => void;
	toggleGroup: (groupKey: string) => void;
	createTaskInGroup: (statusName: string | null) => void;
	focusTask: (taskId: string) => void;
}

interface TeamTasksListContextValue extends TeamTasksListActions {
	grid: TeamTasksGrid;
	properties: TeamTasksViewSettings['properties'];
	statuses: TTaskStatus[];
	priorityItems: Map<string, TStatusItem>;
	sizeItems: Map<string, TStatusItem>;
	projectNames: Map<string, string>;
	memberNames: Map<string, string>;
	taskById: Map<string, TTask>;
	childCounts: Map<string, number>;
	childDoneCounts: Map<string, number>;
	liveByTask: Map<string, Person[]>;
	formatDay: (value: Date | string) => string;
	formatRelativeDay: (daysFromToday: number) => string;
	now: number;
}

const TeamTasksListContext = createContext<TeamTasksListContextValue | null>(null);

function itemsByValue(values: TStatus<string>) {
	const items = new Map<string, TStatusItem>();
	for (const [key, item] of Object.entries(values)) {
		const value = item.value || key;
		items.set(value, item);
	}
	return items;
}

function isTracking(member: TOrganizationTeamEmployee) {
	const isRunning = member.timerStatus === ETimerStatus.RUNNING;
	const isTrackingTime = Boolean(member.employee?.isTrackingTime);
	return isRunning || isTrackingTime;
}

interface LiveEntry {
	taskId: string;
	person: Person;
}

function liveEntriesOf(members: TOrganizationTeamEmployee[] | null | undefined) {
	const entries: LiveEntry[] = [];
	for (const member of members ?? []) {
		if (!isTracking(member)) {
			continue;
		}
		const taskId = member.activeTaskId ?? member.activeTask?.id;
		if (!taskId) {
			continue;
		}
		const user = member.employee?.user;
		const name = member.employee?.fullName ?? user?.name ?? '';
		entries.push({ taskId, person: { id: member.id, name, imageUrl: user?.imageUrl } });
	}
	return entries;
}

/** How many tasks of the list a member is tracking time on right now. */
export function trackedTaskCountOf(
	members: TOrganizationTeamEmployee[] | null | undefined,
	taskById: Map<string, TTask>
) {
	const taskIds = new Set<string>();
	for (const entry of liveEntriesOf(members)) {
		if (taskById.has(entry.taskId)) {
			taskIds.add(entry.taskId);
		}
	}
	return taskIds.size;
}

function liveMapOf(entries: LiveEntry[]) {
	const byTask = new Map<string, Person[]>();
	for (const entry of entries) {
		const people = byTask.get(entry.taskId) ?? [];
		people.push(entry.person);
		byTask.set(entry.taskId, people);
	}
	return byTask;
}

function childDoneCountsOf(tasks: TTask[], statuses: TTaskStatus[]) {
	const counts = new Map<string, number>();
	for (const task of tasks) {
		const parentId = task.parentId ?? task.parent?.id;
		if (!parentId) {
			continue;
		}
		const status = statusOfTask(task, statuses);
		if (!isDoneStatus(status)) {
			continue;
		}
		const current = counts.get(parentId) ?? 0;
		counts.set(parentId, current + 1);
	}
	return counts;
}

/** The signed-in member's own timer is known before the team's presence catches up with it. */
function ownLiveTaskId(isRunning: boolean, taskId: string | null) {
	if (!isRunning) {
		return null;
	}
	return taskId;
}

interface TeamTasksListProviderProps {
	grid: TeamTasksGrid;
	properties: TeamTasksViewSettings['properties'];
	statuses: TTaskStatus[];
	projectNames: Map<string, string>;
	memberNames: Map<string, string>;
	tasks: TTask[];
	taskById: Map<string, TTask>;
	childCounts: Map<string, number>;
	actions: TeamTasksListActions;
	children: ReactNode;
}

/**
 * Everything a row needs besides its task, read once for the list: the rows subscribe to this context instead of
 * each opening its own queries and atoms. Presence refreshes rebuild the team object; the live map is keyed by its
 * text so the rows only re-render when who tracks what really changes.
 */
export function TeamTasksListProvider({
	grid,
	properties,
	statuses,
	projectNames,
	memberNames,
	tasks,
	taskById,
	childCounts,
	actions,
	children
}: Readonly<TeamTasksListProviderProps>) {
	const locale = useLocale();
	const priorityValues = useTaskPrioritiesValue();
	const sizeValues = useTaskSizesValue();
	const activeTeam = useAtomValue(activeTeamState);
	const activeTeamTask = useAtomValue(activeTeamTaskState);
	const timerStatus = useAtomValue(teamTimerStatusState);
	const { data: user } = useUserQuery();

	const priorityItems = useMemo(() => itemsByValue(priorityValues), [priorityValues]);
	const sizeItems = useMemo(() => itemsByValue(sizeValues), [sizeValues]);
	const childDoneCounts = useMemo(() => childDoneCountsOf(tasks, statuses), [tasks, statuses]);

	const ownLiveTask = ownLiveTaskId(Boolean(timerStatus?.running), activeTeamTask?.id ?? null);
	const liveEntries = liveEntriesOf(activeTeam?.members);
	const ownMember = (activeTeam?.members ?? []).find((member) => member.employee?.userId === user?.id);
	const hasOwnEntry = liveEntries.some((entry) => entry.person.id === ownMember?.id);
	const hasOwnTimer = Boolean(ownLiveTask) && Boolean(ownMember);
	const addsOwnEntry = hasOwnTimer && !hasOwnEntry;
	if (addsOwnEntry) {
		const ownUser = ownMember?.employee?.user;
		const ownName = ownMember?.employee?.fullName ?? ownUser?.name ?? '';
		const ownPerson = { id: ownMember?.id ?? '', name: ownName, imageUrl: ownUser?.imageUrl };
		liveEntries.push({ taskId: ownLiveTask ?? '', person: ownPerson });
	}
	const liveSignature = JSON.stringify(liveEntries);
	const liveByTask = useMemo(() => liveMapOf(JSON.parse(liveSignature) as LiveEntry[]), [liveSignature]);

	const formatters = useMemo(() => {
		const dayFormat = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' });
		const relativeFormat = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
		return {
			formatDay: (value: Date | string) => dayFormat.format(new Date(value)),
			formatRelativeDay: (daysFromToday: number) => relativeFormat.format(daysFromToday, 'day')
		};
	}, [locale]);

	// The day changes rarely; one value per mount keeps every row's due date tone in step.
	const [now] = useState(() => Date.now());

	const value = useMemo<TeamTasksListContextValue>(
		() => ({
			...actions,
			...formatters,
			grid,
			properties,
			statuses,
			priorityItems,
			sizeItems,
			projectNames,
			memberNames,
			taskById,
			childCounts,
			childDoneCounts,
			liveByTask,
			now
		}),
		[
			actions,
			formatters,
			grid,
			properties,
			statuses,
			priorityItems,
			sizeItems,
			projectNames,
			memberNames,
			taskById,
			childCounts,
			childDoneCounts,
			liveByTask,
			now
		]
	);

	return <TeamTasksListContext.Provider value={value}>{children}</TeamTasksListContext.Provider>;
}

export function useTeamTasksList() {
	const value = useContext(TeamTasksListContext);
	if (!value) {
		throw new Error('useTeamTasksList must be used inside TeamTasksListProvider');
	}
	return value;
}
