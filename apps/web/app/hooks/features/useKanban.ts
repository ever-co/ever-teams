import { kanbanBoardState } from '@app/stores/kanban';
import { useTaskStatus } from './useTaskStatus';
import { useAtom } from 'jotai';
import { useEffect, useState } from 'react';
import { ITaskStatusItemList, ITeamTask } from '@app/interfaces';
import { useTeamTasks } from './useTeamTasks';
import { IKanban } from '@app/interfaces/IKanban';
import { TStatusItem } from 'lib/features';
import { useSearchParams } from 'next/navigation';
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
	useEffect(() => {
		if (!taskStatusHook.loading && !tasksFetching) {
			let kanban = {};
			setLoading(true);
			const tasks = newTask
				.filter((task: ITeamTask) => {
					return task.title.toLowerCase().includes(searchTasks.toLowerCase());
				})
				.filter((task: ITeamTask) => {
					return priority.length ? priority.includes(task.priority) : true;
				})
				.filter((task: ITeamTask) => {
					return issues.value ? task.issueType === issues.value : true;
				})
				.filter((task: ITeamTask) => {
					return sizes.length ? sizes.includes(task.size) : true;
				})
				.filter((task: ITeamTask) => {
					return labels.length ? labels.some((label) => task.tags.some((tag) => tag.name === label)) : true;
				})
				.filter((task: ITeamTask) => {
					return epics.length ? epics.includes(task.id) : true;
				})
				.filter((task: ITeamTask) => {
					if (employee) {
						return task.members.map((el) => el.fullName).includes(employee as string);
					} else {
						return task;
					}
				});

			const getTasksByStatus = (status: string | undefined) => {
				return tasks.filter((task: ITeamTask) => {
					return task.taskStatusId === status;
				});
			};

			taskStatusHook.taskStatus.map((taskStatus: ITaskStatusItemList) => {
				kanban = {
					...kanban,
					[taskStatus.name ? taskStatus.name : '']: getTasksByStatus(taskStatus.id)
				};
			});
			setKanbanBoard(kanban);
			setLoading(false);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [taskStatusHook.loading, tasksFetching, newTask, searchTasks, priority, sizes, labels, epics, issues, employee]);

	/**
	 * collapse or show kanban column
	 */
	const toggleColumn = (column: string, status: boolean) => {
		const columnData = taskStatusHook.taskStatus.filter((taskStatus: ITaskStatusItemList) => {
			return taskStatus.name === column;
		});

		const columnId = columnData[0].id;

		taskStatusHook.editTaskStatus(columnId, {
			isCollapsed: status
		});
	};

	const isColumnCollapse = (column: string) => {
		const columnData = taskStatusHook.taskStatus.find((taskStatus: ITaskStatusItemList) => {
			return taskStatus.name === column;
		});

		return columnData?.isCollapsed;
	};
	const isAllColumnCollapse = () => {
		return taskStatusHook.taskStatus.every((taskStatus: ITaskStatusItemList) => {
			return taskStatus.isCollapsed;
		});
	};

	const reorderStatus = (itemStatus: string, index: number) => {
		taskStatusHook.taskStatus
			.filter((status: ITaskStatusItemList) => {
				return status.id === itemStatus;
			})
			.map((status: ITaskStatusItemList) => {
				taskStatusHook.editTaskStatus(status.id, {
					order: index
				});
			});
	};
	const addNewTask = (task: ITeamTask, status: string) => {
		const updatedBoard = {
			...kanbanBoard,
			[status]: [...kanbanBoard[status], task]
		};
		setKanbanBoard(() => updatedBoard);
	};
	return {
		data: kanbanBoard as IKanban,
		isLoading: loading,
		columns: taskStatusHook.taskStatus,
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
