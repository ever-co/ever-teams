'use client';

import { useCallback, useState } from 'react';
import { useSetAtom } from 'jotai';
import { toast } from 'sonner';
import { useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import { useInvalidateTeamTasks } from '@/core/hooks/organizations/teams/use-invalidate-team-tasks';
import { useTaskQueries } from '@/core/hooks/organizations/teams/use-task-queries';
import { useUpdateTask } from '@/core/hooks/organizations/teams/use-update-task';
import { useCreateTaskFromPicker } from '@/core/hooks/tasks/use-create-task-from-picker';
import { errorReasonKeyOf } from '@/core/lib/utils/error-feedback';
import { detailedTaskState } from '@/core/stores';
import { EIssueType } from '@/core/types/generics/enums/task';
import type { TTask } from '@/core/types/schemas/task/task.schema';

function withChild(current: TTask | null, parentId: string, child: TTask) {
	if (current?.id !== parentId) {
		return current;
	}
	const children = [...(current.children ?? []), child];
	return { ...current, children };
}

function withoutChild(current: TTask | null, parentId: string, childId: string) {
	if (current?.id !== parentId) {
		return current;
	}
	const children = (current.children ?? []).filter((child) => child.id !== childId);
	return { ...current, children };
}

export function useTaskHierarchy(task: TTask) {
	const t = useTranslations();
	const setDetailedTask = useSetAtom(detailedTaskState);
	const { updateTask } = useUpdateTask();
	const createTaskTitled = useCreateTaskFromPicker(task);
	const { getTaskById } = useTaskQueries();
	const { invalidateTeamTasksData } = useInvalidateTeamTasks();
	const [isSaving, setIsSaving] = useState(false);

	const showFailure = useCallback(
		(messageKey: DottedLanguageObjectStringPaths, error: unknown) => {
			const reasonKey = errorReasonKeyOf(error) as DottedLanguageObjectStringPaths;
			toast.error(t(messageKey), { description: t(reasonKey) });
		},
		[t]
	);

	const readBack = useCallback(() => {
		getTaskById(task.id);
		invalidateTeamTasksData(task.id);
	}, [getTaskById, invalidateTeamTasksData, task.id]);

	const addChild = useCallback(
		async (child: TTask) => {
			setIsSaving(true);
			setDetailedTask((current) => withChild(current, task.id, child));
			try {
				await updateTask({ ...child, id: child.id, parentId: task.id, parent: { ...task, id: task.id } });
			} catch (error) {
				setDetailedTask((current) => withoutChild(current, task.id, child.id));
				showFailure('taskDetail.toasts.SUBTASK_ADD_FAILED', error);
			} finally {
				setIsSaving(false);
				readBack();
			}
		},
		[readBack, setDetailedTask, showFailure, task, updateTask]
	);

	const removeChild = useCallback(
		async (child: TTask) => {
			setIsSaving(true);
			setDetailedTask((current) => withoutChild(current, task.id, child.id));
			try {
				await updateTask({ ...child, id: child.id, parentId: null, parent: null });
			} catch (error) {
				setDetailedTask((current) => withChild(current, task.id, child));
				showFailure('taskDetail.toasts.SUBTASK_REMOVE_FAILED', error);
			} finally {
				setIsSaving(false);
				readBack();
			}
		},
		[readBack, setDetailedTask, showFailure, task.id, updateTask]
	);

	const createChild = useCallback(
		async (title: string) => {
			let created: TTask | null = null;
			try {
				created = await createTaskTitled(title, EIssueType.TASK);
			} catch {
				// useCreateTask already showed the error
				return;
			}
			if (!created) {
				showFailure('taskDetail.toasts.SUBTASK_ADD_FAILED', null);
				return;
			}
			await addChild(created);
		},
		[addChild, createTaskTitled, showFailure]
	);

	const setParent = useCallback(
		async (parent: TTask) => {
			setIsSaving(true);
			try {
				await updateTask({ ...task, id: task.id, parentId: parent.id, parent: { ...parent, id: parent.id } });
				toast.success(t('toasts.tasks.PARENT_SET', { title: parent.title }));
			} catch (error) {
				showFailure('toasts.tasks.PARENT_SET_FAILED', error);
			} finally {
				setIsSaving(false);
				readBack();
			}
		},
		[readBack, showFailure, t, task, updateTask]
	);

	const removeParent = useCallback(async () => {
		setIsSaving(true);
		try {
			await updateTask({ ...task, id: task.id, parentId: null, parent: null });
		} catch (error) {
			showFailure('taskDetail.toasts.PARENT_REMOVE_FAILED', error);
		} finally {
			setIsSaving(false);
			readBack();
		}
	}, [readBack, showFailure, task, updateTask]);

	const createParent = useCallback(
		async (title: string, issueType: EIssueType) => {
			let created: TTask | null = null;
			try {
				created = await createTaskTitled(title, issueType);
			} catch {
				// useCreateTask already showed the error
				return;
			}
			if (!created) {
				showFailure('toasts.tasks.PARENT_SET_FAILED', null);
				return;
			}
			await setParent(created);
		},
		[createTaskTitled, setParent, showFailure]
	);

	return { addChild, removeChild, createChild, setParent, removeParent, createParent, isSaving };
}
