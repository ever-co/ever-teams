'use client';
import { ETaskStatusName } from '@/core/types/generics/enums/task';
import { activeTeamTaskState, memberActiveTaskIdState, taskStatusesState } from '@/core/stores';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAtomValue } from 'jotai';
import { useModal, useSyncRef } from '../common';
import { useTeamTasks } from '../organizations';
import { useAuthenticateUser } from '../auth';
import { Nullable } from '@/core/types/generics/utils';
import { TTag } from '@/core/types/schemas';
import { TTask } from '@/core/types/schemas/task/task.schema';

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
	tasks?: TTask[];
	task?: Nullable<TTask>;
	initEditMode?: boolean;
} = {}) {
	const { isOpen: isModalOpen, openModal, closeModal } = useModal();
	const [closeableTask, setCloseableTaskTask] = useState<TTask | null>(null);
	const taskStatusList = useAtomValue(taskStatusesState);
	const activeTeamTask = useAtomValue(activeTeamTaskState);

	const {
		tasks: teamTasks,
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
		(concernedTask: TTask) => {
			setCloseableTaskTask(concernedTask);
			openModal();
		},
		[setCloseableTaskTask, openModal]
	);

	const handleReopenTask = useCallback(
		async (concernedTask: TTask) => {
			return updateTask({
				...concernedTask,
				status: ETaskStatusName.OPEN
			});
		},
		[updateTask]
	);

	const [query, setQuery] = useState('');
	const [isCreatingTask, setIsCreatingTask] = useState(false);

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

	// Detect when user is creating a task to stabilize hasCreateForm
	useEffect(() => {
		const isCreating = filteredTasks2.length === 0 && query !== '' && query.trim().length >= 2;
		setIsCreatingTask(isCreating);
	}, [filteredTasks2.length, query]);

	// Stabilized hasCreateForm that doesn't reset during task creation
	const hasCreateForm = useMemo(() => {
		if (isCreatingTask) {
			return true; // Keep form visible during creation
		}
		return filteredTasks2.length === 0 && query !== '';
	}, [filteredTasks2.length, query, isCreatingTask]);

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
			members: [...(autoAssignTaskAuth && user?.employee?.id ? [user?.employee] : []), ...taskAssignees.current]
		}).then((res) => {
			setQuery('');
			setIsCreatingTask(false); // Reset creation state after task creation
			localStorage.setItem('lastTaskIssue', taskIssue || 'Bug');
			setTaskIssue('');
			const items = res?.items || [];
			const created = items.find((t: TTask) => t.title === query.trim());
			if (created && autoActiveTask) setActiveTask(created as any);

			return created;
		});
	};

	const updateTaskTitleHandler = useCallback(
		(task: TTask, title: string) => {
			if (!userRef.current?.isEmailVerified) return;

			return updateTask({
				...task,
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
		taskAssignees,
		isCreatingTask
	};
}

export type RTuseTaskInput = ReturnType<typeof useTaskInput>;
