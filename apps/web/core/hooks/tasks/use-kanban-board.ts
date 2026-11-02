'use client';

import { useCallback, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTaskStatusesQuery } from './use-task-statuses-query';
import { useEditTaskStatus } from './use-edit-task-status';
import { useUpdateTask, useTeamTasksQuery } from '../organizations';
import { TTaskStatus } from '@/core/types/schemas';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { EIssueType } from '@/core/types/generics/enums/task';
import {
	EMPTY_KANBAN_PROPERTY_FILTERS,
	KanbanDay,
	KanbanFilterField,
	KanbanFilters,
	KanbanLaneOrder,
	KanbanPropertyFilters,
	buildKanbanLanes,
	countPropertyFilters,
	laneIdsAfterDrop,
	matchesKanbanFilters,
	sortStatusesByOrder,
	statusIdsAfterDrop
} from '@/core/lib/utils/kanban-board';

type StatusOverride = { isCollapsed?: boolean; order?: number };

const EMPLOYEE_PARAM = 'employee';

function withOverrides(statuses: TTaskStatus[], overrides: Record<string, StatusOverride>) {
	return statuses.map((status) => {
		const override = overrides[status.id];
		if (!override) {
			return status;
		}
		return { ...status, ...override };
	});
}

function urlWithQuery(pathname: string, params: URLSearchParams) {
	const query = params.toString();
	if (!query) {
		return pathname;
	}
	return `${pathname}?${query}`;
}

function hasChanged(result: { affected?: number } | undefined) {
	const affected = result?.affected ?? 0;
	return affected > 0;
}

/**
 * The Kanban page's single source: team tasks grouped into one lane per status, the toolbar filters, and every
 * board mutation. A task dropped on another lane is saved at once through `updateTask`, whose optimistic cache
 * update moves it before the server answers; the order inside a lane is kept for the session only, because Gauzy
 * stores no position for a task inside its status. Collapsing and reordering lanes are saved on the status.
 */
export function useKanbanBoard() {
	const {
		taskStatuses,
		getTaskStatusesLoading,
		setTaskStatuses,
		isError,
		refetch: refetchTaskStatuses
	} = useTaskStatusesQuery();
	const { tasks } = useTeamTasksQuery();
	const { updateTask } = useUpdateTask();
	const { editTaskStatus } = useEditTaskStatus();

	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const employee = searchParams.get(EMPLOYEE_PARAM);

	const [search, setSearch] = useState('');
	const [day, setDay] = useState<KanbanDay>('all');
	const [properties, setProperties] = useState<KanbanPropertyFilters>(EMPTY_KANBAN_PROPERTY_FILTERS);
	const [laneOrder, setLaneOrder] = useState<KanbanLaneOrder>({});
	const [statusOverrides, setStatusOverrides] = useState<Record<string, StatusOverride>>({});

	const epics = useMemo(() => tasks.filter((task) => task.issueType === EIssueType.EPIC), [tasks]);

	const statuses = useMemo(
		() => sortStatusesByOrder(withOverrides(taskStatuses, statusOverrides)),
		[taskStatuses, statusOverrides]
	);

	const filters = useMemo<KanbanFilters>(
		() => ({ search, properties, employee, day }),
		[search, properties, employee, day]
	);

	const visibleTasks = useMemo(() => {
		const now = new Date();
		return tasks.filter((task) => matchesKanbanFilters(task, filters, now));
	}, [tasks, filters]);

	const lanes = useMemo(
		() => buildKanbanLanes(visibleTasks, statuses, laneOrder),
		[visibleTasks, statuses, laneOrder]
	);

	const propertyFilterCount = countPropertyFilters(properties);
	const hasSearch = search.trim().length > 0;
	const hasDay = day !== 'all';
	const hasEmployee = Boolean(employee);
	const isNarrowed = [propertyFilterCount > 0, hasSearch, hasDay, hasEmployee].some(Boolean);
	const hiddenTaskCount = tasks.length - visibleTasks.length;

	const setPropertyFilter = useCallback((field: KanbanFilterField, values: string[]) => {
		setProperties((current) => ({ ...current, [field]: values }));
	}, []);

	const clearEmployee = useCallback(() => {
		const params = new URLSearchParams(searchParams.toString());
		params.delete(EMPLOYEE_PARAM);
		router.replace(urlWithQuery(pathname, params));
	}, [pathname, router, searchParams]);

	const filterByEmployee = useCallback(
		(fullName: string) => {
			const params = new URLSearchParams(searchParams.toString());
			params.set(EMPLOYEE_PARAM, fullName);
			router.replace(urlWithQuery(pathname, params));
		},
		[pathname, router, searchParams]
	);

	const clearFilters = useCallback(() => {
		setSearch('');
		setDay('all');
		setProperties(EMPTY_KANBAN_PROPERTY_FILTERS);
		if (employee) {
			clearEmployee();
		}
	}, [clearEmployee, employee]);

	const clearPropertyFilters = useCallback(() => {
		setProperties(EMPTY_KANBAN_PROPERTY_FILTERS);
	}, []);

	const moveTask = useCallback(
		(task: TTask, toStatus: TTaskStatus, toIndex: number) => {
			const targetLane = lanes.find((lane) => lane.status.id === toStatus.id);
			const targetIds = (targetLane?.tasks ?? []).map((laneTask) => laneTask.id);
			const nextIds = laneIdsAfterDrop(targetIds, task.id, toIndex);
			setLaneOrder((current) => ({ ...current, [toStatus.id]: nextIds }));

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
		epics,
		isLoading: getTaskStatusesLoading,
		isError,
		refetchTaskStatuses,
		filters,
		search,
		setSearch,
		day,
		setDay,
		properties,
		setPropertyFilter,
		clearPropertyFilters,
		propertyFilterCount,
		employee,
		filterByEmployee,
		clearEmployee,
		clearFilters,
		isNarrowed,
		hiddenTaskCount,
		moveTask,
		moveLane,
		setLaneCollapsed
	};
}

export type KanbanBoardState = ReturnType<typeof useKanbanBoard>;
