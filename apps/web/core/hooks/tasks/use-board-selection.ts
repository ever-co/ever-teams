'use client';

import { useCallback, useMemo, useState } from 'react';
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
 * the cards from the last one toggled in the same lane. Only the cards still on the board count as selected, so a
 * filter or a move to a hidden lane drops them from it.
 */
export function useBoardSelection(lanes: readonly KanbanLane[]) {
	const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set());
	const [anchorId, setAnchorId] = useState<string | null>(null);

	const onBoard = useMemo(() => new Set(lanes.flatMap((lane) => lane.tasks.map((task) => task.id))), [lanes]);
	const selectedIds = useMemo<ReadonlySet<string>>(
		() => new Set([...selected].filter((id) => onBoard.has(id))),
		[onBoard, selected]
	);

	const toggleSelected = useCallback(
		(taskId: string, extend: boolean) => {
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
		setSelected(new Set());
		setAnchorId(null);
	}, []);

	return { selectedIds, toggleSelected, setManySelected, clearSelection };
}
