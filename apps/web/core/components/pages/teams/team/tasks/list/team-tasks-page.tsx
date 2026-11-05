'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAtomValue } from 'jotai';
import { PageLayout } from '@/core/components/layouts/default-layout';
import { Breadcrumb } from '@/core/components/duplicated-components/breadcrumb';
import { Modal } from '@/core/components/common/modal';
import { ModalSkeleton } from '@/core/components/common/skeleton/modal-skeleton';
import { LazyCreateTaskModal } from '@/core/components/optimized-components/tasks';
import { CreateDailyPlanFormModal } from '@/core/components/features/daily-plan/create-daily-plan-form-modal';
import { Task } from '@/core/components/icons';
import { useTeamTasksView } from '@/core/hooks/tasks/use-team-tasks-view';
import { useTeamTasksLoadState } from '@/core/hooks/tasks/use-team-tasks-load-state';
import { useTaskDrawer } from '@/core/hooks/tasks/use-task-drawer';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { activeTeamState, isTrackingEnabledState } from '@/core/stores';
import { EDailyPlanMode } from '@/core/types/generics/enums/daily-plan';
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
	TeamTasksSelectionBar
} from './team-tasks-states';
import { TeamTasksListSkeleton, TeamTasksToolbarSkeleton } from '../team-tasks-page-skeleton';

interface PendingEdit {
	kind: TeamTaskPickerKind;
	taskId: string;
}

/** `undefined` keeps the create dialog closed; a status name (or null for the default one) opens it. */
type CreateRequest = string | null | undefined;

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

function useTeamTasksBreadcrumb() {
	const t = useTranslations();
	const params = useParams<{ locale: string }>();
	const activeTeam = useAtomValue(activeTeamState);
	const locale = params?.locale;
	return useMemo(
		() => [
			{ title: JSON.parse(t('pages.home.BREADCRUMB')), href: '/' },
			{ title: activeTeam?.name || '', href: '/' },
			{ title: t('sidebar.TEAMTASKS'), href: `/${locale}/team/tasks` }
		],
		[activeTeam?.name, locale, t]
	);
}

/**
 * The Team tasks page, rebuilt from the whole reference library: a fixed page whose list scrolls alone, grouped
 * and ordered by a saved view, every property editable in place through one shared picker, a selection that acts
 * on many tasks at once, and the keyboard throughout. The decisions are in `docs/team-tasks-refs/TEAM-TASKS-DESIGN.md`.
 */
export function TeamTasksPage() {
	const t = useTranslations();
	const view = useTeamTasksView();
	const { isFirstLoad, isLoadingMorePages } = useTeamTasksLoadState();
	const activeTeam = useAtomValue(activeTeamState);
	const isTrackingEnabled = useAtomValue(isTrackingEnabledState);
	const { data: user } = useUserQuery();
	const { openTaskDrawer } = useTaskDrawer();
	const breadcrumbPaths = useTeamTasksBreadcrumb();
	const scrollRef = useRef<HTMLDivElement>(null);

	const [pickerTarget, setPickerTarget] = useState<TeamTaskPickerTarget | null>(null);
	const [isPickerOpen, setIsPickerOpen] = useState(false);
	const [menuTarget, setMenuTarget] = useState<TeamTaskMenuTarget | null>(null);
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const pendingEditRef = useRef<PendingEdit | null>(null);
	const [createRequest, setCreateRequest] = useState<CreateRequest>(undefined);
	const [planTaskId, setPlanTaskId] = useState<string | null>(null);

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
	const isLoading = isTeamUnknown || isFirstLoad;
	const hasTasks = view.tasks.length > 0;
	const hasRows = view.rows.length > 0;
	const hasStatuses = view.statuses.length > 0;
	const showsError = view.isStatusesError && !hasStatuses;
	const hasNoMatchInAnyScope = view.scopeCounts.all === 0;
	const nothingMatches = view.isNarrowed && hasNoMatchInAnyScope;
	const hidesTasks = view.isNarrowed && view.hiddenCount > 0;
	const showsHiddenPill = hidesTasks && hasRows;

	const renderBody = () => {
		if (isLoading) {
			return <TeamTasksListSkeleton />;
		}
		if (showsError) {
			return <TeamTasksError onRetry={() => view.refetchStatuses()} />;
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
				title={t('sidebar.TEAMTASKS')}
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
							trackedCount={trackedCount}
							isLoadingMore={isLoadingMorePages}
							onCreate={openCreate}
						/>
					)
				}
			>
				<div className="absolute inset-0">
					{renderBody()}
					{hasSelection && (
						<TeamTasksSelectionBar
							count={selectionCount}
							onEdit={handleSelectionEdit}
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
