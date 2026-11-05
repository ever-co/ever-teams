'use client';

import { useCallback } from 'react';
import { useStore } from 'jotai';
import { toast } from 'sonner';
import { useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import { useUpdateTask } from '@/core/hooks/organizations/teams/use-update-task';
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
 */
export function useTeamTaskUpdates() {
	const t = useTranslations();
	const store = useStore();
	const { updateTask } = useUpdateTask();
	const { taskLabels } = useTaskLabelsQuery();

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

	const setStatus = useCallback(
		(taskIds: string[], status: TTaskStatus) => {
			applyChange(taskIds, 'status', (task) => {
				const isSame = task.taskStatusId === status.id;
				if (isSame) {
					return null;
				}
				return { status: status.name as TTask['status'], taskStatusId: status.id };
			});
		},
		[applyChange]
	);

	const setPriority = useCallback(
		(taskIds: string[], priority: string) => {
			applyChange(taskIds, 'priority', (task) => {
				if (task.priority === priority) {
					return null;
				}
				return { priority: priority as TTask['priority'] };
			});
		},
		[applyChange]
	);

	const setSize = useCallback(
		(taskIds: string[], size: string) => {
			applyChange(taskIds, 'size', (task) => {
				if (task.size === size) {
					return null;
				}
				return { size: size as TTask['size'] };
			});
		},
		[applyChange]
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

	const toggleLabel = useCallback(
		(taskId: string, labelName: string) => {
			const allLabels = taskLabels as NonNullable<TTask['tags']>;
			applyChange([taskId], 'tags', (task) => ({ tags: withLabelToggled(task, labelName, allLabels) }));
		},
		[applyChange, taskLabels]
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
			applyChange(taskIds, 'members', (task) => {
				if (isAssigned(task, member)) {
					return null;
				}
				const members = [...(task.members ?? []), member as unknown as NonNullable<TTask['members']>[number]];
				return { members };
			});
		},
		[applyChange]
	);

	return { setStatus, setPriority, setSize, setIssueType, toggleLabel, setDueDate, assignMember };
}
