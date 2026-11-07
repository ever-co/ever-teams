'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAtomValue } from 'jotai';
import { toast } from 'sonner';
import { PageLayout } from '@/core/components/layouts/default-layout';
import { Breadcrumb } from '@/core/components/duplicated-components/breadcrumb';
import { Modal } from '@/core/components/common/modal';
import { ModalSkeleton } from '@/core/components/common/skeleton/modal-skeleton';
import { LazyCreateTaskModal } from '@/core/components/optimized-components/tasks';
import { CreateDailyPlanFormModal } from '@/core/components/features/daily-plan/create-daily-plan-form-modal';
import { Task } from '@/core/components/icons';
import { useTeamTasksView } from '@/core/hooks/tasks/use-team-tasks-view';
import { useTeamTasksLoadState } from '@/core/hooks/tasks/use-team-tasks-load-state';
import { useTeamTaskUpdates } from '@/core/hooks/tasks/use-team-task-updates';
import { useTaskDrawer } from '@/core/hooks/tasks/use-task-drawer';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { useShortcutHandlers } from '@/core/hooks/keyboard/use-shortcuts';
import { TaskViewConflictError, useTaskViewActions } from '@/core/hooks/task-views/use-task-view-actions';
import { activeTeamState, isTrackingEnabledState } from '@/core/stores';
import { DEFAULT_TASK_VIEW_DEFINITION, definitionOf, isSameDefinition } from '@/core/lib/utils/task-views';
import { isTaskViewsEnabled } from '@/core/lib/utils/task-views-enabled';
import { EDailyPlanMode } from '@/core/types/generics/enums/daily-plan';
import { ETaskViewVisibility, type ETaskBuiltInView, type ITaskView, type ITaskViewDefinition } from '@/core/types/interfaces/common/task-views';
import type { TTask } from '@/core/types/schemas/task/task.schema';
import { teamTasksGridOf } from './team-tasks-grid';
import { TeamTasksToolbar } from './team-tasks-toolbar';
import { TeamTasksList, cellAnchorOf, type TeamTasksListCommands } from './team-tasks-list';
import { TeamTaskPicker, type TeamTaskPickerTarget } from './team-task-picker';
import { TeamTaskMenu, type TeamTaskMenuAnchor, type TeamTaskMenuTarget } from './team-task-menu';
import { trackedTaskCountOf, type TeamTaskPickerKind } from './team-tasks-list-context';
import {
	TeamTasksEmptyTeam,
	TeamTasksError,
	TeamTasksHiddenPill,
	TeamTasksNoMatch,
	TeamTasksScopeEmpty,
	TeamTasksSelectionBar,
	TeamTasksViewEmpty
} from './team-tasks-states';
import { TeamTasksListSkeleton, TeamTasksToolbarSkeleton } from '../team-tasks-page-skeleton';
import { SaveViewDialog, type SaveViewMode } from '../views/save-view-dialog';
import { TaskViewToolbarActions, type TaskViewToolbarCommands } from '../views/task-view-toolbar-actions';
import { builtInViewLabelKey } from '../views/views-page';

interface PendingEdit {
	kind: TeamTaskPickerKind;
	taskId: string;
}

/** `undefined` keeps the create dialog closed; a status name (or null for the default one) opens it. */
type CreateRequest = string | null | undefined;

/** What the page is opened on besides the team's tasks: a saved view, or a built-in one the platform computes. */
export type TaskViewContext =
	| { kind: 'saved'; view: ITaskView }
	| { kind: 'builtIn'; key: ETaskBuiltInView; tasks: TTask[]; isLoading: boolean; isError: boolean; refetch: () => void };

function isTypingTarget(target: EventTarget | null) {
	if (!(target instanceof HTMLElement)) {
		return false;
	}
	const isField = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
	return isField || target.isContentEditable;
}

function menuTaskOf(target: TeamTaskMenuTarget | null, taskById: Map<string, TTask>) {
	if (!target) {
		return undefined;
	}
	return taskById.get(target.taskId);
}

/** The definition the page starts from: the saved view's, the plain default for a built-in one, none for the team's tasks. */
function initialDefinitionOf(viewContext: TaskViewContext | undefined): ITaskViewDefinition | undefined {
	if (!viewContext) {
		return undefined;
	}
	if (viewContext.kind === 'saved') {
		return definitionOf(viewContext.view);
	}
	// A built-in view is already narrowed by the platform: every task of it is shown, grouped by status.
	return { ...DEFAULT_TASK_VIEW_DEFINITION, scope: 'all' };
}

function useTeamTasksBreadcrumb(viewTitle: string | null) {
	const t = useTranslations();
	const params = useParams<{ locale: string }>();
	const activeTeam = useAtomValue(activeTeamState);
	const locale = params?.locale;
	return useMemo(() => {
		const paths = [
			{ title: JSON.parse(t('pages.home.BREADCRUMB')), href: '/' },
			{ title: activeTeam?.name || '', href: '/' },
			{ title: t('sidebar.TEAMTASKS'), href: `/${locale}/team/tasks` }
		];
		if (viewTitle !== null) {
			paths.push({ title: t('taskViews.TITLE'), href: `/${locale}/views` }, { title: viewTitle, href: '#' });
		}
		return paths;
	}, [activeTeam?.name, locale, t, viewTitle]);
}

/**
 * The Team tasks page, rebuilt from the whole reference library: a fixed page whose list scrolls alone, grouped
 * and ordered by a saved view, every property editable in place through one shared picker, a selection that acts
 * on many tasks at once, and the keyboard throughout. The decisions are in `docs/team-tasks-refs/TEAM-TASKS-DESIGN.md`.
 *
 * Opened on a saved view (`/views/[viewId]`) the page starts from the view's definition and keeps the changes in
 * memory until Save; opened on a built-in view it lists the tasks the platform computed. Both only with the
 * saved-views feature on.
 */
export function TeamTasksPage({ viewContext }: Readonly<{ viewContext?: TaskViewContext }> = {}) {
	const t = useTranslations();
	const router = useRouter();
	const initial = useMemo(() => initialDefinitionOf(viewContext), [viewContext]);
	const builtInTasks = viewContext?.kind === 'builtIn' ? viewContext.tasks : undefined;
	const view = useTeamTasksView({ initial, tasks: builtInTasks });
	const { isFirstLoad, isLoadingMorePages } = useTeamTasksLoadState();
	const { archiveTasks, canArchive } = useTeamTaskUpdates();
	const viewActions = useTaskViewActions();
	const activeTeam = useAtomValue(activeTeamState);
	const isTrackingEnabled = useAtomValue(isTrackingEnabledState);
	const { data: user } = useUserQuery();
	const { openTaskDrawer } = useTaskDrawer();
	const scrollRef = useRef<HTMLDivElement>(null);

	const [pickerTarget, setPickerTarget] = useState<TeamTaskPickerTarget | null>(null);
	const [isPickerOpen, setIsPickerOpen] = useState(false);
	const [menuTarget, setMenuTarget] = useState<TeamTaskMenuTarget | null>(null);
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const pendingEditRef = useRef<PendingEdit | null>(null);
	const [createRequest, setCreateRequest] = useState<CreateRequest>(undefined);
	const [planTaskId, setPlanTaskId] = useState<string | null>(null);
	const [saveDialog, setSaveDialog] = useState<SaveViewMode | null>(null);
	const [isViewBusy, setIsViewBusy] = useState(false);

	const savedView = viewContext?.kind === 'saved' ? viewContext.view : null;
	const builtInKey = viewContext?.kind === 'builtIn' ? viewContext.key : null;
	const viewTitle = savedView ? savedView.name : builtInKey ? t(builtInViewLabelKey(builtInKey)) : null;
	const isDirty = savedView ? !isSameDefinition(view.definition, definitionOf(savedView)) : false;
	const showsViewActions = isTaskViewsEnabled() && builtInKey === null;
	const breadcrumbPaths = useTeamTasksBreadcrumb(viewTitle);

	const grid = useMemo(() => teamTasksGridOf(view.settings), [view.settings]);
	const firstStatus = view.statuses[0];
	const employeeId = user?.employee?.id ?? user?.employeeId ?? '';
	const trackedCount = trackedTaskCountOf(activeTeam?.members, view.taskById);
	const { orderedIds, clearSelection } = view;
	const selectionCount = view.selectedIds.size;
	const hasSelection = selectionCount > 0;
	const hasLayerOpen = isPickerOpen || isMenuOpen;

	const openPicker = useCallback(
		(kind: TeamTaskPickerKind, taskIds: string[], anchor: Element, shortcut?: string) => {
			setPickerTarget({ kind, taskIds, anchor, shortcut });
			setIsPickerOpen(true);
		},
		[]
	);

	const commands = useMemo<TeamTasksListCommands>(
		() => ({
			openTask: (taskId: string) => openTaskDrawer(taskId, orderedIds),
			openPicker,
			openMenu: (taskId: string, anchor: TeamTaskMenuAnchor) => {
				setMenuTarget({ taskId, anchor });
				setIsMenuOpen(true);
			},
			createTaskInGroup: (statusName: string | null) => setCreateRequest(statusName)
		}),
		[openPicker, openTaskDrawer, orderedIds]
	);

	// The edit asked from the action menu opens once the menu has closed, so the menu's focus return does not
	// take the focus away from the picker's search field.
	const handleMenuClosed = useCallback(() => {
		setMenuTarget(null);
		const pendingEdit = pendingEditRef.current;
		pendingEditRef.current = null;
		if (!pendingEdit) {
			return;
		}
		const anchor = cellAnchorOf(scrollRef.current, pendingEdit.taskId, pendingEdit.kind);
		if (!anchor) {
			return;
		}
		openPicker(pendingEdit.kind, [pendingEdit.taskId], anchor);
	}, [openPicker]);

	const handleMenuEdit = useCallback((kind: TeamTaskPickerKind, taskId: string) => {
		pendingEditRef.current = { kind, taskId };
		setIsMenuOpen(false);
	}, []);

	const handleSelectionEdit = useCallback(
		(kind: TeamTaskPickerKind, anchor: Element) => openPicker(kind, [...view.selectedIds], anchor),
		[openPicker, view.selectedIds]
	);

	const handleSelectionArchive = useCallback(() => {
		archiveTasks([...view.selectedIds]);
		clearSelection();
	}, [archiveTasks, clearSelection, view.selectedIds]);

	useEffect(() => {
		const isListening = hasSelection && !hasLayerOpen;
		if (!isListening) {
			return;
		}
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key !== 'Escape') {
				return;
			}
			if (isTypingTarget(event.target)) {
				return;
			}
			clearSelection();
		};
		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [clearSelection, hasLayerOpen, hasSelection]);

	// ---------------------------------------------------------------- saved views

	const saveView = useCallback(async () => {
		if (!savedView || !isDirty || isViewBusy) {
			return;
		}
		setIsViewBusy(true);
		try {
			await viewActions.saveDefinition(savedView, view.definition);
			toast.success(t('taskViews.SAVED_TOAST'));
		} catch (error) {
			if (error instanceof TaskViewConflictError) {
				const latest = error.latest;
				toast.error(t('taskViews.CONFLICT'), {
					action: latest ? { label: t('taskViews.RELOAD'), onClick: () => view.applyDefinition(definitionOf(latest)) } : undefined
				});
			} else {
				toast.error(t('taskViews.SAVE_FAILED'));
			}
		} finally {
			setIsViewBusy(false);
		}
	}, [isDirty, isViewBusy, savedView, t, view, viewActions]);

	const createView = useCallback(
		async (name: string, visibility: ETaskViewVisibility) => {
			try {
				const created = await viewActions.createView(name, visibility, view.definition);
				toast.success(t('taskViews.CREATED_TOAST', { name: created.name }));
				router.push(`/views/${created.id}`);
			} catch {
				toast.error(t('taskViews.CREATE_FAILED'));
			}
		},
		[router, t, view.definition, viewActions]
	);

	const renameView = useCallback(
		async (name: string) => {
			if (!savedView) {
				return;
			}
			try {
				await viewActions.updateView(savedView, { name });
				toast.success(t('taskViews.SAVED_TOAST'));
			} catch (error) {
				toast.error(error instanceof TaskViewConflictError ? t('taskViews.CONFLICT') : t('taskViews.SAVE_FAILED'));
			}
		},
		[savedView, t, viewActions]
	);

	const toggleVisibility = useCallback(async () => {
		if (!savedView || isViewBusy) {
			return;
		}
		const visibility = savedView.visibility === ETaskViewVisibility.PERSONAL ? ETaskViewVisibility.SHARED : ETaskViewVisibility.PERSONAL;
		setIsViewBusy(true);
		try {
			await viewActions.updateView(savedView, { visibility });
			toast.success(t('taskViews.SAVED_TOAST'));
		} catch (error) {
			toast.error(error instanceof TaskViewConflictError ? t('taskViews.CONFLICT') : t('taskViews.SAVE_FAILED'));
		} finally {
			setIsViewBusy(false);
		}
	}, [isViewBusy, savedView, t, viewActions]);

	const deleteView = useCallback(async () => {
		if (!savedView || isViewBusy) {
			return;
		}
		if (typeof window !== 'undefined' && !window.confirm(t('taskViews.DELETE_TEXT', { name: savedView.name }))) {
			return;
		}
		setIsViewBusy(true);
		try {
			await viewActions.deleteView(savedView);
			toast.success(t('taskViews.DELETED_TOAST', { name: savedView.name }));
			router.push('/views');
		} catch {
			toast.error(t('taskViews.DELETE_FAILED'));
		} finally {
			setIsViewBusy(false);
		}
	}, [isViewBusy, router, savedView, t, viewActions]);

	const toolbarCommands = useMemo<TaskViewToolbarCommands>(
		() => ({
			save: () => void saveView(),
			saveAs: () => setSaveDialog('create'),
			rename: () => setSaveDialog('rename'),
			toggleVisibility: () => void toggleVisibility(),
			remove: () => void deleteView()
		}),
		[deleteView, saveView, toggleVisibility]
	);

	// Mod+S on the list: save the open view, or name a new one.
	const listShortcuts = useMemo(
		() => ({
			'list.saveView': () => {
				if (!isTaskViewsEnabled() || builtInKey !== null) return;
				if (savedView && isDirty) void saveView();
				else if (!savedView) setSaveDialog('create');
			}
		}),
		[builtInKey, isDirty, saveView, savedView]
	);
	useShortcutHandlers(listShortcuts, ['list']);

	const openCreate = () => setCreateRequest(firstStatus?.name ?? null);
	const closeCreate = () => setCreateRequest(undefined);
	const isCreateOpen = createRequest !== undefined;
	const createStatusName = createRequest ?? firstStatus?.name ?? '';
	const menuTask = menuTaskOf(menuTarget, view.taskById);

	const isTeamUnknown = !activeTeam;
	const isBuiltInLoading = viewContext?.kind === 'builtIn' && viewContext.isLoading;
	const isLoading = isTeamUnknown || (builtInKey ? isBuiltInLoading : isFirstLoad);
	const hasTasks = view.tasks.length > 0;
	const hasRows = view.rows.length > 0;
	const hasStatuses = view.statuses.length > 0;
	const showsError = (view.isStatusesError && !hasStatuses) || (viewContext?.kind === 'builtIn' && viewContext.isError);
	const hasNoMatchInAnyScope = view.scopeCounts.all === 0;
	const nothingMatches = view.isNarrowed && hasNoMatchInAnyScope;
	const hidesTasks = view.isNarrowed && view.hiddenCount > 0;
	const showsHiddenPill = hidesTasks && hasRows;

	const retry = () => {
		if (viewContext?.kind === 'builtIn') viewContext.refetch();
		void view.refetchStatuses();
	};

	const renderBody = () => {
		if (isLoading) {
			return <TeamTasksListSkeleton />;
		}
		if (showsError) {
			return <TeamTasksError onRetry={retry} />;
		}
		if (!hasTasks && builtInKey) {
			return <TeamTasksViewEmpty />;
		}
		if (!hasTasks) {
			return <TeamTasksEmptyTeam onCreate={openCreate} />;
		}
		if (!hasRows && nothingMatches) {
			return <TeamTasksNoMatch onClear={view.clearNarrowing} />;
		}
		if (!hasRows) {
			return <TeamTasksScopeEmpty scope={view.scope} onShowAll={() => view.setScope('all')} />;
		}
		return <TeamTasksList view={view} grid={grid} commands={commands} scrollRef={scrollRef} />;
	};

	return (
		<>
			<PageLayout
				title={viewTitle ?? t('sidebar.TEAMTASKS')}
				showTimer={isTrackingEnabled}
				className="min-h-0 flex-1 p-0"
				breadcrumb={
					<div className="flex min-w-0 items-center gap-2">
						<Task className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
						<Breadcrumb paths={breadcrumbPaths} className="min-w-0 text-sm" />
					</div>
				}
				mainHeaderSlot={
					isTeamUnknown ? (
						<TeamTasksToolbarSkeleton />
					) : (
						<TeamTasksToolbar
							view={view}
							title={viewTitle ?? t('sidebar.TEAMTASKS')}
							isDirty={isDirty}
							trackedCount={trackedCount}
							isLoadingMore={isLoadingMorePages}
							onCreate={openCreate}
							viewActions={
								showsViewActions ? (
									<TaskViewToolbarActions view={savedView} isDirty={isDirty} isBusy={isViewBusy} commands={toolbarCommands} />
								) : null
							}
						/>
					)
				}
			>
				<div className="absolute inset-0">
					{renderBody()}
					{hasSelection && (
						<TeamTasksSelectionBar
							count={selectionCount}
							canBulk={canArchive}
							onEdit={handleSelectionEdit}
							onArchive={handleSelectionArchive}
							onClear={clearSelection}
						/>
					)}
					{!hasSelection && showsHiddenPill && (
						<TeamTasksHiddenPill count={view.hiddenCount} onClear={view.clearNarrowing} />
					)}
				</div>
			</PageLayout>

			<TeamTaskPicker
				target={pickerTarget}
				isOpen={isPickerOpen}
				statuses={view.statuses}
				taskById={view.taskById}
				onOpenChange={setIsPickerOpen}
				onClosed={() => setPickerTarget(null)}
			/>
			<TeamTaskMenu
				target={menuTarget}
				isOpen={isMenuOpen}
				task={menuTask}
				fallbackStatusId={firstStatus?.id}
				onOpenChange={setIsMenuOpen}
				onClosed={handleMenuClosed}
				onOpenTask={commands.openTask}
				onEdit={handleMenuEdit}
				onPlanSomeDay={setPlanTaskId}
			/>
			<SaveViewDialog
				open={saveDialog !== null}
				mode={saveDialog ?? 'create'}
				initialName={saveDialog === 'rename' && savedView ? savedView.name : ''}
				initialVisibility={savedView?.visibility ?? ETaskViewVisibility.PERSONAL}
				onSubmit={(name, visibility) => (saveDialog === 'rename' ? renameView(name) : createView(name, visibility))}
				onClose={() => setSaveDialog(null)}
			/>
			{isCreateOpen && (
				<Suspense fallback={<ModalSkeleton size="lg" />}>
					<Modal isOpen={true} closeModal={closeCreate}>
						<LazyCreateTaskModal
							onClose={closeCreate}
							title={createStatusName}
							initEditMode={false}
							task={null}
							tasks={[]}
						/>
					</Modal>
				</Suspense>
			)}
			{planTaskId && (
				<CreateDailyPlanFormModal
					open={true}
					closeModal={() => setPlanTaskId(null)}
					taskId={planTaskId}
					employeeId={employeeId}
					planMode={EDailyPlanMode.CUSTOM}
					chooseMember={true}
				/>
			)}
		</>
	);
}
