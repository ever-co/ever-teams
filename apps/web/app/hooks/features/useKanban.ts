import { kanbanBoardState } from '@app/stores/kanban';
import { useTaskStatus } from './useTaskStatus';
import { useRecoilState } from 'recoil';
import { useEffect, useState } from 'react';
import { ITaskStatusItemList, ITeamTask } from '@app/interfaces';
import { useTeamTasks } from './useTeamTasks';
import { IKanban } from '@app/interfaces/IKanban';

export function useKanban() {
	const [loading, setLoading] = useState<boolean>(true);
	const [kanbanBoard, setKanbanBoard] = useRecoilState(kanbanBoardState);
	const taskStatusHook = useTaskStatus();
	const { tasks, tasksFetching, updateTask } = useTeamTasks();

	/**
	 * format data for kanban board
	 */
	useEffect(() => {
		if (!taskStatusHook.loading && !tasksFetching) {
			let kanban = {};

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
	}, [taskStatusHook.loading, tasksFetching]);

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
		const defaultTask = {
			id: '1',
			createdAt: '2021-05-25T07:47:00.000Z',
			updatedAt: '2021-05-25T07:47:00.000Z',
			tenantId: '1',
			organizationId: '1',
			number: 1,
			prefix: '1',
			title: 'Hakerton',
			description: 'Hakerton',
			estimate: null,
			dueDate: '2021-05-25T07:47:00.000Z',
			startDate: null,
			projectId: '1',
			public: false,
			creatorId: '1',
			members: [],
			tags: [],
			teams: [],
			linkedIssues: [],
			creator: {
				id: '1',
				createdAt: '2021-05-25T07:47:00.000Z',
				updatedAt: '2021-05-25T07:47:00.000Z',
				tenantId: '1',
				thirdPartyId: null,
				firstName: 'Super',
				lastName: 'Admin',
				email: 'anish@gmail.com',
				username: null,
				hash: '$2b$10$2JQd3Y3J2mFZ3n9KXl9Z2e2J5z1aKv4mXJX3aYn1QjO6f3jZ6D6cG',
				refreshToken: null,
				imageUrl: 'null',
				preferredLanguage: 'null',
				preferredComponentLayout: 'null',
				isActive: true,
				roleId: '1',
				name: 'Super Admin',
				employeeId: null
			},
			taskNumber: '1',
			label: 'Hakerton',
			parentId: 'null',
			issueType: 'Task',
			rootEpic: null,
			status: 'open',
			size: 'Large',
			priority: 'Highest',
			version: '1',
			epic: '1',
			project: '1',
			team: '1',
			totalWorkedTime: 0,
			estimateDays: 0,
			estimateHours: 0,
			estimateMinutes: 0
		};
		const updatedBoard = {
			...kanbanBoard,
			[status]: [...kanbanBoard[status], { ...defaultTask, ...task }]
		};
		console.log('kanban-test-add', updatedBoard);
		setKanbanBoard(() => updatedBoard);
	};
	return {
		data: kanbanBoard as IKanban,
		isLoading: loading,
		columns: taskStatusHook.taskStatus,
		updateKanbanBoard: setKanbanBoard,
		updateTaskStatus: updateTask,
		toggleColumn,
		isColumnCollapse,
		reorderStatus,
		addNewTask
	};
}
