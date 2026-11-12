'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAtomValue, useSetAtom } from 'jotai';
import { PageLayout } from '@/core/components/layouts/default-layout';
import { Breadcrumb } from '@/core/components/duplicated-components/breadcrumb';
import { Modal } from '@/core/components/common/modal';
import { ModalSkeleton } from '@/core/components/common/skeleton/modal-skeleton';
import { LazyCreateTaskModal } from '@/core/components/optimized-components/tasks';
import { CreateDailyPlanFormModal } from '@/core/components/features/daily-plan/create-daily-plan-form-modal';
import { Task } from '@/core/components/icons';
import { useTeamTasksView, type TeamTasksViewState } from '@/core/hooks/tasks/use-team-tasks-view';
import { useTeamTasksLoadState } from '@/core/hooks/tasks/use-team-tasks-load-state';
import { useTeamTaskUpdates } from '@/core/hooks/tasks/use-team-task-updates';
import { useTaskDrawer } from '@/core/hooks/tasks/use-task-drawer';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { useShortcutHandlers } from '@/core/hooks/keyboard/use-shortcuts';
import { activeTeamState, isTrackingEnabledState } from '@/core/stores';
import { viewTasksState } from '@/core/stores/tasks/task-views';
import { DEFAULT_TASK_VIEW_DEFINITION, definitionOf, isSameDefinition } from '@/core/lib/utils/task-views';
import { isTaskViewsEnabled } from '@/core/lib/utils/task-views-enabled';
import { groupTaskIdsOf, stepMoveOf, type TaskOrderMove, type TaskOrderStep } from '@/core/lib/utils/task-view-order';
import { EDailyPlanMode } from '@/core/types/generics/enums/daily-plan';
import {
	ETaskViewVisibility,
	type ETaskBuiltInView,
	type ITaskView,
	type ITaskViewDefinition
} from '@/core/types/interfaces/common/task-views';
import type { TTask } from '@/core/types/schemas/task/task.schema';
import { teamTasksGridOf } from './team-tasks-grid';
import { TeamTasksToolbar } from './team-tasks-toolbar';
import { TeamTasksList, cellAnchorOf, type TeamTasksListCommands } from './team-tasks-list';
import { TeamTaskPicker, type TeamTaskPickerTarget } from './team-task-picker';
import {
	TeamTaskMenu,
	type TeamTaskMenuAnchor,
	type TeamTaskMenuMoves,
	type TeamTaskMenuTarget
} from './team-task-menu';
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
import { DeleteViewDialog } from '../views/delete-view-dialog';
import { SaveViewDialog } from '../views/save-view-dialog';
import { useNewViewRequest } from '../views/use-new-view-request';
import { TaskViewToolbarActions } from '../views/task-view-toolbar-actions';
import { useSavedViewCommands } from '../views/use-saved-view-commands';
import { builtInViewLabelKey } from '@/core/lib/utils/task-views-index';

interface PendingEdit {
	kind: TeamTaskPickerKind;
	taskId: string;
}

/** `undefined` keeps the create dialog closed; a status name (or null for the default one) opens it. */
type CreateRequest = string | null | undefined;

/** What the page is opened on besides the team's tasks: a saved view, or a built-in one the platform computes. */
type TaskViewContext =
	| { kind: 'saved'; view: ITaskView }
	| {
			kind: 'builtIn';
			key: ETaskBuiltInView;
			tasks: TTask[];
			total: number;
			isLoading: boolean;
			isError: boolean;
			refetch: () => void;
	  };

/** What the body of the page shows, decided once per render. */
type BodyState = 'loading' | 'error' | 'viewEmpty' | 'emptyTeam' | 'noMatch' | 'scopeEmpty' | 'list';

const EMPTY_TASKS: TTask[] = [];
const EMPTY_ORDER: string[] = [];

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

/** The body state from the loads, the errors and what the view holds. */
function bodyStateOf(
	view: TeamTasksViewState,
	viewContext: TaskViewContext | undefined,
	isLoading: boolean
): BodyState {
	const isBuiltIn = viewContext?.kind === 'builtIn';
	const builtInError = isBuiltIn && viewContext.isError;
	const statusesError = view.isStatusesError && view.statuses.length === 0;
	if (isLoading) {
		return 'loading';
	}
	if (statusesError || builtInError) {
		return 'error';
	}
	if (view.tasks.length === 0) {
		return isBuiltIn ? 'viewEmpty' : 'emptyTeam';
	}
	if (view.rows.length > 0) {
		return 'list';
	}
	const nothingMatches = view.isNarrowed && view.scopeCounts.all === 0;
	return nothingMatches ? 'noMatch' : 'scopeEmpty';
}

/** Where a view lives: its id, or a built-in view's key. */
function viewPathOf(viewContext: TaskViewContext | undefined): string | null {
	if (!viewContext) {
		return null;
	}
	return `/views/${viewContext.kind === 'saved' ? viewContext.view.id : viewContext.key}`;
}

/** What the page's narrowing starts over on: the view it is opened on, or nothing on the team's tasks. */
function resetKeyOf(viewContext: TaskViewContext | undefined): string | undefined {
	if (!viewContext) {
		return undefined;
	}
	return viewContext.kind === 'saved' ? `view:${viewContext.view.id}` : `built-in:${viewContext.key}`;
}

function useTeamTasksBreadcrumb(viewTitle: string | null, viewPath: string | null) {
	const t = useTranslations();
	const params = useParams<{ locale: string }>();
	const activeTeam = useAtomValue(activeTeamState);
	const locale = params?.locale;
	return useMemo(() => {
		// A view lives under the views, not under the active team's tasks (a built-in view lists the person's tasks)
		if (viewTitle !== null && viewPath !== null) {
			return [
				{ title: t('taskViews.TITLE'), href: `/${locale}/views` },
				{ title: viewTitle, href: `/${locale}${viewPath}` }
			];
		}
		return [
			{ title: JSON.parse(t('pages.home.BREADCRUMB')), href: '/' },
			{ title: activeTeam?.name || '', href: '/' },
			{ title: t('sidebar.TEAMTASKS'), href: `/${locale}/team/tasks` }
		];
	}, [activeTeam?.name, locale, t, viewPath, viewTitle]);
}

/** The title the page shows for a saved or built-in view, or null on the team's tasks. */
function useViewTitle(viewContext: TaskViewContext | undefined): string | null {
	const t = useTranslations();
	if (!viewContext) {
		return null;
	}
	if (viewContext.kind === 'saved') {
		return viewContext.view.name;
	}
	return t(builtInViewLabelKey(viewContext.key));
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
	const initial = useMemo(() => initialDefinitionOf(viewContext), [viewContext]);
	const builtInTasks = viewContext?.kind === 'builtIn' ? viewContext.tasks : undefined;
	const resetKey = resetKeyOf(viewContext);
	const savedView = viewContext?.kind === 'saved' ? viewContext.view : null;
	// A saved view offers its manual order (empty until a task is first moved).
	const manualOrder = savedView ? (savedView.manualOrder ?? EMPTY_ORDER) : undefined;
	const view = useTeamTasksView({ initial, resetKey, tasks: builtInTasks, manualOrder });
	// The pickers and the row menu read the tasks they edit from the team's list; a built-in view's tasks are
	// shared with them here, so an edit on one of them reaches the platform.
	const setViewTasks = useSetAtom(viewTasksState);
	useEffect(() => {
		setViewTasks(builtInTasks ?? EMPTY_TASKS);
		return () => setViewTasks(EMPTY_TASKS);
	}, [builtInTasks, setViewTasks]);
	const { isFirstLoad, isLoadingMorePages } = useTeamTasksLoadState();
	const { archiveTasks, canArchive } = useTeamTaskUpdates();
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

	const isBuiltIn = viewContext?.kind === 'builtIn';
	const viewTitle = useViewTitle(viewContext);
	const isDirty = savedView !== null && !isSameDefinition(view.definition, definitionOf(savedView));
	const showsViewActions = isTaskViewsEnabled() && !isBuiltIn;
	const breadcrumbPaths = useTeamTasksBreadcrumb(viewTitle, viewPathOf(viewContext));
	// "New view" of the views index lands here with the dialog that names the view open
	const opensNewView = useNewViewRequest(Boolean(viewContext));
	const savedViewCommands = useSavedViewCommands({
		savedView,
		isBuiltIn,
		definition: view.definition,
		isDirty,
		applyDefinition: view.applyDefinition,
		initialDialog: opensNewView ? 'create' : null
	});
	useShortcutHandlers(savedViewCommands.listShortcuts, ['list']);

	const grid = useMemo(() => teamTasksGridOf(view.settings), [view.settings]);
	const firstStatus = view.statuses[0];
	const employeeId = user?.employee?.id ?? user?.employeeId ?? '';
	const trackedCount = trackedTaskCountOf(activeTeam?.members, view.taskById);
	const { orderedIds, clearSelection, setManySelected, canReorder, shownOrder, rows } = view;
	const { moveTask } = savedViewCommands;
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
			openMenu: (taskId: string, anchor: TeamTaskMenuAnchor, groupKey?: string | null) => {
				setMenuTarget({ taskId, anchor, groupKey });
				setIsMenuOpen(true);
			},
			createTaskInGroup: (statusName: string | null) => setCreateRequest(statusName),
			moveTask: canReorder ? (move: TaskOrderMove) => void moveTask(move, shownOrder) : undefined
		}),
		[canReorder, moveTask, openPicker, openTaskDrawer, orderedIds, shownOrder]
	);

	// The row menu moves the task inside its group, in a manual order: the way to order on a phone, or by keyboard.
	const menuTaskId = menuTarget?.taskId ?? null;
	const menuGroupKey = menuTarget?.groupKey ?? null;
	const menuMoves = useMemo<TeamTaskMenuMoves | null>(() => {
		if (!canReorder || !menuTaskId) {
			return null;
		}
		const groupIds = groupTaskIdsOf(rows, menuTaskId, menuGroupKey);
		const index = groupIds.indexOf(menuTaskId);
		if (index < 0 || groupIds.length < 2) {
			return null;
		}
		return {
			canMoveUp: index > 0,
			canMoveDown: index < groupIds.length - 1,
			onMove: (step: TaskOrderStep) => {
				const move = stepMoveOf(groupIds, menuTaskId, step);
				if (move) void moveTask(move, shownOrder);
			}
		};
	}, [canReorder, menuGroupKey, menuTaskId, moveTask, rows, shownOrder]);

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
		const taskIds = [...view.selectedIds];
		clearSelection();
		// The tasks the platform did not archive come back into the selection: a retry needs no second pick.
		void archiveTasks(taskIds).then((left) => {
			if (left.length) setManySelected(left, true);
		});
	}, [archiveTasks, clearSelection, setManySelected, view.selectedIds]);

	// A built-in view loads its tasks up to the service's cap: the toolbar says when the platform holds more.
	const truncationNote =
		viewContext?.kind === 'builtIn' && viewContext.total > viewContext.tasks.length
			? t('taskViews.SHOWING_OF', { shown: viewContext.tasks.length, total: viewContext.total })
			: undefined;

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

	const openCreate = () => setCreateRequest(firstStatus?.name ?? null);
	const closeCreate = () => setCreateRequest(undefined);
	const isCreateOpen = createRequest !== undefined;
	const createStatusName = createRequest ?? firstStatus?.name ?? '';
	const menuTask = menuTaskOf(menuTarget, view.taskById);

	const isTeamUnknown = !activeTeam;
	const isBuiltInLoading = viewContext?.kind === 'builtIn' && viewContext.isLoading;
	const isLoading = isTeamUnknown || (isBuiltIn ? isBuiltInLoading : isFirstLoad);
	const bodyState = bodyStateOf(view, viewContext, isLoading);
	const showsHiddenPill = bodyState === 'list' && view.isNarrowed && view.hiddenCount > 0;

	const retry = () => {
		if (viewContext?.kind === 'builtIn') viewContext.refetch();
		void view.refetchStatuses();
	};

	const bodies: Record<BodyState, () => React.ReactNode> = {
		loading: () => <TeamTasksListSkeleton />,
		error: () => <TeamTasksError onRetry={retry} />,
		viewEmpty: () => <TeamTasksViewEmpty viewKey={viewContext?.kind === 'builtIn' ? viewContext.key : undefined} />,
		emptyTeam: () => <TeamTasksEmptyTeam onCreate={openCreate} />,
		noMatch: () => <TeamTasksNoMatch onClear={view.clearNarrowing} />,
		scopeEmpty: () => <TeamTasksScopeEmpty scope={view.scope} onShowAll={() => view.setScope('all')} />,
		list: () => <TeamTasksList view={view} grid={grid} commands={commands} scrollRef={scrollRef} />
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
							note={truncationNote}
							trackedCount={trackedCount}
							isLoadingMore={isLoadingMorePages}
							onCreate={openCreate}
							viewActions={
								showsViewActions ? (
									<TaskViewToolbarActions
										view={savedView}
										isDirty={isDirty}
										isBusy={savedViewCommands.isBusy}
										commands={savedViewCommands.toolbarCommands}
									/>
								) : null
							}
						/>
					)
				}
			>
				<div className="absolute inset-0">
					{bodies[bodyState]()}
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
				moves={menuMoves}
			/>
			<SaveViewDialog
				open={savedViewCommands.saveDialog !== null}
				mode={savedViewCommands.saveDialog ?? 'create'}
				initialName={savedViewCommands.saveDialog === 'rename' && savedView ? savedView.name : ''}
				initialVisibility={savedView?.visibility ?? ETaskViewVisibility.PERSONAL}
				onSubmit={savedViewCommands.submitDialog}
				onClose={() => savedViewCommands.setSaveDialog(null)}
			/>
			<DeleteViewDialog
				name={savedViewCommands.isDeleteConfirmOpen && savedView ? savedView.name : null}
				isBusy={savedViewCommands.isBusy}
				onConfirm={savedViewCommands.confirmRemove}
				onClose={savedViewCommands.closeDeleteConfirm}
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
