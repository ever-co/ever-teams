'use client';

import { Suspense, useCallback, useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Modal } from '@/core/components/common/modal';
import { ModalSkeleton } from '@/core/components/common/skeleton/modal-skeleton';
import { LazyEditStatusModal } from '@/core/components/optimized-components/tasks';
import { useKanbanLanes } from '@/core/hooks/tasks/use-kanban-lanes';
import { useKeyboardPreferences } from '@/core/hooks/keyboard/use-keyboard-preferences';
import type { TeamTasksViewState } from '@/core/hooks/tasks/use-team-tasks-view';
import { laneRangeIds } from '@/core/lib/utils/kanban-board';
import { tasksByTeamState } from '@/core/stores';
import { tasksOfGroups } from '@/core/lib/utils/team-tasks-view';
import { laneMoveOf } from '@/core/lib/utils/task-view-order';
import type { TTaskStatus } from '@/core/types/schemas';
import type { TTask } from '@/core/types/schemas/task/task.schema';
import { KanbanBoard } from '../../../../kanban/board/kanban-board';
import { KanbanBoardSkeleton } from '../../../../kanban/board/kanban-board-skeleton';
import {
	KanbanBoardProvider,
	KanbanSelectionProvider,
	type KanbanBoardActions,
	type KanbanSelection
} from '../../../../kanban/board/kanban-board-context';
import type { TeamTasksListCommands } from './team-tasks-list';
import { TeamTasksError } from './team-tasks-states';

/** The edit status form still updates a column list of its own; the board reads statuses from their query. */
function keepStatusesFromQuery() {
	return undefined;
}

/**
 * A view shown as a board (its layout): the tasks the view lists, with its filters, scope and search, in one lane per
 * status, the order inside a lane being the view's ordering. The cards are the Kanban page's (drag between lanes,
 * the card menu); they select like rows (⌘/Ctrl-click, their check, `X`, Shift for a range in a lane), so the page's
 * selection bar acts on them, and a focused card takes the rows' picker keys (`S` `P` `L` `D` `M`; the selection when
 * the card is in it), which reach Project and Due date while the page's bar has neither (until #5041 lands).
 */
export function TeamTasksBoard({
	view,
	commands
}: Readonly<{ view: TeamTasksViewState; commands: TeamTasksListCommands }>) {
	const t = useTranslations();
	const tasks = useMemo(() => tasksOfGroups(view.groups), [view.groups]);
	const { lanes, statuses, isLoading, isError, refetchTaskStatuses, moveTask, moveLane, setLaneCollapsed } =
		useKanbanLanes(tasks);
	const teamTasks = useAtomValue(tasksByTeamState);
	const teamTaskIds = useMemo(() => new Set(teamTasks.map((task) => task.id)), [teamTasks]);
	const [editedStatus, setEditedStatus] = useState<TTaskStatus | null>(null);
	const [anchorId, setAnchorId] = useState<string | null>(null);
	const { bindings } = useKeyboardPreferences();
	const { selectedIds, toggleSelected, setManySelected } = view;
	const { openTask, createTaskInGroup, openPicker, moveTask: moveInSavedOrder } = commands;

	// The lanes are the active team's statuses: a task of another team (a built-in view lists the person's tasks of
	// every team) changes its status from the task itself, never to a status of this team.
	const moveTeamTask = useCallback(
		(task: TTask, toStatus: TTaskStatus, toIndex: number) => {
			if (!teamTaskIds.has(task.id)) {
				toast.warning(t('pages.kanban.OTHER_TEAM_MOVE'), { id: 'board-other-team-move' });
				return;
			}
			if (!moveInSavedOrder) {
				moveTask(task, toStatus, toIndex);
				return;
			}
			// A view ordered by hand: the board shows the view's saved order alone (a refused move goes back with it).
			// Another lane is a status change only, the card keeping its place in that order: a place saved alongside
			// would stay if the status change failed. Inside its lane the card's place goes to the saved order.
			// The lane the card is shown in decides, not its `taskStatusId` (older tasks have only a status name)
			const lane = lanes.find((each) => each.status.id === toStatus.id);
			const laneIds = lane ? lane.tasks.map(({ id }) => id) : [];
			if (!laneIds.includes(task.id)) {
				moveTask(task, toStatus, toIndex, { keepsLaneOrder: false });
				return;
			}
			const savedMove = laneMoveOf(laneIds, task.id, toIndex);
			if (savedMove) {
				moveInSavedOrder(savedMove);
			}
		},
		[lanes, moveInSavedOrder, moveTask, t, teamTaskIds]
	);

	const actions = useMemo<KanbanBoardActions>(
		() => ({
			moveTask: moveTeamTask,
			openTask: (task: TTask) => openTask(task.id),
			createTaskIn: (status: TTaskStatus) => createTaskInGroup(status.name ?? null),
			editStatus: setEditedStatus,
			setLaneCollapsed
		}),
		[createTaskInGroup, moveTeamTask, openTask, setLaneCollapsed]
	);

	// A range is taken in the lane the cards share (the list's own range follows its rows).
	const toggleCard = useCallback(
		(taskId: string, extend: boolean) => {
			const range = extend && anchorId ? laneRangeIds(lanes, anchorId, taskId) : null;
			if (range) {
				setManySelected(range, true);
				return;
			}
			toggleSelected(taskId, false);
			setAnchorId(taskId);
		},
		[anchorId, lanes, setManySelected, toggleSelected]
	);
	const selection = useMemo<KanbanSelection>(
		() => ({ selectedIds, toggleSelected: toggleCard, bindings, openPicker }),
		[bindings, openPicker, selectedIds, toggleCard]
	);

	if (isLoading && !statuses.length) {
		return <KanbanBoardSkeleton />;
	}
	if (isError && !statuses.length) {
		return <TeamTasksError onRetry={() => void refetchTaskStatuses()} />;
	}
	return (
		<>
			<KanbanBoardProvider statuses={statuses} actions={actions}>
				<KanbanSelectionProvider selection={selection}>
					<KanbanBoard lanes={lanes} onMoveTask={moveTeamTask} onMoveLane={moveLane} />
				</KanbanSelectionProvider>
			</KanbanBoardProvider>
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
		</>
	);
}
