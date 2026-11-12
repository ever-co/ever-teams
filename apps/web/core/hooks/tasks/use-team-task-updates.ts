'use client';

import { useCallback } from 'react';
import { useStore } from 'jotai';
import { toast } from 'sonner';
import { useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import { useUpdateTask } from '@/core/hooks/organizations/teams/use-update-task';
import { useBulkTaskUpdate } from '@/core/hooks/task-views/use-bulk-task-update';
import { useTaskLabelsQuery } from './use-task-labels-query';
import { tasksByTeamState } from '@/core/stores';
import { viewTasksState } from '@/core/stores/tasks/task-views';
import { queryKeys } from '@/core/query/keys';
import { useQueryClient } from '@tanstack/react-query';
import { taskUpdateQueue } from '@/core/lib/utils/task.utils';
import { errorReasonKeyOf } from '@/core/lib/utils/error-feedback';
import type { TOrganizationTeamEmployee, TTaskStatus } from '@/core/types/schemas';
import type { TTask } from '@/core/types/schemas/task/task.schema';
import { draggedTaskDatesOf, type TeamTasksTimelineDrag } from '@/core/lib/utils/team-tasks-timeline';

/** The fields a list of tasks edits in place; the names match the failure toast's own select. */
export type TeamTaskField = 'status' | 'priority' | 'size' | 'issueType' | 'tags' | 'dueDate' | 'members' | 'project';

type TaskChange = (task: TTask) => Partial<TTask> | null;


function isAssigned(task: TTask, member: TOrganizationTeamEmployee) {
	const employeeId = member.employeeId ?? member.employee?.id;
	const members = task.members ?? [];
	return members.some((assignee) => assignee.id === employeeId);
}

function withLabelToggled(task: TTask, labelName: string, allLabels: NonNullable<TTask['tags']>) {
	const current = task.tags ?? [];
	const hasLabel = current.some((tag) => tag.name === labelName);
	if (hasLabel) {
		return current.filter((tag) => tag.name !== labelName);
	}
	const label = allLabels.find((tag) => tag.name === labelName);
	if (!label) {
		return current;
	}
	return [...current, label];
}

/**
 * Saves property changes made from a list of tasks, on one task or a selection. Each change reads the task again
 * when its turn comes in the update queue, so several quick changes build on each other instead of on a stale
 * copy; the optimistic cache update of `useUpdateTask` moves the rows at once.
 *
 * A change to several tasks goes to the platform's bulk update when that feature is on (one request, one undo);
 * otherwise, and for one task, each task is updated on its own as before.
 */
export function useTeamTaskUpdates() {
	const t = useTranslations();
	const store = useStore();
	const { updateTask } = useUpdateTask();
	const { taskLabels } = useTaskLabelsQuery();
	const { bulkUpdate, isBulkAvailable } = useBulkTaskUpdate();

	const queryClient = useQueryClient();

	/** The task as last loaded: the team's copy, else the open view's (a built-in view lists tasks of other teams). */
	const latestTask = useCallback(
		(taskId: string) => {
			const tasks = store.get(tasksByTeamState);
			const fromTeam = tasks.find((task) => task.id === taskId);
			if (fromTeam) {
				return fromTeam;
			}
			return store.get(viewTasksState).find((task) => task.id === taskId);
		},
		[store]
	);

	const reportFailure = useCallback(
		(field: TeamTaskField, error: unknown) => {
			const reasonKey = errorReasonKeyOf(error) as DottedLanguageObjectStringPaths;
			toast.error(t('toasts.tasks.PROPERTY_UPDATE_FAILED', { field }), {
				id: `team-task-property-${field}`,
				description: t(reasonKey)
			});
		},
		[t]
	);

	const applyChange = useCallback(
		(taskIds: string[], field: TeamTaskField, change: TaskChange, options?: { moveTimeLogs?: boolean }) => {
			for (const taskId of taskIds) {
				const run = async () => {
					const task = latestTask(taskId);
					if (!task) {
						return;
					}
					const update = change(task);
					if (!update) {
						return;
					}
					try {
						await updateTask({ ...task, ...update }, options);
						// A view's own list (a built-in view) reads the platform again.
						void queryClient.invalidateQueries({ queryKey: queryKeys.taskViews.all });
					} catch (error) {
						reportFailure(field, error);
					}
				};
				taskUpdateQueue.task(run);
			}
		},
		[latestTask, queryClient, reportFailure, updateTask]
	);

	/** Whether a change to these tasks goes to the platform's bulk update. */
	const usesBulk = useCallback((taskIds: string[]) => isBulkAvailable && taskIds.length > 1, [isBulkAvailable]);

	const fieldLabel = useCallback(
		(field: 'status' | 'priority' | 'size' | 'issueType') => t(`taskMenus.fields.${field}` as DottedLanguageObjectStringPaths),
		[t]
	);

	const setStatus = useCallback(
		(taskIds: string[], status: TTaskStatus) => {
			if (usesBulk(taskIds)) {
				void bulkUpdate(taskIds, { taskStatusId: status.id, status: status.name }, t('taskViews.FIELD_CHANGED', { field: fieldLabel('status') })).catch(() => undefined);
				return;
			}
			applyChange(taskIds, 'status', (task) => {
				const isSame = task.taskStatusId === status.id;
				if (isSame) {
					return null;
				}
				return { status: status.name as TTask['status'], taskStatusId: status.id };
			});
		},
		[applyChange, bulkUpdate, fieldLabel, t, usesBulk]
	);

	const setPriority = useCallback(
		(taskIds: string[], priority: string) => {
			if (usesBulk(taskIds)) {
				void bulkUpdate(taskIds, { priority }, t('taskViews.FIELD_CHANGED', { field: fieldLabel('priority') })).catch(() => undefined);
				return;
			}
			applyChange(taskIds, 'priority', (task) => {
				if (task.priority === priority) {
					return null;
				}
				return { priority: priority as TTask['priority'] };
			});
		},
		[applyChange, bulkUpdate, fieldLabel, t, usesBulk]
	);

	const setSize = useCallback(
		(taskIds: string[], size: string) => {
			if (usesBulk(taskIds)) {
				void bulkUpdate(taskIds, { size }, t('taskViews.FIELD_CHANGED', { field: fieldLabel('size') })).catch(() => undefined);
				return;
			}
			applyChange(taskIds, 'size', (task) => {
				if (task.size === size) {
					return null;
				}
				return { size: size as TTask['size'] };
			});
		},
		[applyChange, bulkUpdate, fieldLabel, t, usesBulk]
	);

	const setIssueType = useCallback(
		(taskIds: string[], issueType: string) => {
			applyChange(taskIds, 'issueType', (task) => {
				if (task.issueType === issueType) {
					return null;
				}
				return { issueType: issueType as TTask['issueType'] };
			});
		},
		[applyChange]
	);

	/**
	 * One task: the label is added or taken away. A selection (one request): the label is taken off every task when
	 * every one of them has it (the picker shows it checked then), and added to every task otherwise.
	 */
	const toggleLabel = useCallback(
		(taskIds: string[], labelName: string) => {
			const allLabels = taskLabels as NonNullable<TTask['tags']>;
			if (usesBulk(taskIds)) {
				const label = allLabels.find((tag) => tag.name === labelName);
				if (!label?.id) {
					return;
				}
				const everyHas = taskIds.every((taskId) => (latestTask(taskId)?.tags ?? []).some((tag) => tag.name === labelName));
				const changes = everyHas ? { removeTagIds: [label.id] } : { addTagIds: [label.id] };
				const message = everyHas ? t('taskViews.REMOVED_LABEL', { name: labelName }) : t('taskViews.ADDED_LABEL', { name: labelName });
				void bulkUpdate(taskIds, changes, message).catch(() => undefined);
				return;
			}
			applyChange(taskIds, 'tags', (task) => ({ tags: withLabelToggled(task, labelName, allLabels) }));
		},
		[applyChange, bulkUpdate, latestTask, t, taskLabels, usesBulk]
	);

	/** One task, or a selection (one request with the saved-views feature, one undo); `null` removes the due date. */
	const setDueDate = useCallback(
		(taskIds: string | string[], dueDate: Date | null) => {
			const ids = typeof taskIds === 'string' ? [taskIds] : taskIds;
			if (usesBulk(ids)) {
				const message = t('taskViews.FIELD_CHANGED', { field: t('pages.taskDetails.DUE_DATE') });
				void bulkUpdate(ids, { dueDate: dueDate ? dueDate.toISOString() : null }, message).catch(() => undefined);
				return;
			}
			applyChange(ids, 'dueDate', () => ({ dueDate }));
		},
		[applyChange, bulkUpdate, t, usesBulk]
	);

	/**
	 * Moves a task's dates by whole days (the timeline's drag): the whole task, or one end of its range. The dates are
	 * worked out when the queued update runs, from the task as it then is, so quick repeated moves add up instead of
	 * repeating the first; both dates go in one update, so the task never holds a due date before its start in between.
	 */
	const moveDates = useCallback(
		(taskId: string, drag: TeamTasksTimelineDrag, deltaDays: number) => {
			applyChange([taskId], 'dueDate', (task) => draggedTaskDatesOf(task, drag, deltaDays));
		},
		[applyChange]
	);

	/** Moves the tasks to a project (`null`: out of any project); a selection in one request with the feature on. */
	const setProject = useCallback(
		(taskIds: string[], projectId: string | null) => {
			if (usesBulk(taskIds)) {
				const message = t('taskViews.FIELD_CHANGED', { field: t('taskMenus.fields.project') });
				void bulkUpdate(taskIds, { projectId }, message).catch(() => undefined);
				return;
			}
			// The task's tracked time moves with it, as when the project is set from the task itself (`ProjectDropDown`):
			// the same change must not give different timesheets depending on where it was made.
			applyChange(
				taskIds,
				'project',
				(task) => {
					if ((task.projectId ?? null) === projectId) {
						return null;
					}
					return { projectId };
				},
				{ moveTimeLogs: true }
			);
		},
		[applyChange, bulkUpdate, t, usesBulk]
	);

	/** Adds the member to every task that does not have them yet; nobody is removed from a selection. */
	const assignMember = useCallback(
		(taskIds: string[], member: TOrganizationTeamEmployee) => {
			const employeeId = member.employeeId ?? member.employee?.id;
			if (usesBulk(taskIds) && employeeId) {
				void bulkUpdate(taskIds, { addMemberIds: [employeeId] }, t('taskViews.FIELD_CHANGED', { field: t('common.ASSIGNEE') })).catch(() => undefined);
				return;
			}
			applyChange(taskIds, 'members', (task) => {
				if (isAssigned(task, member)) {
					return null;
				}
				const members = [...(task.members ?? []), member as unknown as NonNullable<TTask['members']>[number]];
				return { members };
			});
		},
		[applyChange, bulkUpdate, t, usesBulk]
	);

	/**
	 * Archives the tasks in one request (the saved-views feature's bulk update), with an undo. Answers the ids of the
	 * tasks that were not archived (refused, or not sent), so the caller can keep them selected for a retry.
	 */
	const archiveTasks = useCallback(
		async (taskIds: string[]): Promise<string[]> => {
			if (!isBulkAvailable || !taskIds.length) {
				return taskIds;
			}
			try {
				const outcome = await bulkUpdate(taskIds, { isArchived: true }, t('taskViews.ARCHIVED_LABEL'));
				return outcome?.unappliedIds ?? [];
			} catch {
				return taskIds;
			}
		},
		[bulkUpdate, isBulkAvailable, t]
	);

	return {
		setStatus,
		setPriority,
		setSize,
		setIssueType,
		toggleLabel,
		setDueDate,
		moveDates,
		setProject,
		assignMember,
		archiveTasks,
		canArchive: isBulkAvailable
	};
}
