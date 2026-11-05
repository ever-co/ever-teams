'use client';

import { useEffect, useRef, useState } from 'react';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { attachClosestEdge, extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import type { DropEdge } from '@/core/lib/utils/settings-task-properties';

/**
 * Pragmatic drag and drop passes plain records, so a private symbol tells these rows from anything else dragged
 * over the page.
 */
const ROW_KEY = Symbol('property-row');

export type PropertyRowData = { [ROW_KEY]: true; listId: string; groupKey: string; itemId: string; index: number };

export function propertyRowData(listId: string, groupKey: string, itemId: string, index: number): PropertyRowData {
	return { [ROW_KEY]: true, listId, groupKey, itemId, index };
}

export function isPropertyRowData(data: Record<string | symbol, unknown>): data is PropertyRowData {
	return data[ROW_KEY] === true;
}

export function isSameRowGroup(source: PropertyRowData, target: PropertyRowData) {
	const isSameList = source.listId === target.listId;
	const isSameGroupKey = source.groupKey === target.groupKey;
	return isSameList && isSameGroupKey;
}

export function rowDropEdgeOf(data: Record<string | symbol, unknown>): DropEdge | null {
	const edge = extractClosestEdge(data);
	if (edge === 'top') {
		return 'top';
	}
	if (edge === 'bottom') {
		return 'bottom';
	}
	return null;
}

export type RowDragState = { type: 'idle' } | { type: 'dragging' } | { type: 'over'; edge: DropEdge | null };

const IDLE: RowDragState = { type: 'idle' };

function idleUnlessDragging(current: RowDragState): RowDragState {
	if (current.type === 'dragging') {
		return current;
	}
	return IDLE;
}

function overEdge(current: RowDragState, edge: DropEdge | null): RowDragState {
	const isSameEdge = current.type === 'over' && current.edge === edge;
	if (isSameEdge) {
		return current;
	}
	return { type: 'over', edge };
}

export function dropEdgeOfState(state: RowDragState): DropEdge | null {
	if (state.type !== 'over') {
		return null;
	}
	return state.edge;
}

export function usePropertyRowDrag(data: PropertyRowData, isEnabled: boolean) {
	const rowRef = useRef<HTMLLIElement>(null);
	const handleRef = useRef<HTMLSpanElement>(null);
	const [dragState, setDragState] = useState<RowDragState>(IDLE);
	const { listId, groupKey, itemId, index } = data;

	useEffect(() => {
		const row = rowRef.current;
		const handle = handleRef.current;
		if (!row || !handle) {
			return;
		}
		if (!isEnabled) {
			return;
		}
		const ownData = propertyRowData(listId, groupKey, itemId, index);
		return combine(
			draggable({
				element: row,
				dragHandle: handle,
				getInitialData: () => ownData,
				onDragStart: () => setDragState({ type: 'dragging' }),
				onDrop: () => setDragState(IDLE)
			}),
			dropTargetForElements({
				element: row,
				canDrop: ({ source }) => {
					if (!isPropertyRowData(source.data)) {
						return false;
					}
					return isSameRowGroup(source.data, ownData);
				},
				getIsSticky: () => true,
				getData: ({ input }) =>
					attachClosestEdge(ownData, { element: row, input, allowedEdges: ['top', 'bottom'] }),
				onDrag: ({ self, source }) => {
					const isSelf = source.element === row;
					if (isSelf) {
						return;
					}
					const edge = rowDropEdgeOf(self.data);
					setDragState((current) => overEdge(current, edge));
				},
				onDragLeave: () => setDragState(idleUnlessDragging),
				onDrop: () => setDragState(IDLE)
			})
		);
	}, [groupKey, index, isEnabled, itemId, listId]);

	return { rowRef, handleRef, dragState };
}
