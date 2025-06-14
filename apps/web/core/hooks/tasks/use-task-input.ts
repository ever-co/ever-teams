'use client';
import { ETaskStatusName } from '@/core/types/generics/enums/task';
import { memberActiveTaskIdState } from '@/core/stores';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAtomValue } from 'jotai';
import { useModal, useSyncRef } from '../common';
import { useTaskStatus } from './use-task-status';
import { useTeamTasks } from '../organizations';
import { useAuthenticateUser } from '../auth';
import { ITask } from '@/core/types/interfaces/task/task';
import { Nullable } from '@/core/types/generics/utils';
import { TTag } from '@/core/types/schemas';

export const h_filter = (status: ETaskStatusName, filters: 'closed' | 'open') => {
	switch (filters) {
		case 'open':
			return status !== 'closed';
		case 'closed':
			return status === 'closed';
		default:
			return true;
	}
};

/**
 * It returns a bunch of variables and functions that are used to manage the task input
 * @param [task] - The task to be edited. If not provided, the active task will be used.
 * @param {boolean} [initEditMode] - boolean
 * @returns An object with the following properties:
 */
export function useTaskInput({
	task,
	initEditMode,
	tasks: customTasks
}: {
	tasks?: ITask[];
	task?: Nullable<ITask>;
	initEditMode?: boolean;
} = {}) {
	const { isOpen: isModalOpen, openModal, closeModal } = useModal();
	const [closeableTask, setCloseableTaskTask] = useState<ITask | null>(null);
	const { taskStatuses: taskStatusList } = useTaskStatus();
	const {
		tasks: teamTasks,
		activeTeamTask,
		setActiveTask,
		createLoading,
		tasksFetching,
		updateLoading,
		createTask,
		updateTask
	} = useTeamTasks();

	const { user } = useAuthenticateUser();
	const userRef = useSyncRef(user);
	const [taskIssue, setTaskIssue] = useState('');
	const taskStatus = useRef<null | string>(null);
	const taskPriority = useRef<null | string>(null);
	const taskSize = useRef<null | string>(null);
	const taskDescription = useRef<null | string>(null);
	const taskLabels = useRef<TTag[]>([]);
	const taskProject = useRef<null | string>(null);
	const taskAssignees = useRef<{ id: string }[]>([]);

	const tasks = customTasks || teamTasks;

	const memberActiveTaskId = useAtomValue(memberActiveTaskIdState);

	const memberActiveTask = useMemo(() => {
		return tasks.find((item) => item.id === memberActiveTaskId) || null;
	}, [memberActiveTaskId, tasks]);

	const inputTask = initEditMode ? (task ?? activeTeamTask) : (memberActiveTask ?? task ?? activeTeamTask);

	const [filter, setFilter] = useState<'closed' | 'open'>('open');
	const [editMode, setEditMode] = useState(initEditMode || false);

	const handleOpenModal = useCallback(
		(concernedTask: ITask) => {
			setCloseableTaskTask(concernedTask);
			openModal();
		},
		[setCloseableTaskTask, openModal]
	);

	const handleReopenTask = useCallback(
		async (concernedTask: ITask) => {
			return updateTask({
				...concernedTask,
				status: ETaskStatusName.OPEN
			});
		},
		[updateTask]
	);

	const [query, setQuery] = useState('');

	const filteredTasks = useMemo(() => {
		if (query.trim() === '') {
			return tasks.filter((task) => h_filter(task.status as ETaskStatusName, filter));
		}

		return tasks.filter(
			(task) =>
				task.title
					.trim()
					.toLowerCase()
					.replace(/\s+/g, '')
					.startsWith(query.toLowerCase().replace(/\s+/g, '')) &&
				h_filter(task.status as ETaskStatusName, filter)
		);
	}, [query, tasks, filter]);

	const filteredTasks2 = useMemo(() => {
		if (query.trim() === '') {
			return tasks;
		}

		return tasks.filter((task) => {
			return task.title
				.trim()
				.toLowerCase()
				.replace(/\s+/g, '')
				.startsWith(query.toLowerCase().replace(/\s+/g, ''));
		});
	}, [query, tasks]);
	const hasCreateForm = filteredTasks2.length === 0 && query !== '';

	const handleTaskCreation = ({
		autoActiveTask = true,
		autoAssignTaskAuth = true
	}: {
		autoActiveTask?: boolean;
		autoAssignTaskAuth?: boolean;
		assignToUsers?: {
			id: string;
		}[];
	} = {}) => {
		if (query.trim().length < 2 || inputTask?.title === query.trim() || !userRef.current?.isEmailVerified) return;
		const openId = taskStatusList.find((item) => item.value === 'open')?.id;
		const statusId = taskStatusList.find((item) => item.name === taskStatus.current)?.id;

		return createTask({
			title: query.trim(),
			issueType: taskIssue || 'Bug',
			taskStatusId: statusId || (openId as string),
			status: taskStatus.current || undefined,
			priority: taskPriority.current || undefined,
			size: taskSize.current || undefined,
			tags: taskLabels.current || [],
			description: taskDescription.current ?? '',
			projectId: taskProject.current,
			members: [
				...(autoAssignTaskAuth && user?.employee?.id ? [{ id: user?.employee.id }] : []),
				...taskAssignees.current
			]
		}).then((res) => {
			setQuery('');
			localStorage.setItem('lastTaskIssue', taskIssue || 'Bug');
			setTaskIssue('');
			const items = res.data?.items || [];
			const created = items.find((t: ITask) => t.title === query.trim());
			if (created && autoActiveTask) setActiveTask(created);

			return created;
		});
	};

	const updateTaskTitleHandler = useCallback(
		(itask: ITask, title: string) => {
			if (!userRef.current?.isEmailVerified) return;

			return updateTask({
				...itask,
				title
			});
		},
		[updateTask, userRef]
	);

	const closedTaskCount = useMemo(() => {
		return filteredTasks2.filter((f_task) => {
			return f_task.status === ETaskStatusName.CLOSED;
		}).length;
	}, [filteredTasks2]);

	const openTaskCount = useMemo(() => {
		return filteredTasks2.filter((f_task) => {
			return f_task.status !== ETaskStatusName.CLOSED;
		}).length;
	}, [filteredTasks2]);

	useEffect(() => {
		setTaskIssue('');
	}, [hasCreateForm]);

	return {
		closedTaskCount,
		openTaskCount,
		hasCreateForm,
		handleTaskCreation,
		filteredTasks,
		handleReopenTask,
		handleOpenModal,
		createLoading,
		tasksFetching,
		updateLoading,
		setFilter,
		closeModal,
		isModalOpen,
		closeableTask,
		editMode,
		setEditMode,
		inputTask,
		setActiveTask,
		setQuery,
		filter,
		updateTaskTitleHandler,
		taskIssue,
		setTaskIssue,
		taskStatus,
		taskPriority,
		taskSize,
		taskLabels,
		taskDescription,
		user,
		userRef,
		taskProject,
		taskAssignees
	};
}

export type RTuseTaskInput = ReturnType<typeof useTaskInput>;
