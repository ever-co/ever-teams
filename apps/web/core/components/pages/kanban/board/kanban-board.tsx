'use client';

import { useEffect, useEffectEvent, useRef } from 'react';
import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { autoScrollForElements } from '@atlaskit/pragmatic-drag-and-drop-auto-scroll/element';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import type { KanbanLane as KanbanLaneModel } from '@/core/lib/utils/kanban-board';
import type { TTaskStatus } from '@/core/types/schemas';
import type { TTask } from '@/core/types/schemas/task/task.schema';
import {
	indexForEdge,
	isCardData,
	isLaneBodyData,
	isLaneData,
	type KanbanCardData,
	type KanbanLaneData
} from './kanban-dnd';
import { KanbanLane } from './kanban-lane';
import { KanbanHiddenLanes } from './kanban-hidden-lanes';

const AT_LANE_END = Number.MAX_SAFE_INTEGER;

type DropData = Record<string | symbol, unknown>;

/** The slot a moved item takes once its own slot is taken out, when it moves forward in the same list. */
function finalIndex(rawIndex: number, sourceIndex: number, isSameList: boolean) {
	const movesForward = isSameList && sourceIndex < rawIndex;
	if (movesForward) {
		return rawIndex - 1;
	}
	return rawIndex;
}

function cardDropIndex(source: KanbanCardData, targetData: DropData) {
	if (isCardData(targetData)) {
		const edge = extractClosestEdge(targetData);
		const rawIndex = indexForEdge(targetData.index, edge, 'bottom');
		const isSameLane = targetData.statusId === source.statusId;
		return finalIndex(rawIndex, source.index, isSameLane);
	}
	return AT_LANE_END;
}

function targetStatusIdOf(targetData: DropData) {
	if (isCardData(targetData)) {
		return targetData.statusId;
	}
	if (isLaneBodyData(targetData)) {
		return targetData.statusId;
	}
	return null;
}

function laneDropIndex(source: KanbanLaneData, target: KanbanLaneData, targetData: DropData) {
	const edge = extractClosestEdge(targetData);
	const rawIndex = indexForEdge(target.index, edge, 'right');
	return finalIndex(rawIndex, source.index, true);
}

/**
 * The board: lanes side by side in the only scrolling direction of the page (horizontal), the collapsed ones
 * gathered at the end. One monitor receives every drop and turns it into a task move or a lane move; the board
 * scrolls by itself when a drag nears its edges, and so does each lane.
 */
export function KanbanBoard({
	lanes,
	onMoveTask,
	onMoveLane
}: Readonly<{
	lanes: KanbanLaneModel[];
	onMoveTask: (task: TTask, toStatus: TTaskStatus, toIndex: number) => void;
	onMoveLane: (statusId: string, toIndex: number) => void;
}>) {
	const scrollRef = useRef<HTMLDivElement>(null);
	const visibleLanes = lanes.filter((lane) => !lane.status.isCollapsed);
	const hiddenLanes = lanes.filter((lane) => lane.status.isCollapsed);
	const hasHiddenLanes = hiddenLanes.length > 0;

	const dropCard = useEffectEvent((source: KanbanCardData, targetData: DropData) => {
		const toStatusId = targetStatusIdOf(targetData);
		if (!toStatusId) {
			return;
		}
		const sourceLane = lanes.find((lane) => lane.status.id === source.statusId);
		const targetLane = lanes.find((lane) => lane.status.id === toStatusId);
		const task = sourceLane?.tasks.find((laneTask) => laneTask.id === source.taskId);
		if (!task || !targetLane) {
			return;
		}
		const toIndex = cardDropIndex(source, targetData);
		const isSameSlot = toStatusId === source.statusId && toIndex === source.index;
		if (isSameSlot) {
			return;
		}
		onMoveTask(task, targetLane.status, toIndex);
	});

	const dropLane = useEffectEvent((source: KanbanLaneData, targetData: DropData) => {
		if (!isLaneData(targetData)) {
			return;
		}
		const toIndex = laneDropIndex(source, targetData, targetData);
		if (toIndex === source.index) {
			return;
		}
		onMoveLane(source.statusId, toIndex);
	});

	useEffect(() => {
		const scroller = scrollRef.current;
		if (!scroller) {
			return;
		}
		return combine(
			monitorForElements({
				onDrop: ({ source, location }) => {
					const target = location.current.dropTargets[0];
					if (!target) {
						return;
					}
					if (isCardData(source.data)) {
						dropCard(source.data, target.data);
						return;
					}
					if (isLaneData(source.data)) {
						dropLane(source.data, target.data);
					}
				}
			}),
			autoScrollForElements({ element: scroller })
		);
	}, []);

	return (
		<div
			ref={scrollRef}
			className="custom-scrollbar flex h-full items-stretch gap-3 overflow-x-auto overflow-y-hidden px-4 py-3"
		>
			{visibleLanes.map((lane) => (
				<KanbanLane key={lane.status.id} lane={lane} index={lanes.indexOf(lane)} />
			))}
			{hasHiddenLanes && <KanbanHiddenLanes lanes={hiddenLanes} />}
		</div>
	);
}
