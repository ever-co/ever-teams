import { kanbanBoardState } from '@/core/stores/integrations/kanban';
import { useTaskStatus } from '../tasks/use-task-status';
import { useAtom } from 'jotai';
import { useEffect, useState, useMemo, useCallback, useOptimistic, startTransition } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTeamTasks } from '../organizations';
import { TStatusItem } from '@/core/types/interfaces/task/task-card';
import { TTaskStatus } from '@/core/types/schemas';
import { TTask } from '@/core/types/schemas/task/task.schema';

export interface IKanban {
	[key: string]: TTask[];
}

export function useKanban() {
	const [loading, setLoading] = useState<boolean>(true);
	const [searchTasks, setSearchTasks] = useState('');
	const [labels, setLabels] = useState<string[]>([]);
	const [epics, setEpics] = useState<string[]>([]);
	const [issues, setIssues] = useState<TStatusItem>({
		name: 'Issues',
		icon: null,
		bgColor: '',
		value: ''
	});
	const [kanbanBoard, setKanbanBoard] = useAtom(kanbanBoardState);
	const taskStatusHook = useTaskStatus();
	const { tasks: newTask, tasksFetching, updateTask } = useTeamTasks();
	const [priority, setPriority] = useState<string[]>([]);
	const [sizes, setSizes] = useState<string[]>([]);
	const employee = useSearchParams().get('employee');

	// Optimistic state for column collapse/expand operations only
	const [optimisticColumnStates, setOptimisticColumnStates] = useOptimistic(
		{} as Record<string, { isCollapsed?: boolean; order?: number }>,
		(
			currentStates: Record<string, { isCollapsed?: boolean; order?: number }>,
			update: { id: string; updates: { isCollapsed?: boolean; order?: number } }
		) => {
			return {
				...currentStates,
				[update.id]: {
					...currentStates[update.id],
					...update.updates
				}
			};
		}
	);

	// Memoized task statuses with optimistic updates applied for performance
	const optimisticTaskStatuses = useMemo(() => {
		return taskStatusHook.taskStatuses.map((status) => {
			const optimisticState = optimisticColumnStates[status.id];
			if (optimisticState) {
				return { ...status, ...optimisticState };
			}
			return status;
		});
	}, [taskStatusHook.taskStatuses, optimisticColumnStates]);

	// Memoized filter functions for better performance
	const filterBySearch = useCallback(
		(task: TTask) => {
			return task.title.toLowerCase().includes(searchTasks.toLowerCase());
		},
		[searchTasks]
	);

	const filterByPriority = useCallback(
		(task: TTask) => {
			return priority.length ? priority.includes(task.priority as string) : true;
		},
		[priority]
	);

	const filterByIssue = useCallback(
		(task: TTask) => {
			return issues.value ? task.issueType === issues.value : true;
		},
		[issues.value]
	);

	const filterBySize = useCallback(
		(task: TTask) => {
			return sizes.length ? sizes.includes(task.size as string) : true;
		},
		[sizes]
	);

	const filterByLabels = useCallback(
		(task: TTask) => {
			return labels.length ? labels.some((label) => task.tags?.some((tag) => tag.name === label)) : true;
		},
		[labels]
	);

	const filterByEpics = useCallback(
		(task: TTask) => {
			return epics.length ? epics.includes(task.id) : true;
		},
		[epics]
	);

	const filterByEmployee = useCallback(
		(task: TTask) => {
			if (employee) {
				return task.members?.map((el) => el.fullName).includes(employee as string);
			}
			return true;
		},
		[employee]
	);

	// Memoized filtered tasks to prevent unnecessary recalculations
	const filteredTasks = useMemo(() => {
		if (taskStatusHook.getTaskStatusesLoading || tasksFetching) {
			return [];
		}

		return newTask
			.filter(filterBySearch)
			.filter(filterByPriority)
			.filter(filterByIssue)
			.filter(filterBySize)
			.filter(filterByLabels)
			.filter(filterByEpics)
			.filter(filterByEmployee);
	}, [
		newTask,
		filterBySearch,
		filterByPriority,
		filterByIssue,
		filterBySize,
		filterByLabels,
		filterByEpics,
		filterByEmployee,
		taskStatusHook.getTaskStatusesLoading,
		tasksFetching
	]);

	useEffect(() => {
		if (!taskStatusHook.getTaskStatusesLoading && !tasksFetching) {
			setLoading(true);
			let kanban = {};
			const getTasksByStatus = (status: string | undefined) => {
				return filteredTasks.filter((task: TTask) => {
					return task.taskStatusId === status;
				});
			};

			// Use the base taskStatuses for kanban board construction to avoid infinite loops
			taskStatusHook.taskStatuses.map((taskStatus: TTaskStatus) => {
				kanban = {
					...kanban,
					[taskStatus.name ? taskStatus.name : '']: getTasksByStatus(taskStatus.id)
				};
			});
			setKanbanBoard(kanban);
			setLoading(false);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [taskStatusHook.getTaskStatusesLoading, tasksFetching, filteredTasks, taskStatusHook.taskStatuses]);

	/**
	 * collapse or show kanban column with optimistic updates
	 */
	const toggleColumn = useCallback(
		async (column: string, status: boolean) => {
			const columnData = taskStatusHook.taskStatuses.filter((taskStatus: TTaskStatus) => {
				return taskStatus.name === column;
			});

			if (!columnData.length) {
				console.warn(`Column "${column}" not found in task statuses`);
				return;
			}

			const columnId = columnData[0].id;

			// Apply optimistic update immediately for instant UI feedback
			startTransition(() => {
				setOptimisticColumnStates({
					id: columnId,
					updates: { isCollapsed: status }
				});
			});

			// Perform the actual API call in a transition to avoid blocking UI
			startTransition(async () => {
				try {
					const updateResult = await taskStatusHook.editTaskStatus(columnId, {
						isCollapsed: status
					});

					if (updateResult && updateResult.affected > 0) {
						// Update the actual state - the optimistic state will automatically sync
						taskStatusHook.setTaskStatuses((prev) => {
							return prev.map((taskStatus) => {
								if (taskStatus.id === columnId) {
									return { ...taskStatus, isCollapsed: status };
								}
								return taskStatus;
							});
						});
					} else {
						// If the API call failed, the optimistic state will revert automatically
						console.warn('Failed to update column collapse state');
					}
				} catch (error) {
					console.error('Error updating column collapse state:', error);
					// The optimistic state will automatically revert since the base state didn't change
				}
			});
		},
		[setOptimisticColumnStates, taskStatusHook]
	);

	const isColumnCollapse = useCallback(
		(column: string) => {
			const columnData = optimisticTaskStatuses.find((taskStatus: TTaskStatus) => {
				return taskStatus.name === column;
			});

			return columnData?.isCollapsed;
		},
		[optimisticTaskStatuses]
	);

	const isAllColumnCollapse = useCallback(() => {
		return optimisticTaskStatuses.every((taskStatus: TTaskStatus) => {
			return taskStatus.isCollapsed;
		});
	}, [optimisticTaskStatuses]);

	const reorderStatus = useCallback(
		async (itemStatus: string, index: number) => {
			const status = taskStatusHook.taskStatuses?.find((status: TTaskStatus) => {
				return status.id === itemStatus;
			});

			if (status) {
				// Apply optimistic update immediately
				startTransition(() => {
					setOptimisticColumnStates({
						id: status.id,
						updates: { order: index }
					});
				});

				// Perform the actual API call in a transition
				startTransition(async () => {
					try {
						const updateResult = await taskStatusHook.editTaskStatus(status.id, {
							order: index
						});

						if (updateResult && updateResult.affected > 0) {
							// Update the actual state - the optimistic state will automatically sync
							taskStatusHook.setTaskStatuses((prev) => {
								return prev.map((el) => {
									if (el.id === status.id) {
										return { ...el, order: index };
									}
									return el;
								});
							});
						} else {
							console.warn('Failed to update status order');
						}
					} catch (error) {
						console.error('Error updating status order:', error);
						// The optimistic state will automatically revert
					}
				});
			}
		},
		[setOptimisticColumnStates, taskStatusHook]
	);
	const addNewTask = (task: TTask, status: string) => {
		const updatedBoard = {
			...kanbanBoard,
			[status]: [...kanbanBoard[status], task]
		};
		setKanbanBoard(() => updatedBoard);
	};
	return {
		data: kanbanBoard as IKanban,
		isLoading: loading,
		columns: optimisticTaskStatuses, // Use memoized optimistic state for instant UI updates
		searchTasks,
		issues,
		setPriority,
		setLabels,
		setSizes,
		setIssues,
		setEpics,
		updateKanbanBoard: setKanbanBoard,
		updateTaskStatus: updateTask,
		toggleColumn,
		isColumnCollapse,
		isAllColumnCollapse,
		reorderStatus,
		addNewTask,
		setSearchTasks
	};
}
