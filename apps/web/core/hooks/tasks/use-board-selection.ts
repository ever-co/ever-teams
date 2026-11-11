'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { useIsomorphicLayoutEffect } from '@/core/hooks/common/use-isomorphic-layout-effect';
import { laneRangeIds, type KanbanLane } from '@/core/lib/utils/kanban-board';

function withToggled(current: ReadonlySet<string>, id: string) {
	const next = new Set(current);
	if (next.has(id)) {
		next.delete(id);
	} else {
		next.add(id);
	}
	return next;
}

/**
 * The selection of the Kanban page's cards: a card toggles (⌘/Ctrl-click, its check, the list's `X`), Shift selects
 * the cards from the last one toggled in the same lane. A card that leaves the board (a filter, an archive) leaves the
 * selection for good: clearing the filter does not select it again. A late answer (the tasks an archive left) is put
 * back only over the selection it cleared, never over one the person made since (`restoreLater`).
 */
export function useBoardSelection(lanes: readonly KanbanLane[]) {
	const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set());
	const [anchorId, setAnchorId] = useState<string | null>(null);
	const revision = useRef(0);

	const onBoard = useMemo(() => new Set(lanes.flatMap((lane) => lane.tasks.map((task) => task.id))), [lanes]);
	// The board as it is now, for a late answer (it may come after a filter took some of its tasks off the board):
	// kept in a layout effect, so it is current before any answer can run after the board commits.
	const onBoardNow = useRef(onBoard);
	useIsomorphicLayoutEffect(() => {
		onBoardNow.current = onBoard;
	}, [onBoard]);
	const selectedIds = useMemo<ReadonlySet<string>>(
		() => new Set([...selected].filter((id) => onBoard.has(id))),
		[onBoard, selected]
	);

	// The cards gone from the board leave the stored selection too, and so does an anchor among them (set while
	// rendering, once per new board, as React advises for state that follows a prop).
	const [prunedFor, setPrunedFor] = useState(onBoard);
	if (prunedFor !== onBoard) {
		setPrunedFor(onBoard);
		const kept = [...selected].filter((id) => onBoard.has(id));
		if (kept.length !== selected.size) setSelected(new Set(kept));
		if (anchorId && !onBoard.has(anchorId)) setAnchorId(null);
	}

	const toggleSelected = useCallback(
		(taskId: string, extend: boolean) => {
			revision.current += 1;
			const range = extend && anchorId ? laneRangeIds(lanes, anchorId, taskId) : null;
			if (range) {
				setSelected((current) => new Set([...current, ...range]));
				return;
			}
			setSelected((current) => withToggled(current, taskId));
			setAnchorId(taskId);
		},
		[anchorId, lanes]
	);

	const setManySelected = useCallback((taskIds: readonly string[], isSelected: boolean) => {
		revision.current += 1;
		setSelected((current) => {
			const next = new Set(current);
			for (const id of taskIds) {
				if (isSelected) next.add(id);
				else next.delete(id);
			}
			return next;
		});
	}, []);

	const clearSelection = useCallback(() => {
		revision.current += 1;
		setSelected(new Set());
		setAnchorId(null);
	}, []);

	/** A way to select tasks again later (an archive's leftovers) that does nothing once the selection has changed. */
	const restoreLater = useCallback(() => {
		const at = revision.current;
		return (taskIds: readonly string[]) => {
			const stillOnBoard = taskIds.filter((id) => onBoardNow.current.has(id));
			if (revision.current !== at || !stillOnBoard.length) return;
			setSelected((current) => new Set([...current, ...stillOnBoard]));
		};
	}, []);

	return { selectedIds, toggleSelected, setManySelected, clearSelection, restoreLater };
}
