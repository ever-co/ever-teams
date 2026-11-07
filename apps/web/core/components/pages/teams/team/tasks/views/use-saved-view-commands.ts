'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { TaskViewConflictError, useTaskViewActions } from '@/core/hooks/task-views/use-task-view-actions';
import { definitionOf } from '@/core/lib/utils/task-views';
import { isTaskViewsEnabled } from '@/core/lib/utils/task-views-enabled';
import { ETaskViewVisibility, type ITaskView, type ITaskViewDefinition } from '@/core/types/interfaces/common/task-views';
import type { SaveViewMode } from './save-view-dialog';
import type { TaskViewToolbarCommands } from './task-view-toolbar-actions';

interface SavedViewCommandsInput {
	/** The saved view the page is on, if any. */
	savedView: ITaskView | null;
	/** Whether the page is on a built-in view (nothing to save there). */
	isBuiltIn: boolean;
	/** What the page shows now. */
	definition: ITaskViewDefinition;
	/** Whether the page differs from the saved view. */
	isDirty: boolean;
	/** Puts a definition in place (the latest version after a conflict). */
	applyDefinition: (next: ITaskViewDefinition) => void;
}

/**
 * The saved-view commands of the Team tasks page: save, save as, rename, share / make personal, delete, with their
 * toasts and the conflict handling (a stale save offers Reload); the save dialog's state; the `Mod+S` handler.
 */
export function useSavedViewCommands({ savedView, isBuiltIn, definition, isDirty, applyDefinition }: SavedViewCommandsInput) {
	const t = useTranslations();
	const router = useRouter();
	const actions = useTaskViewActions();
	const [saveDialog, setSaveDialog] = useState<SaveViewMode | null>(null);
	const [isBusy, setIsBusy] = useState(false);

	const reportSaveError = useCallback(
		(error: unknown) => {
			if (error instanceof TaskViewConflictError) {
				const latest = error.latest;
				toast.error(t('taskViews.CONFLICT'), {
					action: latest ? { label: t('taskViews.RELOAD'), onClick: () => applyDefinition(definitionOf(latest)) } : undefined
				});
				return;
			}
			toast.error(t('taskViews.SAVE_FAILED'));
		},
		[applyDefinition, t]
	);

	const save = useCallback(async () => {
		if (!savedView || !isDirty || isBusy) return;
		setIsBusy(true);
		try {
			await actions.saveDefinition(savedView, definition);
			toast.success(t('taskViews.SAVED_TOAST'));
		} catch (error) {
			reportSaveError(error);
		} finally {
			setIsBusy(false);
		}
	}, [actions, definition, isBusy, isDirty, reportSaveError, savedView, t]);

	/** Creates the view; answers whether it worked (the dialog stays open otherwise). */
	const create = useCallback(
		async (name: string, visibility: ETaskViewVisibility): Promise<boolean> => {
			try {
				const created = await actions.createView(name, visibility, definition);
				toast.success(t('taskViews.CREATED_TOAST', { name: created.name }));
				router.push(`/views/${created.id}`);
				return true;
			} catch {
				toast.error(t('taskViews.CREATE_FAILED'));
				return false;
			}
		},
		[actions, definition, router, t]
	);

	/** Renames the open view; answers whether it worked. */
	const rename = useCallback(
		async (name: string): Promise<boolean> => {
			if (!savedView) return false;
			try {
				await actions.updateView(savedView, { name });
				toast.success(t('taskViews.SAVED_TOAST'));
				return true;
			} catch (error) {
				reportSaveError(error);
				return false;
			}
		},
		[actions, reportSaveError, savedView, t]
	);

	const toggleVisibility = useCallback(async () => {
		if (!savedView || isBusy) return;
		const visibility = savedView.visibility === ETaskViewVisibility.PERSONAL ? ETaskViewVisibility.SHARED : ETaskViewVisibility.PERSONAL;
		setIsBusy(true);
		try {
			await actions.updateView(savedView, { visibility });
			toast.success(t('taskViews.SAVED_TOAST'));
		} catch (error) {
			reportSaveError(error);
		} finally {
			setIsBusy(false);
		}
	}, [actions, isBusy, reportSaveError, savedView, t]);

	const remove = useCallback(async () => {
		if (!savedView || isBusy) return;
		if (typeof window !== 'undefined' && !window.confirm(t('taskViews.DELETE_TEXT', { name: savedView.name }))) return;
		setIsBusy(true);
		try {
			await actions.deleteView(savedView);
			toast.success(t('taskViews.DELETED_TOAST', { name: savedView.name }));
			router.push('/views');
		} catch {
			toast.error(t('taskViews.DELETE_FAILED'));
		} finally {
			setIsBusy(false);
		}
	}, [actions, isBusy, router, savedView, t]);

	const toolbarCommands = useMemo<TaskViewToolbarCommands>(
		() => ({
			save: () => void save(),
			saveAs: () => setSaveDialog('create'),
			rename: () => setSaveDialog('rename'),
			toggleVisibility: () => void toggleVisibility(),
			remove: () => void remove()
		}),
		[remove, save, toggleVisibility]
	);

	/** `Mod+S` on the list: save the open view when it changed, or name a new one. */
	const listShortcuts = useMemo(
		() => ({
			listSaveView: () => {
				if (!isTaskViewsEnabled() || isBuiltIn) return;
				if (savedView) {
					if (isDirty) void save();
					return;
				}
				setSaveDialog('create');
			}
		}),
		[isBuiltIn, isDirty, save, savedView]
	);

	/** What the save dialog submits: a rename, or a new view; `false` keeps the dialog open. */
	const submitDialog = useCallback(
		(name: string, visibility: ETaskViewVisibility): Promise<boolean> => (saveDialog === 'rename' ? rename(name) : create(name, visibility)),
		[create, rename, saveDialog]
	);

	return { saveDialog, setSaveDialog, isBusy, toolbarCommands, listShortcuts, submitDialog };
}
