'use client';

import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useCreateTask } from '@/core/hooks/organizations/teams/use-create-task';
import { EIssueType, ETaskPriority } from '@/core/types/generics/enums/task';
import type { TTask } from '@/core/types/schemas/task/task.schema';

/** The actions every task menu offers besides editing: copy a text with feedback, and duplicate the task. */
export function useTaskMenuActions() {
	const t = useTranslations();
	const { createTask } = useCreateTask();

	const copyText = useCallback(
		async (text: string) => {
			try {
				await navigator.clipboard.writeText(text);
				toast.success(t('common.COPIED'));
			} catch (error) {
				console.error('Task menu: could not copy to the clipboard', error);
				toast.error(t('toasts.common.COPY_FAILED'), {
					id: 'clipboard-copy-failed',
					description: t('toasts.common.COPY_FAILED_HINT')
				});
			}
		},
		[t]
	);

	const copyTaskLink = useCallback(
		(task: TTask) => {
			const taskUrl = `${window.location.origin}/task/${task.id}`;
			return copyText(taskUrl);
		},
		[copyText]
	);

	const copyTaskId = useCallback((task: TTask) => copyText(task.id), [copyText]);

	const makeCopy = useCallback(
		async (task: TTask, fallbackStatusId: string | undefined) => {
			const { priority, ...taskWithoutPriority } = task;
			// Same body as before this hook existed: a team without statuses sent no status id either.
			const taskStatusId = (task.taskStatusId ?? fallbackStatusId) as string;
			try {
				await createTask({
					...taskWithoutPriority,
					taskStatusId,
					title: `Copy ${task.title}`,
					issueType: task.issueType ?? EIssueType.BUG,
					priority: priority as ETaskPriority | null | undefined
				});
			} catch (error) {
				console.error('Task menu: could not copy the task', error);
			}
		},
		[createTask]
	);

	return { copyText, copyTaskLink, copyTaskId, makeCopy };
}
