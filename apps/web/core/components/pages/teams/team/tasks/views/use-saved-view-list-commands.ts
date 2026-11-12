'use client';

import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { TaskViewConflictError, useTaskViewActions } from '@/core/hooks/task-views/use-task-view-actions';
import { ETaskViewVisibility, type ITaskView } from '@/core/types/interfaces/common/task-views';

/**
 * The commands of a saved view from the views index: rename, share with the team or make personal, delete. A view
 * someone saved meanwhile is a conflict: the list shows their version (the action settles the cache) and says so.
 */
export function useSavedViewListCommands() {
	const t = useTranslations();
	const actions = useTaskViewActions();
	const [renaming, setRenaming] = useState<ITaskView | null>(null);
	const [deleting, setDeleting] = useState<ITaskView | null>(null);
	const [busyId, setBusyId] = useState<string | null>(null);

	const reportUpdateError = useCallback(
		(error: unknown) => {
			toast.error(
				error instanceof TaskViewConflictError ? t('taskViews.CONFLICT_IN_LIST') : t('taskViews.SAVE_FAILED')
			);
		},
		[t]
	);

	/**
	 * Renames the view being renamed; answers whether it worked. A failed save keeps the dialog open to try again, but
	 * a conflict closes it: the view in hand is outdated, and a new Rename starts from the version the list now shows.
	 */
	const rename = useCallback(
		async (name: string): Promise<boolean> => {
			if (!renaming) return false;
			setBusyId(renaming.id);
			try {
				await actions.updateView(renaming, { name });
				toast.success(t('taskViews.SAVED_TOAST'));
				return true;
			} catch (error) {
				reportUpdateError(error);
				if (error instanceof TaskViewConflictError) setRenaming(null);
				return false;
			} finally {
				setBusyId(null);
			}
		},
		[actions, renaming, reportUpdateError, t]
	);

	const toggleVisibility = useCallback(
		async (view: ITaskView) => {
			const visibility =
				view.visibility === ETaskViewVisibility.PERSONAL
					? ETaskViewVisibility.SHARED
					: ETaskViewVisibility.PERSONAL;
			setBusyId(view.id);
			try {
				await actions.updateView(view, { visibility });
				toast.success(t('taskViews.SAVED_TOAST'));
			} catch (error) {
				reportUpdateError(error);
			} finally {
				setBusyId(null);
			}
		},
		[actions, reportUpdateError, t]
	);

	/** Deletes the view whose deletion was confirmed. */
	const confirmDelete = useCallback(async () => {
		const view = deleting;
		if (!view) return;
		setBusyId(view.id);
		try {
			await actions.deleteView(view);
			toast.success(t('taskViews.DELETED_TOAST', { name: view.name }));
		} catch {
			toast.error(t('taskViews.DELETE_FAILED'));
		} finally {
			setBusyId(null);
			setDeleting(null);
		}
	}, [actions, deleting, t]);

	return {
		renaming,
		startRename: setRenaming,
		stopRename: () => setRenaming(null),
		rename,
		toggleVisibility,
		deleting,
		startDelete: setDeleting,
		stopDelete: () => setDeleting(null),
		confirmDelete,
		busyId
	};
}
