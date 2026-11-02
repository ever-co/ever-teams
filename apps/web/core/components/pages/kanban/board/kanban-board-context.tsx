'use client';

import { createContext, ReactNode, useContext, useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { useTaskPrioritiesValue } from '@/core/hooks/tasks/use-task-priorities-value';
import { useTaskSizesValue } from '@/core/hooks/tasks/use-task-sizes-value';
import { activeTeamState, activeTeamTaskState } from '@/core/stores';
import { teamTimerStatusState } from '@/core/stores/timer/team-timer-status';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import type { TStatus, TStatusItem } from '@/core/types/interfaces/task/task-card';
import type { TOrganizationTeamEmployee, TTaskStatus } from '@/core/types/schemas';
import type { TTask } from '@/core/types/schemas/task/task.schema';

export interface KanbanBoardActions {
	moveTask: (task: TTask, toStatus: TTaskStatus, toIndex: number) => void;
	openTask: (task: TTask) => void;
	createTaskIn: (status: TTaskStatus) => void;
	editStatus: (status: TTaskStatus) => void;
	setLaneCollapsed: (status: TTaskStatus, isCollapsed: boolean) => void;
}

interface KanbanBoardContextValue extends KanbanBoardActions {
	statuses: TTaskStatus[];
	priorityItems: Map<string, TStatusItem>;
	sizeItems: Map<string, TStatusItem>;
	liveTaskId: string | null;
}

interface KanbanBoardMembers {
	teamMembers: TOrganizationTeamEmployee[];
	currentMember: TOrganizationTeamEmployee | undefined;
}

const KanbanBoardContext = createContext<KanbanBoardContextValue | null>(null);

// Apart from the card context: the team is rebuilt on every presence refresh, and only an open card menu lists members.
const KanbanBoardMembersContext = createContext<KanbanBoardMembers | null>(null);

function itemsByValue(values: TStatus<string>) {
	const items = new Map<string, TStatusItem>();
	for (const [key, item] of Object.entries(values)) {
		const value = item.value || key;
		items.set(value, item);
	}
	return items;
}

function liveTaskIdOf(isTimerRunning: boolean, activeTaskId: string | null) {
	if (!isTimerRunning) {
		return null;
	}
	return activeTaskId;
}

/**
 * Everything a card needs besides its task, read once for the whole board: a hundred cards then subscribe to one
 * context instead of each opening its own atoms and queries, which made the previous board slow.
 */
export function KanbanBoardProvider({
	statuses,
	actions,
	children
}: Readonly<{ statuses: TTaskStatus[]; actions: KanbanBoardActions; children: ReactNode }>) {
	const priorityValues = useTaskPrioritiesValue();
	const sizeValues = useTaskSizesValue();
	const activeTeamTask = useAtomValue(activeTeamTaskState);
	const timerStatus = useAtomValue(teamTimerStatusState);
	const activeTeam = useAtomValue(activeTeamState);
	const { data: user } = useUserQuery();

	const isTimerRunning = Boolean(timerStatus?.running);
	const activeTaskId = activeTeamTask?.id ?? null;
	const liveTaskId = liveTaskIdOf(isTimerRunning, activeTaskId);
	const teamMembers = useMemo(() => activeTeam?.members ?? [], [activeTeam?.members]);
	const currentMember = teamMembers.find((member) => member.employee?.userId === user?.id);

	const priorityItems = useMemo(() => itemsByValue(priorityValues), [priorityValues]);
	const sizeItems = useMemo(() => itemsByValue(sizeValues), [sizeValues]);

	const value = useMemo<KanbanBoardContextValue>(
		() => ({
			...actions,
			statuses,
			priorityItems,
			sizeItems,
			liveTaskId
		}),
		[actions, statuses, priorityItems, sizeItems, liveTaskId]
	);
	const members = useMemo<KanbanBoardMembers>(() => ({ teamMembers, currentMember }), [teamMembers, currentMember]);

	return (
		<KanbanBoardContext.Provider value={value}>
			<KanbanBoardMembersContext.Provider value={members}>{children}</KanbanBoardMembersContext.Provider>
		</KanbanBoardContext.Provider>
	);
}

export function useKanbanBoardContext() {
	const value = useContext(KanbanBoardContext);
	if (!value) {
		throw new Error('useKanbanBoardContext must be used inside KanbanBoardProvider');
	}
	return value;
}

export function useKanbanBoardMembers() {
	const members = useContext(KanbanBoardMembersContext);
	if (!members) {
		throw new Error('useKanbanBoardMembers must be used inside KanbanBoardProvider');
	}
	return members;
}
