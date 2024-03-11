import { kanbanBoardState } from '@app/stores/kanban';
import { useTaskStatus } from './useTaskStatus';
import { useRecoilState } from 'recoil';
import { useEffect, useState } from 'react';
import { ITaskStatusItemList, ITeamTask } from '@app/interfaces';
import { useTeamTasks } from './useTeamTasks';
import { IKanban } from '@app/interfaces/IKanban';
import { useUserProfilePage } from './useUserProfilePage';
import { useTaskFilter } from 'lib/features';

export function useKanban() {
	const profile = useUserProfilePage();
	const hook = useTaskFilter(profile);
	const [loading, setLoading] = useState<boolean>(true);
	const [searchTasks, setSearchTasks] = useState('');
	const [kanbanBoard, setKanbanBoard] = useRecoilState(kanbanBoardState);
	const taskStatusHook = useTaskStatus();
	const { tasks: newTa, tasksFetching, updateTask } = useTeamTasks();
	console.log('sss', newTa);

	useEffect(() => {
		if (!taskStatusHook.loading && !tasksFetching) {
			let kanban = {};
			setLoading(true);
			const priority = hook.statusFilter.priority;
			const status = hook.statusFilter.status;
			const tasks = newTa
				.filter((task: ITeamTask) => {
					return task.title.toLowerCase().includes(searchTasks.toLowerCase());
				})
			// if (Array.isArray(priority) && priority.length > 0) {

			// }
			// if (Array.isArray(status) && status.length > 0) {
			// 	tasks.filter((task: ITeamTask) => {
			// 		return status.includes(task.status);
			// 	});
			// }
			const getTasksByStatus = (status: string | undefined) => {
				return tasks.filter((task: ITeamTask) => {
					return task.status === status;
				});
			};

			taskStatusHook.taskStatus.map((taskStatus: ITaskStatusItemList) => {
				kanban = {
					...kanban,
					[taskStatus.name ? taskStatus.name : '']: getTasksByStatus(taskStatus.name)
				};
			});
			setKanbanBoard(kanban);
			setLoading(false);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [taskStatusHook.loading, tasksFetching, newTa, searchTasks, hook.statusFilter]);

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
		const columnData = taskStatusHook.taskStatus.filter((taskStatus: ITaskStatusItemList) => {
			return taskStatus.name === column;
		});

		return columnData[0].isCollapsed;
	};

	const reorderStatus = (itemStatus: string, index: number) => {
		taskStatusHook.taskStatus
			.filter((status: ITaskStatusItemList) => {
				return status.name === itemStatus;
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
		hook,
		columns: taskStatusHook.taskStatus,
		searchTasks,
		updateKanbanBoard: setKanbanBoard,
		updateTaskStatus: updateTask,
		toggleColumn,
		isColumnCollapse,
		reorderStatus,
		addNewTask,
		setSearchTasks
	};
}
