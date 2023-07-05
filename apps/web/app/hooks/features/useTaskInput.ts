import { useAuthenticateUser, useModal, useSyncRef } from '@app/hooks';
import { useTeamTasks } from '@app/hooks/features/useTeamTasks';
import { Nullable } from '@app/interfaces';
import { ITaskStatus, ITeamTask } from '@app/interfaces/ITask';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export const h_filter = (status: ITaskStatus, filters: 'closed' | 'open') => {
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
	tasks: customTasks,
}: {
	tasks?: ITeamTask[];
	task?: Nullable<ITeamTask>;
	initEditMode?: boolean;
} = {}) {
	const { isOpen: isModalOpen, openModal, closeModal } = useModal();
	const [closeableTask, setCloseableTaskTask] = useState<ITeamTask | null>(
		null
	);

	const {
		tasks: teamTasks,
		activeTeamTask,
		setActiveTask,
		createLoading,
		tasksFetching,
		updateLoading,
		createTask,
		updateTask,
	} = useTeamTasks();

	const { user } = useAuthenticateUser();
	const userRef = useSyncRef(user);

	const taskIssue = useRef<null | string>(null);

	const tasks = customTasks || teamTasks;

	/**
	 * If task has null value then consider it as value 😄
	 */
	const inputTask = task !== undefined ? task : activeTeamTask;

	const [filter, setFilter] = useState<'closed' | 'open'>('open');
	const [editMode, setEditMode] = useState(initEditMode || false);

	const handleOpenModal = useCallback(
		(concernedTask: ITeamTask) => {
			setCloseableTaskTask(concernedTask);
			openModal();
		},
		[setCloseableTaskTask, openModal]
	);

	const handleReopenTask = useCallback(
		async (concernedTask: ITeamTask) => {
			return updateTask({
				...concernedTask,
				status: 'open',
			});
		},
		[updateTask]
	);

	const [query, setQuery] = useState('');

	const filteredTasks = useMemo(() => {
		if (query.trim() === '') {
			return tasks.filter((task) => h_filter(task.status, filter));
		}

		return tasks.filter(
			(task) =>
				task.title
					.trim()
					.toLowerCase()
					.replace(/\s+/g, '')
					.startsWith(query.toLowerCase().replace(/\s+/g, '')) &&
				h_filter(task.status, filter)
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
		autoAssignTaskAuth = true,
		assignToUsers = [],
	}: {
		autoActiveTask?: boolean;
		autoAssignTaskAuth?: boolean;
		assignToUsers?: {
			id: string;
		}[];
	} = {}) => {
		if (
			query.trim().length < 2 ||
			inputTask?.title === query.trim() ||
			!userRef.current?.isEmailVerified
		)
			return;

		return createTask(
			{
				taskName: query.trim(),
				issueType: taskIssue.current || undefined,
			},
			!autoAssignTaskAuth ? assignToUsers : undefined
		).then((res) => {
			setQuery('');
			const items = res.data?.items || [];
			const created = items.find((t) => t.title === query.trim());
			if (created && autoActiveTask) setActiveTask(created);

			return created;
		});
	};

	const updateTaskTitleHandler = useCallback(
		(itask: ITeamTask, title: string) => {
			if (!userRef.current?.isEmailVerified) return;

			return updateTask({
				...itask,
				title,
			});
		},
		[updateTask, userRef]
	);

	const closedTaskCount = filteredTasks2.filter((f_task) => {
		return f_task.status === 'closed';
	}).length;

	const openTaskCount = filteredTasks2.filter((f_task) => {
		return f_task.status !== 'closed';
	}).length;

	useEffect(() => {
		taskIssue.current = null;
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
		user,
		userRef,
	};
}

export type RTuseTaskInput = ReturnType<typeof useTaskInput>;
