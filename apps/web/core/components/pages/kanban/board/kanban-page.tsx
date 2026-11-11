'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAtomValue } from 'jotai';
import { PageLayout } from '@/core/components/layouts/default-layout';
import { Breadcrumb } from '@/core/components/duplicated-components/breadcrumb';
import { AnimatedEmptyState } from '@/core/components/common/empty-state';
import { Modal } from '@/core/components/common/modal';
import { ModalSkeleton } from '@/core/components/common/skeleton/modal-skeleton';
import { LazyCreateTaskModal, LazyEditStatusModal } from '@/core/components/optimized-components/tasks';
import { InviteFormModal } from '@/core/components/features/teams/invite-form-modal';
import { Kanban as KanbanIcon, X } from '@/core/components/icons';
import { useKanbanBoard, type KanbanBoardState } from '@/core/hooks/tasks/use-kanban-board';
import { useTeamDailyPlansOwner } from '@/core/hooks/bootstrap/use-feature-data';
import { useCanInviteToActiveTeam } from '@/core/hooks/invitations/use-can-invite-to-active-team';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { activeTeamState, isTrackingEnabledState } from '@/core/stores';
import { tasksByTeamState, teamTasksCompleteState } from '@/core/stores/teams/team-tasks';
import type { TTaskStatus } from '@/core/types/schemas';
import type { KanbanLane as KanbanLaneModel } from '@/core/lib/utils/kanban-board';
import type { TTask } from '@/core/types/schemas/task/task.schema';
import {
	KanbanBoardProvider,
	KanbanSelectionProvider,
	type KanbanBoardActions,
	type KanbanSelection
} from './kanban-board-context';
import { KanbanBoard } from './kanban-board';
import { KanbanBoardSkeleton } from './kanban-board-skeleton';
import { KanbanToolbar } from './kanban-toolbar';
import { useTaskDrawer } from '@/core/hooks/tasks/use-task-drawer';
import { useBoardSelection } from '@/core/hooks/tasks/use-board-selection';
import { useTeamTaskUpdates } from '@/core/hooks/tasks/use-team-task-updates';
import { useKeyboardPreferences } from '@/core/hooks/keyboard/use-keyboard-preferences';
import { isDialogOpen, isTypingTarget } from '@/core/lib/keyboard/shortcuts';
import { isTaskViewsEnabled } from '@/core/lib/utils/task-views-enabled';
import { TaskSelectionBar } from '@/core/components/tasks/task-selection-bar';
import { TeamTaskPicker, type TeamTaskPickerTarget } from '../../teams/team/tasks/list/team-task-picker';
import type { TeamTaskPickerKind } from '../../teams/team/tasks/list/team-tasks-list-context';

/** The ids of the lane holding the task, for the drawer's previous and next arrows. */
function laneTaskIdsOf(lanes: KanbanLaneModel[], taskId: string) {
	const lane = lanes.find((candidate) => candidate.tasks.some((task) => task.id === taskId));
	const tasks = lane?.tasks ?? [];
	return tasks.map((task) => task.id);
}

/** The edit status form still updates a column list of its own; the board reads statuses from their query. */
function keepStatusesFromQuery() {
	return undefined;
}

function useKanbanBreadcrumb(employee: string | null) {
	const t = useTranslations();
	const params = useParams<{ locale: string }>();
	const activeTeam = useAtomValue(activeTeamState);
	const locale = params?.locale;
	return useMemo(() => {
		const paths = [
			{ title: JSON.parse(t('pages.home.BREADCRUMB')), href: '/' },
			{ title: activeTeam?.name || '', href: '/' },
			{ title: t('common.KANBAN'), href: `/${locale}/kanban` }
		];
		if (employee) {
			paths.push({ title: employee, href: `/${locale}/kanban?employee=${encodeURIComponent(employee)}` });
		}
		return paths;
	}, [activeTeam?.name, employee, locale, t]);
}

function HiddenByFiltersBar({ count, onClear }: Readonly<{ count: number; onClear: () => void }>) {
	const t = useTranslations();
	return (
		<div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
			<div className="surface-raised pointer-events-auto flex h-9 items-center gap-3 rounded-full pr-1.5 pl-4 text-[13px] text-muted-foreground">
				<span>{t('pages.kanban.TASKS_HIDDEN_BY_FILTERS', { count })}</span>
				<button
					type="button"
					onClick={onClear}
					className="flex h-6 items-center gap-1 rounded-full px-2.5 font-medium text-foreground transition-colors hover:bg-foreground/5"
				>
					{t('common.CLEAR_FILTERS')}
					<X className="size-3.5" />
				</button>
			</div>
		</div>
	);
}

function KanbanBoardArea({
	board,
	actions,
	isTeamReady,
	selection
}: Readonly<{
	board: KanbanBoardState;
	actions: KanbanBoardActions;
	isTeamReady: boolean;
	selection: KanbanSelection | null;
}>) {
	const t = useTranslations();
	const teamTasks = useAtomValue(tasksByTeamState);
	const areTeamTasksComplete = useAtomValue(teamTasksCompleteState);
	const hasStatuses = board.statuses.length > 0;
	const hasNoTaskYet = teamTasks.length === 0;
	const isWaitingForFirstTasks = hasNoTaskYet && !areTeamTasksComplete;
	const isLoading = board.isLoading || !isTeamReady || isWaitingForFirstTasks;
	const hasSelection = (selection?.selectedIds.size ?? 0) > 0;
	const showsHiddenBar = board.isNarrowed && board.hiddenTaskCount > 0 && !hasSelection;

	if (isLoading) {
		return <KanbanBoardSkeleton />;
	}
	if (board.isError && !hasStatuses) {
		return (
			<div className="flex h-full items-center justify-center p-4">
				<AnimatedEmptyState
					title={t('pages.error.HEADING_TITLE')}
					message={t('pages.error.HEADING_DESCRIPTION')}
					actionLabel={t('pages.unauthorized.TRY_AGAIN')}
					onAction={() => board.refetchTaskStatuses()}
				/>
			</div>
		);
	}
	if (!hasStatuses) {
		return (
			<div className="flex h-full items-center justify-center p-4">
				<AnimatedEmptyState
					title={t('pages.kanban.NO_STATUSES_TITLE')}
					message={t('pages.kanban.NO_STATUSES_MESSAGE')}
					icon={<KanbanIcon />}
				/>
			</div>
		);
	}
	return (
		<KanbanBoardProvider statuses={board.statuses} actions={actions}>
			<KanbanSelectionProvider selection={selection}>
				<KanbanBoard lanes={board.lanes} onMoveTask={board.moveTask} onMoveLane={board.moveLane} />
			</KanbanSelectionProvider>
			{showsHiddenBar && <HiddenByFiltersBar count={board.hiddenTaskCount} onClear={board.clearFilters} />}
		</KanbanBoardProvider>
	);
}

/**
 * The Kanban page, rebuilt from scratch: the shell's top bar, then a two-row toolbar band, then the board filling
 * every pixel left in the panel. The page itself never scrolls; the board scrolls horizontally and each lane scrolls
 * its own cards.
 */
export function KanbanPage() {
	useTeamDailyPlansOwner();
	const t = useTranslations();
	const board = useKanbanBoard();
	const isTrackingEnabled = useAtomValue(isTrackingEnabledState);
	const activeTeam = useAtomValue(activeTeamState);
	const { data: user } = useUserQuery();
	const canInvite = useCanInviteToActiveTeam();
	const breadcrumbPaths = useKanbanBreadcrumb(board.employee);

	const [isInviteOpen, setIsInviteOpen] = useState(false);
	const [createInStatus, setCreateInStatus] = useState<TTaskStatus | null>(null);
	const [editedStatus, setEditedStatus] = useState<TTaskStatus | null>(null);
	const { openTaskDrawer } = useTaskDrawer();

	const actions = useMemo<KanbanBoardActions>(
		() => ({
			moveTask: board.moveTask,
			openTask: (task: TTask) => openTaskDrawer(task.id, laneTaskIdsOf(board.lanes, task.id)),
			createTaskIn: setCreateInStatus,
			editStatus: setEditedStatus,
			setLaneCollapsed: board.setLaneCollapsed
		}),
		[board.lanes, board.moveTask, board.setLaneCollapsed, openTaskDrawer]
	);

	const firstStatus = board.statuses[0] ?? null;

	// With the saved-views feature the cards can be selected and changed together (one request, one undo).
	const isSelectable = isTaskViewsEnabled();
	const { selectedIds, toggleSelected, clearSelection, restoreLater } = useBoardSelection(board.lanes);
	const { bindings } = useKeyboardPreferences();
	const { archiveTasks, canArchive } = useTeamTaskUpdates();
	const [pickerTarget, setPickerTarget] = useState<TeamTaskPickerTarget | null>(null);
	const [isPickerOpen, setIsPickerOpen] = useState(false);
	const openPicker = useCallback((kind: TeamTaskPickerKind, taskIds: string[], anchor: Element) => {
		setPickerTarget({ kind, taskIds, anchor });
		setIsPickerOpen(true);
	}, []);
	const selection = useMemo<KanbanSelection | null>(
		() => (isSelectable ? { selectedIds, toggleSelected, bindings, openPicker } : null),
		[bindings, isSelectable, openPicker, selectedIds, toggleSelected]
	);
	const taskById = useMemo(
		() => new Map(board.lanes.flatMap((lane) => lane.tasks.map((task) => [task.id, task] as const))),
		[board.lanes]
	);
	const selectionCount = selection ? selectedIds.size : 0;

	const editSelection = useCallback(
		(kind: TeamTaskPickerKind, anchor: Element) => openPicker(kind, [...selectedIds], anchor),
		[openPicker, selectedIds]
	);
	const archiveSelection = useCallback(() => {
		const taskIds = [...selectedIds];
		clearSelection();
		// The tasks the platform did not archive come back into the selection (a retry needs no second pick), unless
		// the person selected something else meanwhile.
		void archiveTasks(taskIds).then(restoreLater());
	}, [archiveTasks, clearSelection, restoreLater, selectedIds]);

	// Esc clears the selection, unless a picker, a menu or a field has the key.
	useEffect(() => {
		if (!selectionCount || isPickerOpen) {
			return;
		}
		const handleKeyDown = (event: KeyboardEvent) => {
			const isEscape = event.key === 'Escape';
			if (!isEscape || event.defaultPrevented || isTypingTarget(event.target) || isDialogOpen(document)) {
				return;
			}
			clearSelection();
		};
		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [clearSelection, isPickerOpen, selectionCount]);

	const isEmailVerified = Boolean(user?.isEmailVerified);
	const showsInvite = isInviteOpen && isEmailVerified;
	const pageTitle = t('pages.kanban.KANBAN_BOARD');

	return (
		<>
			<PageLayout
				title={pageTitle}
				showTimer={isTrackingEnabled}
				className="min-h-0 flex-1 p-0"
				breadcrumb={
					<div className="flex min-w-0 items-center gap-2">
						<KanbanIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
						<Breadcrumb paths={breadcrumbPaths} className="min-w-0 text-sm" />
					</div>
				}
				mainHeaderSlot={
					<KanbanToolbar
						board={board}
						canInvite={canInvite}
						onInvite={() => setIsInviteOpen(true)}
						onCreateTask={() => setCreateInStatus(firstStatus)}
					/>
				}
			>
				<div className="absolute inset-0">
					<KanbanBoardArea
						board={board}
						actions={actions}
						isTeamReady={Boolean(activeTeam)}
						selection={selection}
					/>
					{selectionCount > 0 && (
						<TaskSelectionBar
							count={selectionCount}
							canBulk={canArchive}
							onEdit={editSelection}
							onArchive={archiveSelection}
							onClear={clearSelection}
						/>
					)}
				</div>
			</PageLayout>

			{isSelectable && (
				<TeamTaskPicker
					target={pickerTarget}
					isOpen={isPickerOpen}
					statuses={board.statuses}
					taskById={taskById}
					onOpenChange={setIsPickerOpen}
					onClosed={() => setPickerTarget(null)}
				/>
			)}

			{createInStatus && (
				<Suspense fallback={<ModalSkeleton size="lg" />}>
					<Modal isOpen={true} closeModal={() => setCreateInStatus(null)}>
						<LazyCreateTaskModal
							onClose={() => setCreateInStatus(null)}
							title={createInStatus.name ?? ''}
							initEditMode={false}
							task={null}
							tasks={[]}
						/>
					</Modal>
				</Suspense>
			)}
			{editedStatus && (
				<Suspense fallback={<ModalSkeleton size="md" />}>
					<Modal isOpen={true} closeModal={() => setEditedStatus(null)}>
						<LazyEditStatusModal
							status={editedStatus}
							onClose={() => setEditedStatus(null)}
							setColumn={keepStatusesFromQuery}
						/>
					</Modal>
				</Suspense>
			)}
			{showsInvite && <InviteFormModal open={true} closeModal={() => setIsInviteOpen(false)} />}
		</>
	);
}
