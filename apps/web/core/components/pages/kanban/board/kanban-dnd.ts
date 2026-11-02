import type { Edge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';

/**
 * Drag payloads of the Kanban board. Pragmatic drag and drop passes plain records between draggables and drop
 * targets; a private symbol on each one tells the board's own payloads from anything else dragged over the page.
 */
const CARD_KEY = Symbol('kanban-card');
const LANE_KEY = Symbol('kanban-lane');
const LANE_BODY_KEY = Symbol('kanban-lane-body');

export type KanbanCardData = { [CARD_KEY]: true; taskId: string; statusId: string; index: number };
export type KanbanLaneData = { [LANE_KEY]: true; statusId: string; index: number };
export type KanbanLaneBodyData = { [LANE_BODY_KEY]: true; statusId: string };

export function cardData(taskId: string, statusId: string, index: number): KanbanCardData {
	return { [CARD_KEY]: true, taskId, statusId, index };
}

export function laneData(statusId: string, index: number): KanbanLaneData {
	return { [LANE_KEY]: true, statusId, index };
}

export function laneBodyData(statusId: string): KanbanLaneBodyData {
	return { [LANE_BODY_KEY]: true, statusId };
}

export function isCardData(data: Record<string | symbol, unknown>): data is KanbanCardData {
	return data[CARD_KEY] === true;
}

export function isLaneData(data: Record<string | symbol, unknown>): data is KanbanLaneData {
	return data[LANE_KEY] === true;
}

export function isLaneBodyData(data: Record<string | symbol, unknown>): data is KanbanLaneBodyData {
	return data[LANE_BODY_KEY] === true;
}

/** Index of the dropped item once its own slot is taken out of the list it moves within. */
export function indexForEdge(targetIndex: number, edge: Edge | null, after: Edge) {
	const isAfter = edge === after;
	if (isAfter) {
		return targetIndex + 1;
	}
	return targetIndex;
}

/** What a card or a lane shows while something is dragged: itself lifted, or a drop line on one of its edges. */
export type DragOverState = { type: 'idle' } | { type: 'dragging' } | { type: 'over'; edge: Edge | null };

export const IDLE_DRAG_STATE: DragOverState = { type: 'idle' };

export function overEdge(edge: Edge | null): DragOverState {
	return { type: 'over', edge };
}

export function idleUnlessDragging(current: DragOverState): DragOverState {
	if (current.type === 'dragging') {
		return current;
	}
	return IDLE_DRAG_STATE;
}

export function dropEdgeOf(state: DragOverState) {
	if (state.type !== 'over') {
		return null;
	}
	return state.edge;
}
