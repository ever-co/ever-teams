'use client';

import { Suspense, useCallback, useMemo, useState } from 'react';
import { Modal } from '@/core/components/common/modal';
import { ModalSkeleton } from '@/core/components/common/skeleton/modal-skeleton';
import { LazyEditStatusModal } from '@/core/components/optimized-components/tasks';
import { useKanbanLanes } from '@/core/hooks/tasks/use-kanban-lanes';
import { useKanbanSelectChord } from '@/core/hooks/keyboard/use-kanban-select-chord';
import type { TeamTasksViewState } from '@/core/hooks/tasks/use-team-tasks-view';
import { laneRangeIds } from '@/core/lib/utils/kanban-board';
import { tasksOfGroups } from '@/core/lib/utils/team-tasks-view';
import type { TTaskStatus } from '@/core/types/schemas';
import type { TTask } from '@/core/types/schemas/task/task.schema';
import { KanbanBoard } from '../../../../kanban/board/kanban-board';
import {
	KanbanBoardProvider,
	KanbanSelectionProvider,
	type KanbanBoardActions,
	type KanbanSelection
} from '../../../../kanban/board/kanban-board-context';
import type { TeamTasksListCommands } from './team-tasks-list';

/** The edit status form still updates a column list of its own; the board reads statuses from their query. */
function keepStatusesFromQuery() {
	return undefined;
}

/**
 * A view shown as a board (its layout): the tasks the view lists, with its filters, scope and search, in one lane per
 * status, the order inside a lane being the view's ordering. The cards are the Kanban page's (drag between lanes,
 * the card menu); they select like rows (⌘/Ctrl-click, their check, `X`, Shift for a range in a lane), so the page's
 * selection bar acts on them.
 */
export function TeamTasksBoard({
	view,
	commands
}: Readonly<{ view: TeamTasksViewState; commands: TeamTasksListCommands }>) {
	const tasks = useMemo(() => tasksOfGroups(view.groups), [view.groups]);
	const { lanes, statuses, moveTask, moveLane, setLaneCollapsed } = useKanbanLanes(tasks);
	const [editedStatus, setEditedStatus] = useState<TTaskStatus | null>(null);
	const [anchorId, setAnchorId] = useState<string | null>(null);
	const selectChord = useKanbanSelectChord();
	const { selectedIds, toggleSelected, setManySelected } = view;
	const { openTask, createTaskInGroup } = commands;

	const actions = useMemo<KanbanBoardActions>(
		() => ({
			moveTask,
			openTask: (task: TTask) => openTask(task.id),
			createTaskIn: (status: TTaskStatus) => createTaskInGroup(status.name ?? null),
			editStatus: setEditedStatus,
			setLaneCollapsed
		}),
		[createTaskInGroup, moveTask, openTask, setLaneCollapsed]
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
		() => ({ selectedIds, toggleSelected: toggleCard, selectChord }),
		[selectChord, selectedIds, toggleCard]
	);

	return (
		<>
			<KanbanBoardProvider statuses={statuses} actions={actions}>
				<KanbanSelectionProvider selection={selection}>
					<KanbanBoard lanes={lanes} onMoveTask={moveTask} onMoveLane={moveLane} />
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
