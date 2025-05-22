import { kanbanBoardState } from '@/core/stores/integrations/kanban';
import { useTaskStatus } from '../tasks/use-task-status';
import { useAtom } from 'jotai';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { ITaskStatusNameEnum, ITask } from '@/core/types/interfaces/to-review';
import { IKanban } from '@/core/types/interfaces/to-review/IKanban';
import { useSearchParams } from 'next/navigation';
import { useTeamTasks } from '../organizations';
import { TStatusItem } from '@/core/components/tasks/task-status';

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

	// Memoized filter functions for better performance
	const filterBySearch = useCallback(
		(task: ITask) => {
			return task.title.toLowerCase().includes(searchTasks.toLowerCase());
		},
		[searchTasks]
	);

	const filterByPriority = useCallback(
		(task: ITask) => {
			return priority.length ? priority.includes(task.priority) : true;
		},
		[priority]
	);

	const filterByIssue = useCallback(
		(task: ITask) => {
			return issues.value ? task.issueType === issues.value : true;
		},
		[issues.value]
	);

	const filterBySize = useCallback(
		(task: ITask) => {
			return sizes.length ? sizes.includes(task.size) : true;
		},
		[sizes]
	);

	const filterByLabels = useCallback(
		(task: ITask) => {
			return labels.length ? labels.some((label) => task.tags.some((tag) => tag.name === label)) : true;
		},
		[labels]
	);

	const filterByEpics = useCallback(
		(task: ITask) => {
			return epics.length ? epics.includes(task.id) : true;
		},
		[epics]
	);

	const filterByEmployee = useCallback(
		(task: ITask) => {
			if (employee) {
				return task.members.map((el) => el.fullName).includes(employee as string);
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
				return filteredTasks.filter((task: ITask) => {
					return task.taskStatusId === status;
				});
			};

			taskStatusHook.taskStatuses.map((taskStatus: ITaskStatusNameEnum) => {
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
	 * collapse or show kanban column
	 */
	const toggleColumn = async (column: string, status: boolean) => {
		const columnData = taskStatusHook.taskStatuses.filter((taskStatus: ITaskStatusNameEnum) => {
			return taskStatus.name === column;
		});

		const columnId = columnData[0].id;

		const updatedStatus = await taskStatusHook.editTaskStatus(columnId, {
			isCollapsed: status
		});

		if (updatedStatus) {
			// Update task statuses state
			taskStatusHook.setTaskStatuses((prev) => {
				return prev.map((status) => {
					if (status.id === columnId) {
						return { ...status, ...updatedStatus.data };
					}
					return status;
				});
			});
		}
	};

	const isColumnCollapse = (column: string) => {
		const columnData = taskStatusHook.taskStatuses.find((taskStatus: ITaskStatusNameEnum) => {
			return taskStatus.name === column;
		});

		return columnData?.isCollapsed;
	};
	const isAllColumnCollapse = () => {
		return taskStatusHook.taskStatuses.every((taskStatus: ITaskStatusNameEnum) => {
			return taskStatus.isCollapsed;
		});
	};

	const reorderStatus = async (itemStatus: string, index: number) => {
		const status = taskStatusHook.taskStatuses?.find((status) => {
			return status.id === itemStatus;
		});

		if (status) {
			const reOrderedStatus = await taskStatusHook.editTaskStatus(status.id, {
				order: index
			});

			if (reOrderedStatus) {
				// Update task statuses state
				taskStatusHook.setTaskStatuses((prev) => {
					return prev.map((el) => {
						if (el.id === status.id) {
							return { ...status, ...reOrderedStatus.data };
						}
						return el;
					});
				});
			}
		}
	};
	const addNewTask = (task: ITask, status: string) => {
		const updatedBoard = {
			...kanbanBoard,
			[status]: [...kanbanBoard[status], task]
		};
		setKanbanBoard(() => updatedBoard);
	};
	return {
		data: kanbanBoard as IKanban,
		isLoading: loading,
		columns: taskStatusHook.taskStatuses,
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
