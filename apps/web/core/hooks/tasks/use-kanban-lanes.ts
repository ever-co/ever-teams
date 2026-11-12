'use client';

import { useCallback, useMemo, useState } from 'react';
import { useTaskStatusesQuery } from './use-task-statuses-query';
import { useEditTaskStatus } from './use-edit-task-status';
import { useUpdateTask } from '../organizations';
import type { TTaskStatus } from '@/core/types/schemas';
import type { TTask } from '@/core/types/schemas/task/task.schema';
import {
	type KanbanLaneOrder,
	buildKanbanLanes,
	laneIdsAfterDrop,
	sortStatusesByOrder,
	statusIdsAfterDrop
} from '@/core/lib/utils/kanban-board';

type StatusOverride = { isCollapsed?: boolean; order?: number };

function withOverrides(statuses: TTaskStatus[], overrides: Record<string, StatusOverride>) {
	return statuses.map((status) => {
		const override = overrides[status.id];
		if (!override) {
			return status;
		}
		return { ...status, ...override };
	});
}

function hasChanged(result: { affected?: number } | undefined) {
	const affected = result?.affected ?? 0;
	return affected > 0;
}

/**
 * The lanes of a board, one per status, for the tasks given (the Kanban page's, or a view shown as a board), and
 * every lane mutation. A task dropped on another lane is saved at once through `updateTask`, whose optimistic cache
 * update moves it before the server answers; the order inside a lane is kept for the session only, because Gauzy
 * stores no position for a task inside its status. Collapsing and reordering lanes are saved on the status.
 */
/** No order of the board's own: the tasks' order is saved elsewhere (a view ordered by hand). */
const NO_LANE_ORDER: KanbanLaneOrder = {};

export function useKanbanLanes(tasks: TTask[], options?: { keepsLaneOrder?: boolean }) {
	// A board whose order is saved elsewhere ignores the order kept this session, even one made before it was
	const keepsLaneOrder = options?.keepsLaneOrder !== false;
	const {
		taskStatuses,
		getTaskStatusesLoading,
		setTaskStatuses,
		isError,
		refetch: refetchTaskStatuses
	} = useTaskStatusesQuery();
	const { updateTask } = useUpdateTask();
	const { editTaskStatus } = useEditTaskStatus();

	const [laneOrder, setLaneOrder] = useState<KanbanLaneOrder>({});
	const [statusOverrides, setStatusOverrides] = useState<Record<string, StatusOverride>>({});

	const statuses = useMemo(
		() => sortStatusesByOrder(withOverrides(taskStatuses, statusOverrides)),
		[taskStatuses, statusOverrides]
	);

	const shownLaneOrder = keepsLaneOrder ? laneOrder : NO_LANE_ORDER;
	const lanes = useMemo(() => buildKanbanLanes(tasks, statuses, shownLaneOrder), [tasks, statuses, shownLaneOrder]);

	const moveTask = useCallback(
		(task: TTask, toStatus: TTaskStatus, toIndex: number, options?: { keepsLaneOrder?: boolean }) => {
			// A board whose order is saved elsewhere (a view ordered by hand) keeps no order of its own: it would hide
			// that order, and a refused move would stay shown
			if (options?.keepsLaneOrder !== false) {
				const targetLane = lanes.find((lane) => lane.status.id === toStatus.id);
				const targetIds = (targetLane?.tasks ?? []).map((laneTask) => laneTask.id);
				const nextIds = laneIdsAfterDrop(targetIds, task.id, toIndex);
				setLaneOrder((current) => ({ ...current, [toStatus.id]: nextIds }));
			}

			const isSameStatus = task.taskStatusId === toStatus.id;
			if (isSameStatus) {
				return;
			}
			updateTask({ ...task, status: toStatus.name as TTask['status'], taskStatusId: toStatus.id });
		},
		[lanes, updateTask]
	);

	const saveStatusField = useCallback(
		async (statusId: string, update: StatusOverride, previous: StatusOverride) => {
			try {
				const result = await editTaskStatus(statusId, update);
				if (!hasChanged(result)) {
					setStatusOverrides((current) => ({
						...current,
						[statusId]: { ...current[statusId], ...previous }
					}));
					return;
				}
				setTaskStatuses((current) =>
					current.map((status) => {
						if (status.id !== statusId) {
							return status;
						}
						return { ...status, ...update };
					})
				);
			} catch (error) {
				console.error('Kanban: could not save the status column', error);
				setStatusOverrides((current) => ({ ...current, [statusId]: { ...current[statusId], ...previous } }));
			}
		},
		[editTaskStatus, setTaskStatuses]
	);

	const setLaneCollapsed = useCallback(
		(status: TTaskStatus, isCollapsed: boolean) => {
			const previous = { isCollapsed: Boolean(status.isCollapsed) };
			setStatusOverrides((current) => ({ ...current, [status.id]: { ...current[status.id], isCollapsed } }));
			saveStatusField(status.id, { isCollapsed }, previous);
		},
		[saveStatusField]
	);

	const moveLane = useCallback(
		(statusId: string, toIndex: number) => {
			const currentIds = statuses.map((status) => status.id);
			const nextIds = statusIdsAfterDrop(currentIds, statusId, toIndex);
			const changed = nextIds
				.map((id, index) => ({ id, index }))
				.filter(({ id, index }) => currentIds[index] !== id);
			if (changed.length === 0) {
				return;
			}
			setStatusOverrides((current) => {
				const next = { ...current };
				for (const { id, index } of changed) {
					next[id] = { ...next[id], order: index };
				}
				return next;
			});
			for (const { id, index } of changed) {
				const status = statuses.find((candidate) => candidate.id === id);
				const previous = { order: status?.order ?? index };
				saveStatusField(id, { order: index }, previous);
			}
		},
		[saveStatusField, statuses]
	);

	return {
		lanes,
		statuses,
		isLoading: getTaskStatusesLoading,
		isError,
		refetchTaskStatuses,
		moveTask,
		moveLane,
		setLaneCollapsed
	};
}
