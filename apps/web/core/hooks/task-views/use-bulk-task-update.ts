'use client';

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { queryKeys } from '@/core/query/keys';
import { taskViewsService } from '@/core/services/client/api/task-views/task-views.service';
import { isTaskViewsEnabled } from '@/core/lib/utils/task-views-enabled';
import {
	TASK_BULK_UPDATE_MAX,
	type ITaskBulkChanges,
	type ITaskBulkUpdateItem,
	type ITaskBulkUpdateOutcome
} from '@/core/types/interfaces/common/task-views';

/** The undo of a bulk update: the previous values of the tasks that changed, as the same request. */
export function undoItemsOf(outcome: ITaskBulkUpdateOutcome): ITaskBulkUpdateItem[] {
	return outcome.results
		.filter((result) => result.ok && result.previous && Object.keys(result.previous).length > 0)
		.map((result) => ({ taskId: result.taskId, changes: result.previous as ITaskBulkChanges }));
}

/**
 * One request changing many tasks, with an undo toast that sends the previous values back. Only when the saved
 * views feature is on (the platform route came with it); the callers fall back to one update per task otherwise.
 */
export function useBulkTaskUpdate() {
	const t = useTranslations();
	const queryClient = useQueryClient();

	const refresh = useCallback(() => {
		void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
		void queryClient.invalidateQueries({ queryKey: queryKeys.taskViews.all });
	}, [queryClient]);

	const run = useCallback(
		async (input: { taskIds?: string[]; changes?: ITaskBulkChanges; items?: ITaskBulkUpdateItem[] }): Promise<ITaskBulkUpdateOutcome> => {
			const outcome = await taskViewsService.bulkUpdate(input);
			refresh();
			return outcome;
		},
		[refresh]
	);

	/** Applies the changes to the tasks (at most the platform's limit at once) and offers an undo. */
	const bulkUpdate = useCallback(
		async (taskIds: string[], changes: ITaskBulkChanges, label: string): Promise<ITaskBulkUpdateOutcome | null> => {
			if (!taskIds.length) return null;
			const batches: string[][] = [];
			for (let at = 0; at < taskIds.length; at += TASK_BULK_UPDATE_MAX) batches.push(taskIds.slice(at, at + TASK_BULK_UPDATE_MAX));
			const outcomes: ITaskBulkUpdateOutcome[] = [];
			try {
				for (const batch of batches) outcomes.push(await run({ taskIds: batch, changes }));
			} catch (error) {
				toast.error(t('taskViews.BULK_FAILED'));
				throw error;
			}
			const outcome: ITaskBulkUpdateOutcome = {
				applied: outcomes.reduce((sum, item) => sum + item.applied, 0),
				refused: outcomes.reduce((sum, item) => sum + item.refused, 0),
				results: outcomes.flatMap((item) => item.results)
			};
			const undoItems = undoItemsOf(outcome);
			const message = outcome.refused > 0
				? t('taskViews.BULK_PARTLY_APPLIED', { applied: outcome.applied, refused: outcome.refused, label })
				: t('taskViews.BULK_APPLIED', { count: outcome.applied, label });
			toast(message, {
				id: 'task-bulk-update',
				action: undoItems.length
					? {
							label: t('taskViews.UNDO'),
							onClick: () => {
								void run({ items: undoItems }).then(
									() => toast.success(t('taskViews.UNDONE', { count: undoItems.length })),
									() => toast.error(t('taskViews.UNDO_FAILED'))
								);
							}
						}
					: undefined
			});
			return outcome;
		},
		[run, t]
	);

	return { bulkUpdate, isBulkAvailable: isTaskViewsEnabled() };
}
