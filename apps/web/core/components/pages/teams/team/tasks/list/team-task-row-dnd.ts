'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import {
	draggable,
	dropTargetForElements,
	monitorForElements
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { autoScrollForElements } from '@atlaskit/pragmatic-drag-and-drop-auto-scroll/element';
import { attachClosestEdge, extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import type { TaskOrderMove } from '@/core/lib/utils/task-view-order';
import { isTeamTaskRowData, rowMoveOf, teamTaskRowData } from './team-task-row-drop';

/** The edges a row takes a drop on. */
type RowEdge = 'top' | 'bottom';

/** The drop line's edge from a drop target's data. */
function rowDropEdgeOf(data: Record<string | symbol, unknown>): RowEdge | null {
	const edge = extractClosestEdge(data);
	if (edge === 'top' || edge === 'bottom') {
		return edge;
	}
	return null;
}

/**
 * Whether the pointer can drag a row: a mouse or a pen. On a touch screen a long press opens the row's menu, which
 * moves the task, and a drag would fight the scroll.
 */
function isFinePointer() {
	if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
		return true;
	}
	return window.matchMedia('(pointer: fine)').matches;
}

type RowDragState = { type: 'idle' } | { type: 'dragging' } | { type: 'over'; edge: RowEdge | null };

const IDLE: RowDragState = { type: 'idle' };

function idleUnlessDragging(current: RowDragState): RowDragState {
	if (current.type === 'dragging') {
		return current;
	}
	return IDLE;
}

function overEdge(current: RowDragState, edge: RowEdge | null): RowDragState {
	const isSameEdge = current.type === 'over' && current.edge === edge;
	if (isSameEdge) {
		return current;
	}
	return { type: 'over', edge };
}

/**
 * A row of a manual order as a drag source and a drop target of its group; nothing at all while `groupKey` is null
 * (the list is in another ordering). The list's monitor makes the move.
 */
export function useTeamTaskRowDrag(taskId: string, groupKey: string | null) {
	const rowRef = useRef<HTMLDivElement>(null);
	const [dragState, setDragState] = useState<RowDragState>(IDLE);

	useEffect(() => {
		const row = rowRef.current;
		if (!row || groupKey === null) {
			return;
		}
		const ownData = teamTaskRowData(taskId, groupKey);
		return combine(
			draggable({
				element: row,
				canDrag: isFinePointer,
				getInitialData: () => ownData,
				onDragStart: () => setDragState({ type: 'dragging' }),
				onDrop: () => setDragState(IDLE)
			}),
			dropTargetForElements({
				element: row,
				canDrop: ({ source }) => isTeamTaskRowData(source.data) && source.data.groupKey === groupKey,
				getIsSticky: () => true,
				getData: ({ input }) =>
					attachClosestEdge(ownData, { element: row, input, allowedEdges: ['top', 'bottom'] }),
				onDrag: ({ self, source }) => {
					if (source.element === row) {
						return;
					}
					const edge = rowDropEdgeOf(self.data);
					setDragState((current) => overEdge(current, edge));
				},
				onDragLeave: () => setDragState(idleUnlessDragging),
				onDrop: () => setDragState(IDLE)
			})
		);
	}, [groupKey, taskId]);

	const isReorderable = groupKey !== null;
	const isDragging = isReorderable && dragState.type === 'dragging';
	const dropEdge = isReorderable && dragState.type === 'over' ? dragState.edge : null;
	return { rowRef, isDragging, dropEdge };
}

/**
 * While the list follows a saved view's manual order: a row dropped next to another one of its group becomes a move,
 * and the list scrolls when a row is dragged near its edges.
 */
export function useTeamTaskListReorder(
	scrollRef: RefObject<HTMLDivElement | null>,
	canReorder: boolean,
	moveTask: ((move: TaskOrderMove) => void) | undefined
) {
	// The latest command, read at the drop: a new one (the view refetched mid-drag) never re-registers the monitor.
	const moveRef = useRef(moveTask);
	useEffect(() => {
		moveRef.current = moveTask;
	});
	const hasMove = moveTask !== undefined;
	useEffect(() => {
		const scroller = scrollRef.current;
		if (!canReorder || !hasMove || !scroller) {
			return;
		}
		return combine(
			monitorForElements({
				canMonitor: ({ source }) => isTeamTaskRowData(source.data),
				onDrop: ({ source, location }) => {
					const target = location.current.dropTargets[0];
					if (!target || !isTeamTaskRowData(source.data) || !isTeamTaskRowData(target.data)) {
						return;
					}
					const move = rowMoveOf(source.data, target.data, rowDropEdgeOf(target.data));
					if (move) {
						moveRef.current?.(move);
					}
				}
			}),
			autoScrollForElements({ element: scroller })
		);
	}, [canReorder, hasMove, scrollRef]);
}
