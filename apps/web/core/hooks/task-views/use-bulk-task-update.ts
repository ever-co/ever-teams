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
function undoItemsOf(outcome: ITaskBulkUpdateOutcome): ITaskBulkUpdateItem[] {
	return outcome.results
		.filter((result) => result.ok && result.previous && Object.keys(result.previous).length > 0)
		.map((result) => ({ taskId: result.taskId, changes: result.previous as ITaskBulkChanges }));
}

/** Slices a list into the batches the platform takes at once. */
function batchesOf<T>(items: readonly T[], size = TASK_BULK_UPDATE_MAX): T[][] {
	const batches: T[][] = [];
	for (let at = 0; at < items.length; at += size) batches.push(items.slice(at, at + size));
	return batches;
}

/** One outcome out of several (the batches of one change). */
function mergeOutcomes(outcomes: readonly ITaskBulkUpdateOutcome[]): ITaskBulkUpdateOutcome {
	return {
		applied: outcomes.reduce((sum, item) => sum + item.applied, 0),
		refused: outcomes.reduce((sum, item) => sum + item.refused, 0),
		results: outcomes.flatMap((item) => item.results)
	};
}

/** The outcomes of the batches that went through; the others are reported. */
function settledOutcomes(settled: PromiseSettledResult<ITaskBulkUpdateOutcome>[]): { outcomes: ITaskBulkUpdateOutcome[]; failed: number } {
	const outcomes: ITaskBulkUpdateOutcome[] = [];
	let failed = 0;
	for (const result of settled) {
		if (result.status === 'fulfilled') outcomes.push(result.value);
		else failed += 1;
	}
	return { outcomes, failed };
}

/**
 * One request changing many tasks (in batches of the platform's limit, sent together), with an undo toast that
 * sends the previous values back in batches too and reports what the undo put back. Only when the saved views
 * feature is on (the platform route came with it); the callers fall back to one update per task otherwise.
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

	/** Sends the previous values back, batch by batch, and says how many tasks were put back. */
	const undo = useCallback(
		async (items: ITaskBulkUpdateItem[]) => {
			const settled = await Promise.allSettled(batchesOf(items).map((batch) => run({ items: batch })));
			const { outcomes, failed } = settledOutcomes(settled);
			const outcome = mergeOutcomes(outcomes);
			if (failed > 0 && outcomes.length === 0) {
				toast.error(t('taskViews.UNDO_FAILED'));
				return;
			}
			if (failed > 0 || outcome.refused > 0) {
				toast.warning(t('taskViews.UNDONE_PARTLY', { applied: outcome.applied, refused: outcome.refused + items.length - outcome.applied - outcome.refused }));
				return;
			}
			toast.success(t('taskViews.UNDONE', { count: outcome.applied }));
		},
		[run, t]
	);

	/**
	 * Applies the changes to the tasks and offers an undo for the ones that changed, even when a batch failed. The
	 * outcome names the tasks that did not change (refused, or in a batch that did not go through).
	 */
	const bulkUpdate = useCallback(
		async (taskIds: string[], changes: ITaskBulkChanges, label: string): Promise<(ITaskBulkUpdateOutcome & { unappliedIds: string[] }) | null> => {
			if (!taskIds.length) return null;
			// The batches are independent (each task once), so they go out together.
			const settled = await Promise.allSettled(batchesOf(taskIds).map((batch) => run({ taskIds: batch, changes })));
			const { outcomes, failed } = settledOutcomes(settled);
			if (failed > 0 && outcomes.length === 0) {
				toast.error(t('taskViews.BULK_FAILED'));
				throw new Error('BULK_UPDATE_FAILED');
			}
			const outcome = mergeOutcomes(outcomes);
			const undoItems = undoItemsOf(outcome);
			const notSent = failed * TASK_BULK_UPDATE_MAX;
			let message: string;
			if (failed > 0) message = t('taskViews.BULK_PARTLY_SENT', { applied: outcome.applied, failed: Math.min(notSent, taskIds.length - outcome.applied - outcome.refused), label });
			else if (outcome.refused > 0) message = t('taskViews.BULK_PARTLY_APPLIED', { applied: outcome.applied, refused: outcome.refused, label });
			else message = t('taskViews.BULK_APPLIED', { count: outcome.applied, label });
			const show = failed > 0 || outcome.refused > 0 ? toast.warning : toast;
			show(message, {
				id: 'task-bulk-update',
				action: undoItems.length ? { label: t('taskViews.UNDO'), onClick: () => void undo(undoItems) } : undefined
			});
			const appliedIds = new Set(outcome.results.filter((result) => result.ok).map((result) => result.taskId));
			return { ...outcome, unappliedIds: taskIds.filter((taskId) => !appliedIds.has(taskId)) };
		},
		[run, t, undo]
	);

	return { bulkUpdate, isBulkAvailable: isTaskViewsEnabled() };
}
