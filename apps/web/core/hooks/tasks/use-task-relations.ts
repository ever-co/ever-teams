'use client';

import { useCallback } from 'react';
import { useSetAtom } from 'jotai';
import { toast } from 'sonner';
import { useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import { useInvalidateTeamTasks } from '@/core/hooks/organizations/teams/use-invalidate-team-tasks';
import { useTaskQueries } from '@/core/hooks/organizations/teams/use-task-queries';
import { useCreateTaskFromPicker } from '@/core/hooks/tasks/use-create-task-from-picker';
import { errorReasonKeyOf } from '@/core/lib/utils/error-feedback';
import { taskLinkedIssueService } from '@/core/services/client/api/tasks/task-linked-issue.service';
import { detailedTaskState } from '@/core/stores';
import { ERelatedIssuesRelation } from '@/core/types/generics/enums/task';
import type { ITaskLinkedIssue } from '@/core/types/interfaces/task/task-linked-issue';
import type { TTask } from '@/core/types/schemas/task/task.schema';

type LinkedIssues = NonNullable<TTask['linkedIssues']>;

function linkedIssuesOf(task: TTask | null) {
	return (task?.linkedIssues ?? []) as ITaskLinkedIssue[];
}

function withLinkedIssues(current: TTask | null, taskId: string, linkedIssues: ITaskLinkedIssue[]) {
	if (current?.id !== taskId) {
		return current;
	}
	return { ...current, linkedIssues: linkedIssues as unknown as LinkedIssues };
}

function withLink(current: TTask | null, taskId: string, link: ITaskLinkedIssue) {
	const links = [...linkedIssuesOf(current), link];
	return withLinkedIssues(current, taskId, links);
}

function withoutLink(current: TTask | null, taskId: string, linkId: string | undefined) {
	const links = linkedIssuesOf(current).filter((link) => link.id !== linkId);
	return withLinkedIssues(current, taskId, links);
}

function withLinkAction(
	current: TTask | null,
	taskId: string,
	linkId: string | undefined,
	action: ERelatedIssuesRelation
) {
	const links = linkedIssuesOf(current).map((link) => {
		if (link.id !== linkId) {
			return link;
		}
		return { ...link, action };
	});
	return withLinkedIssues(current, taskId, links);
}

/** A new link goes from the picked task to this one, as the previous dialog created it. */
export function useTaskRelations(task: TTask) {
	const t = useTranslations();
	const setDetailedTask = useSetAtom(detailedTaskState);
	const { getTaskById } = useTaskQueries();
	const { invalidateTeamTasksData } = useInvalidateTeamTasks();
	const createTaskTitled = useCreateTaskFromPicker(task);

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

	const link = useCallback(
		async (other: TTask) => {
			try {
				const response = await taskLinkedIssueService.createTaskLinkedIssue({
					taskFromId: other.id,
					taskToId: task.id,
					organizationId: task.organizationId,
					action: ERelatedIssuesRelation.RELATES_TO
				});
				const created = { ...response.data, taskFrom: other, taskTo: task };
				setDetailedTask((current) => withLink(current, task.id, created));
			} catch (error) {
				showFailure('taskDetail.toasts.RELATION_ADD_FAILED', error);
			} finally {
				readBack();
			}
		},
		[readBack, setDetailedTask, showFailure, task]
	);

	const changeKind = useCallback(
		async (issue: ITaskLinkedIssue, action: ERelatedIssuesRelation) => {
			const previousAction = issue.action;
			setDetailedTask((current) => withLinkAction(current, task.id, issue.id, action));
			try {
				await taskLinkedIssueService.updateTaskLinkedIssue({ ...issue, action });
			} catch (error) {
				setDetailedTask((current) => withLinkAction(current, task.id, issue.id, previousAction));
				showFailure('taskDetail.toasts.RELATION_UPDATE_FAILED', error);
			}
		},
		[setDetailedTask, showFailure, task.id]
	);

	const unlink = useCallback(
		async (issue: ITaskLinkedIssue) => {
			if (!issue.id) {
				return;
			}
			setDetailedTask((current) => withoutLink(current, task.id, issue.id));
			try {
				await taskLinkedIssueService.deleteTaskLinkedIssue(issue.id);
			} catch (error) {
				setDetailedTask((current) => withLink(current, task.id, issue));
				showFailure('taskDetail.toasts.RELATION_REMOVE_FAILED', error);
			} finally {
				readBack();
			}
		},
		[readBack, setDetailedTask, showFailure, task.id]
	);

	const createAndLink = useCallback(
		async (title: string) => {
			let created: TTask | null = null;
			try {
				created = await createTaskTitled(title);
			} catch {
				// useCreateTask already showed the error
				return;
			}
			if (!created) {
				showFailure('taskDetail.toasts.RELATION_ADD_FAILED', null);
				return;
			}
			await link(created);
		},
		[createTaskTitled, link, showFailure]
	);

	return { link, createAndLink, changeKind, unlink };
}
