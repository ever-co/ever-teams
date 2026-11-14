'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTaskStatusesQuery } from './use-task-statuses-query';
import { useEditTaskStatus } from './use-edit-task-status';
import { useUpdateTask } from '../organizations';
import { createLatestWriteQueue } from './latest-write-queue';
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
type StatusField = keyof StatusOverride;

/**
 * A lane's value shown before the platform holds it, for one field of one status. `save` is the save that owns it (the
 * latest of that field); once that save succeeded, `savedOn` is the statuses it succeeded on, and the value shows only
 * until they change: the statuses then hold it, or a newer value (another person's change), which shows instead.
 */
type FieldOverride<T> = { value: T; save: number; savedOn?: TTaskStatus[] };
type StatusOverrides = Record<string, { isCollapsed?: FieldOverride<boolean>; order?: FieldOverride<number> }>;

function shownValue<T>(entry: FieldOverride<T> | undefined, statuses: TTaskStatus[]): T | undefined {
	if (!entry || (entry.savedOn && entry.savedOn !== statuses)) {
		return undefined;
	}
	return entry.value;
}

function withOverrides(statuses: TTaskStatus[], overrides: StatusOverrides) {
	return statuses.map((status) => {
		const override = overrides[status.id];
		if (!override) {
			return status;
		}
		const isCollapsed = shownValue(override.isCollapsed, statuses);
		const order = shownValue(override.order, statuses);
		if (isCollapsed === undefined && order === undefined) {
			return status;
		}
		return {
			...status,
			...(isCollapsed !== undefined && { isCollapsed }),
			...(order !== undefined && { order })
		};
	});
}

/** The overrides once the save `save` of one field ended: kept as saved (`savedOn`), or dropped (refused, failed). */
function settledOverrides(
	overrides: StatusOverrides,
	statusId: string,
	field: StatusField,
	save: number,
	savedOn: TTaskStatus[] | null
): StatusOverrides {
	const fields = overrides[statusId];
	const entry = fields?.[field];
	if (entry?.save !== save) {
		return overrides;
	}
	if (savedOn) {
		return { ...overrides, [statusId]: { ...fields, [field]: { ...entry, savedOn } } };
	}
	const rest = { ...fields };
	delete rest[field];
	const next = { ...overrides };
	if (Object.keys(rest).length > 0) {
		next[statusId] = rest;
	} else {
		delete next[statusId];
	}
	return next;
}

function hasChanged(result: { affected?: number } | undefined) {
	const affected = result?.affected ?? 0;
	return affected > 0;
}

/**
 * The writes of the lanes' fields (`statusId:field`), one at a time per field of each status, the latest value chosen
 * meanwhile going next: two writes sent at once could land out of order, the older one overwriting the newer, and a
 * reload would show the older value. Shared by every board, open or left: a board left with a write waiting must not
 * send it after a board opened since saved a newer value.
 */
const laneFieldWrites = createLatestWriteQueue();

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
	const [statusOverrides, setStatusOverrides] = useState<StatusOverrides>({});
	// The latest save of each field of each status (`statusId:field`): an older save's answer, saved or not, never
	// changes what shows, as it would put back a value a newer change replaced.
	const saveCountRef = useRef(0);
	const latestSaveRef = useRef(new Map<string, number>());
	// A board left while its writes are on their way still sends the latest value chosen, but changes no state.
	const isMountedRef = useRef(true);
	useEffect(() => {
		isMountedRef.current = true;
		return () => {
			isMountedRef.current = false;
		};
	}, []);
	// The statuses this board shows now: a save that succeeded keeps its value shown until they change.
	const shownStatusesRef = useRef(taskStatuses);
	useEffect(() => {
		shownStatusesRef.current = taskStatuses;
	}, [taskStatuses]);

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

	/** Shows `value` for one field of a status at once and saves it; the latest save of that field decides what stays. */
	const saveStatusField = useCallback(
		<F extends StatusField>(statusId: string, field: F, value: NonNullable<StatusOverride[F]>) => {
			saveCountRef.current += 1;
			const save = saveCountRef.current;
			const key = `${statusId}:${field}`;
			latestSaveRef.current.set(key, save);
			setStatusOverrides((current) => ({
				...current,
				[statusId]: { ...current[statusId], [field]: { value, save } }
			}));
			laneFieldWrites.enqueue(key, async () => {
				let saved = false;
				try {
					saved = hasChanged(await editTaskStatus(statusId, { [field]: value }));
				} catch (error) {
					console.error('Kanban: could not save the status column', error);
				}
				if (!isMountedRef.current || latestSaveRef.current.get(key) !== save) {
					return;
				}
				if (saved) {
					const savedOn = shownStatusesRef.current;
					setTaskStatuses((current) =>
						current.map((status) => (status.id === statusId ? { ...status, [field]: value } : status))
					);
					setStatusOverrides((current) => settledOverrides(current, statusId, field, save, savedOn));
					return;
				}
				// Refused or failed: the lane shows what the statuses hold (the last value saved), never an unsaved one.
				setStatusOverrides((current) => settledOverrides(current, statusId, field, save, null));
			});
		},
		[editTaskStatus, setTaskStatuses]
	);

	const setLaneCollapsed = useCallback(
		(status: TTaskStatus, isCollapsed: boolean) => {
			saveStatusField(status.id, 'isCollapsed', isCollapsed);
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
			for (const { id, index } of changed) {
				saveStatusField(id, 'order', index);
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
