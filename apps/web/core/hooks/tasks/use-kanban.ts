import { useTaskStatusesQuery } from '../tasks/use-task-statuses-query';
import { useEditTaskStatus } from '../tasks/use-edit-task-status';
import { useEffect, useState, useMemo, useCallback, useOptimistic, startTransition } from 'react';
import { useUpdateTask, useTeamTasksQuery } from '../organizations';
import { TTaskStatus } from '@/core/types/schemas';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { useKanbanFilters } from './use-kanban-filters';
import { IKanban } from '@/core/types/interfaces/task/task';
import { buildKanbanBoard } from '@/core/lib/utils';


/**
 * Main Kanban board hook.
 *
 * Responsibilities:
 * - Board construction (grouping filtered tasks by status into columns via useMemo)
 * - Local board state for drag/drop mutations (useState, synced from computed board)
 * - Column management with optimistic updates (collapse/expand, reorder)
 * - Task status updates (drag & drop between columns)
 * - Adding new tasks to the board
 *
 * Filtering logic is delegated to `useKanbanFilters`.
 * No global state (Jotai atom removed) — board state is local to the hook instance.
 */
export function useKanban() {
	const { taskStatuses, getTaskStatusesLoading, setTaskStatuses } = useTaskStatusesQuery();
	const { editTaskStatus } = useEditTaskStatus();
	const { updateTask } = useUpdateTask();
	const { tasks: newTask } = useTeamTasksQuery();

	// ==================== FILTERING (delegated) ====================
	// IMPORTANT: Only use `getTaskStatusesLoading` (React Query's `isLoading` = isPending && isFetching).
	// This is true ONLY on the initial load when no cached data exists, and stays false during
	// background refetches. Using `tasksFetching` (isFetching) here would cause the board to
	// flash empty on every refetch because isFetching goes true→false→true→false during
	// the loadTeamTasksData() → refetch() cycle, while Jotai sync is still pending.
	const isDataLoading = getTaskStatusesLoading;
	const {
		filteredTasks,
		searchTasks,
		issues,
		epics,
		setSearchTasks,
		setPriority,
		setLabels,
		setSizes,
		setIssues,
		setEpics
	} = useKanbanFilters(newTask, isDataLoading);

	// ==================== BOARD CONSTRUCTION (derived state) ====================

	// Computed board: the "source of truth" derived from filtered tasks + statuses.
	// useMemo → synchronous, no intermediate empty-render, no race condition.
	const computedBoard = useMemo<IKanban>(() => {
		if (isDataLoading) return {};
		return buildKanbanBoard(filteredTasks, taskStatuses);
	}, [filteredTasks, taskStatuses, isDataLoading]);

	// Drag/drop override: only set when user performs a drag/drop operation.
	// null = use computedBoard (server truth), non-null = use optimistic drag/drop state.
	// This avoids the useState+useEffect sync pattern that caused a one-render delay
	// where data={} was returned before the useEffect could sync.
	const [dragDropOverride, setDragDropOverride] = useState<IKanban | null>(null);

	// Reset drag/drop override when server data changes (new computedBoard).
	// After server confirms the drag/drop, computedBoard updates → override clears.
	useEffect(() => {
		setDragDropOverride(null);
	}, [computedBoard]);

	// The board to render: use drag/drop override if active, otherwise computed board.
	const kanbanBoard = dragDropOverride ?? computedBoard;

	// ==================== OPTIMISTIC COLUMN STATE ====================

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
		return taskStatuses.map((status) => {
			const optimisticState = optimisticColumnStates[status.id];
			if (optimisticState) {
				return { ...status, ...optimisticState };
			}
			return status;
		});
	}, [taskStatuses, optimisticColumnStates]);

	/**
	 * collapse or show kanban column with optimistic updates
	 */
	const toggleColumn = useCallback(
		async (column: string, status: boolean) => {
			const columnData = taskStatuses.filter((taskStatus: TTaskStatus) => {
				return taskStatus.name === column;
			});

			if (!columnData.length) {
				console.warn(`Column "${column}" not found in task statuses`);
				return;
			}

			const columnId = columnData[0].id;
			// Save the original state before optimistic update for potential reversion
			const originalState = columnData[0].isCollapsed;

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
					const updateResult = await editTaskStatus(columnId, {
						isCollapsed: status
					});

					if (updateResult && updateResult.affected > 0) {
						// Update the actual state - the optimistic state will automatically sync
						setTaskStatuses((prev) => {
							return prev.map((taskStatus) => {
								if (taskStatus.id === columnId) {
									return { ...taskStatus, isCollapsed: status };
								}
								return taskStatus;
							});
						});
					} else {
						// API call failed - revert to original state
						console.warn('Failed to update column collapse state');
						startTransition(() => {
							setOptimisticColumnStates({
								id: columnId,
								updates: { isCollapsed: originalState }
							});
						});
					}
				} catch (error) {
					console.error('Error updating column collapse state:', error);
					// Revert to original state on error
					startTransition(() => {
						setOptimisticColumnStates({
							id: columnId,
							updates: { isCollapsed: originalState }
						});
					});
				}
			});
		},
		[setOptimisticColumnStates, taskStatuses, editTaskStatus, setTaskStatuses]
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
			const status = taskStatuses?.find((status: TTaskStatus) => {
				return status.id === itemStatus;
			});

			if (status) {
				// Save the original order before optimistic update for potential reversion
				const originalOrder = status.order ?? 0;

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
						const updateResult = await editTaskStatus(status.id, {
							order: index
						});

						if (updateResult && updateResult.affected > 0) {
							// Update the actual state - the optimistic state will automatically sync
							setTaskStatuses((prev) => {
								return prev.map((el) => {
									if (el.id === status.id) {
										return { ...el, order: index };
									}
									return el;
								});
							});
						} else {
							// API call failed - revert to original order
							console.warn('Failed to update status order');
							startTransition(() => {
								setOptimisticColumnStates({
									id: status.id,
									updates: { order: originalOrder }
								});
							});
						}
					} catch (error) {
						console.error('Error updating status order:', error);
						// Revert to original order on error
						startTransition(() => {
							setOptimisticColumnStates({
								id: status.id,
								updates: { order: originalOrder }
							});
						});
					}
				});
			}
		},
		[setOptimisticColumnStates, taskStatuses, editTaskStatus, setTaskStatuses]
	);
	// Wrapper for drag/drop board updates — sets the override so the UI
	// reflects the optimistic state until server data catches up.
	const updateKanbanBoard = useCallback(
		(updater: IKanban | ((prev: IKanban) => IKanban)) => {
			setDragDropOverride((prev) => {
				const current = prev ?? computedBoard;
				return typeof updater === 'function' ? updater(current) : updater;
			});
		},
		[computedBoard]
	);

	const addNewTask = useCallback(
		(task: TTask, status: string) => {
			updateKanbanBoard((prev) => ({
				...prev,
				[status]: [...(prev[status] ?? []), task]
			}));
		},
		[updateKanbanBoard]
	);

	return {
		data: kanbanBoard as IKanban,
		isLoading: isDataLoading,
		columns: optimisticTaskStatuses, // Use memoized optimistic state for instant UI updates
		taskStatuses, // Raw statuses for status ID lookup (e.g., drag/drop status resolution)
		searchTasks,
		issues,
		epics,
		setPriority,
		setLabels,
		setSizes,
		setIssues,
		setEpics,
		updateKanbanBoard,
		updateTaskStatus: updateTask,
		toggleColumn,
		isColumnCollapse,
		isAllColumnCollapse,
		reorderStatus,
		addNewTask,
		setSearchTasks
	};
}
