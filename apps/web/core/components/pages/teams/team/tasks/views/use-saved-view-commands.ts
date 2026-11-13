'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useIsomorphicLayoutEffect } from '@/core/hooks/common/use-isomorphic-layout-effect';
import { TaskViewConflictError, useTaskViewActions } from '@/core/hooks/task-views/use-task-view-actions';
import { definitionOf } from '@/core/lib/utils/task-views';
import { isTaskViewsEnabled } from '@/core/lib/utils/task-views-enabled';
import type { TaskOrderMove } from '@/core/lib/utils/task-view-order';
import {
	ETaskViewVisibility,
	type ITaskView,
	type ITaskViewDefinition
} from '@/core/types/interfaces/common/task-views';
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
	/** The dialog the page opens with: "New view" of the views index lands on the team's tasks with it open. */
	initialDialog?: SaveViewMode | null;
}

/**
 * The saved-view commands of the Team tasks page: save, save as, rename, share / make personal, delete, and a move in
 * the view's manual order, with their toasts and the conflict handling (a stale save offers Reload); the save
 * dialog's state; the `Mod+S` handler.
 */
export function useSavedViewCommands({
	savedView,
	isBuiltIn,
	definition,
	isDirty,
	applyDefinition,
	initialDialog = null
}: SavedViewCommandsInput) {
	const t = useTranslations();
	const router = useRouter();
	const actions = useTaskViewActions();
	const [saveDialog, setSaveDialog] = useState<SaveViewMode | null>(initialDialog);
	const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
	const [isBusy, setIsBusy] = useState(false);
	// The version the page's definition builds on: the saved view's while the page shows it unchanged, kept from the
	// first change on. A save states it, so a version saved meanwhile by someone else — the latest version a conflict
	// put in the cache, a refetch, a live update — meets the save as a conflict again instead of being overwritten by
	// the definition that was written against the older one. Reload (the page shows the latest) moves it on.
	const baseRef = useRef<{ id: string; version: ITaskView['version'] } | null>(null);
	useIsomorphicLayoutEffect(() => {
		if (!savedView) return;
		if (!isDirty || baseRef.current?.id !== savedView.id)
			baseRef.current = { id: savedView.id, version: savedView.version };
	});
	/**
	 * This tab's own write landed: the change builds on the version it wrote when the write stated the change's base
	 * (a save, or a rename or share made on the same version), never on a version someone else saved meanwhile.
	 */
	const advanceBase = useCallback((stated: ITaskView['version'], saved: ITaskView) => {
		const base = baseRef.current;
		if (base?.id === saved.id && base.version === stated)
			baseRef.current = { id: saved.id, version: saved.version };
	}, []);

	const reportSaveError = useCallback(
		(error: unknown) => {
			if (error instanceof TaskViewConflictError) {
				const latest = error.latest;
				toast.error(t('taskViews.CONFLICT'), {
					action: latest
						? { label: t('taskViews.RELOAD'), onClick: () => applyDefinition(definitionOf(latest)) }
						: undefined
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
			const base = baseRef.current;
			const stated = base?.id === savedView.id ? base.version : savedView.version;
			const saved = await actions.saveDefinition({ ...savedView, version: stated }, definition);
			// Edits made while the save ran build on what it saved (the page stays changed, so the effect keeps the base).
			advanceBase(stated, saved);
			toast.success(t('taskViews.SAVED_TOAST'));
		} catch (error) {
			reportSaveError(error);
		} finally {
			setIsBusy(false);
		}
	}, [actions, advanceBase, definition, isBusy, isDirty, reportSaveError, savedView, t]);

	/** Creates the view; answers whether it worked (the dialog stays open otherwise). */
	const create = useCallback(
		async (name: string, visibility: ETaskViewVisibility): Promise<boolean> => {
			try {
				// Save as keeps the manual order of the view it is made from.
				const created = await actions.createView(name, visibility, definition, savedView?.manualOrder);
				toast.success(t('taskViews.CREATED_TOAST', { name: created.name }));
				router.push(`/views/${created.id}`);
				return true;
			} catch {
				toast.error(t('taskViews.CREATE_FAILED'));
				return false;
			}
		},
		[actions, definition, router, savedView?.manualOrder, t]
	);

	/**
	 * Moves a task in the open view's manual order. The move is saved at once (it is not part of the changes Save
	 * keeps), and a change in progress then builds on the version it wrote, as after a rename. A refusal says why;
	 * the list shows the order the platform holds.
	 */
	const moveTask = useCallback(
		async (move: TaskOrderMove, shownIds: readonly string[]) => {
			if (!savedView) return;
			try {
				const moved = await actions.moveTask(savedView, move, shownIds);
				if (moved) advanceBase(moved.statedVersion, moved.view);
			} catch (error) {
				toast.error(
					error instanceof TaskViewConflictError ? t('taskViews.ORDER_CONFLICT') : t('taskViews.ORDER_FAILED')
				);
			}
		},
		[actions, advanceBase, savedView, t]
	);

	/** Renames the open view; answers whether it worked. */
	const rename = useCallback(
		async (name: string): Promise<boolean> => {
			if (!savedView) return false;
			try {
				advanceBase(savedView.version, await actions.updateView(savedView, { name }));
				toast.success(t('taskViews.SAVED_TOAST'));
				return true;
			} catch (error) {
				reportSaveError(error);
				return false;
			}
		},
		[actions, advanceBase, reportSaveError, savedView, t]
	);

	const toggleVisibility = useCallback(async () => {
		if (!savedView || isBusy) return;
		const visibility =
			savedView.visibility === ETaskViewVisibility.PERSONAL
				? ETaskViewVisibility.SHARED
				: ETaskViewVisibility.PERSONAL;
		setIsBusy(true);
		try {
			advanceBase(savedView.version, await actions.updateView(savedView, { visibility }));
			toast.success(t('taskViews.SAVED_TOAST'));
		} catch (error) {
			reportSaveError(error);
		} finally {
			setIsBusy(false);
		}
	}, [actions, advanceBase, isBusy, reportSaveError, savedView, t]);

	/** Deletes the open view once its deletion was confirmed in the page's dialog. */
	const confirmRemove = useCallback(async () => {
		if (!savedView || isBusy) return;
		setIsDeleteConfirmOpen(false);
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
			remove: () => setIsDeleteConfirmOpen(true)
		}),
		[save, toggleVisibility]
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
		(name: string, visibility: ETaskViewVisibility): Promise<boolean> =>
			saveDialog === 'rename' ? rename(name) : create(name, visibility),
		[create, rename, saveDialog]
	);

	return {
		saveDialog,
		setSaveDialog,
		isBusy,
		toolbarCommands,
		listShortcuts,
		moveTask,
		submitDialog,
		isDeleteConfirmOpen,
		closeDeleteConfirm: () => setIsDeleteConfirmOpen(false),
		confirmRemove: () => void confirmRemove()
	};
}
