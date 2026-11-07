'use client';

import { useCallback } from 'react';
import { useStore } from 'jotai';
import { toast } from 'sonner';
import { useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import { useUpdateTask } from '@/core/hooks/organizations/teams/use-update-task';
import { useBulkTaskUpdate } from '@/core/hooks/task-views/use-bulk-task-update';
import { useTaskLabelsQuery } from './use-task-labels-query';
import { tasksByTeamState } from '@/core/stores';
import { taskUpdateQueue } from '@/core/lib/utils/task.utils';
import { errorReasonKeyOf } from '@/core/lib/utils/error-feedback';
import type { TOrganizationTeamEmployee, TTaskStatus } from '@/core/types/schemas';
import type { TTask } from '@/core/types/schemas/task/task.schema';

/** The fields a list of tasks edits in place; the names match the failure toast's own select. */
export type TeamTaskField = 'status' | 'priority' | 'size' | 'issueType' | 'tags' | 'dueDate' | 'members';

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

	const latestTask = useCallback(
		(taskId: string) => {
			const tasks = store.get(tasksByTeamState);
			return tasks.find((task) => task.id === taskId);
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
		(taskIds: string[], field: TeamTaskField, change: TaskChange) => {
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
						await updateTask({ ...task, ...update });
					} catch (error) {
						reportFailure(field, error);
					}
				};
				taskUpdateQueue.task(run);
			}
		},
		[latestTask, reportFailure, updateTask]
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

	/** One task: the label is added or taken away. A selection: the label is added to every task (one request). */
	const toggleLabel = useCallback(
		(taskIds: string[], labelName: string) => {
			const allLabels = taskLabels as NonNullable<TTask['tags']>;
			if (usesBulk(taskIds)) {
				const label = allLabels.find((tag) => tag.name === labelName);
				if (!label?.id) {
					return;
				}
				void bulkUpdate(taskIds, { addTagIds: [label.id] }, t('taskViews.ADDED_LABEL', { name: labelName })).catch(() => undefined);
				return;
			}
			applyChange(taskIds, 'tags', (task) => ({ tags: withLabelToggled(task, labelName, allLabels) }));
		},
		[applyChange, bulkUpdate, t, taskLabels, usesBulk]
	);

	const setDueDate = useCallback(
		(taskId: string, dueDate: Date | null) => {
			applyChange([taskId], 'dueDate', () => ({ dueDate }));
		},
		[applyChange]
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

	/** Archives the tasks in one request (the saved-views feature's bulk update), with an undo. */
	const archiveTasks = useCallback(
		(taskIds: string[]) => {
			if (!isBulkAvailable || !taskIds.length) {
				return;
			}
			void bulkUpdate(taskIds, { isArchived: true }, t('taskViews.ARCHIVED_LABEL')).catch(() => undefined);
		},
		[bulkUpdate, isBulkAvailable, t]
	);

	return { setStatus, setPriority, setSize, setIssueType, toggleLabel, setDueDate, assignMember, archiveTasks, canArchive: isBulkAvailable };
}
