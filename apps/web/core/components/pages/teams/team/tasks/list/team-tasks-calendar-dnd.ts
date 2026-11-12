'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import {
	draggable,
	dropTargetForElements,
	monitorForElements
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { autoScrollForElements } from '@atlaskit/pragmatic-drag-and-drop-auto-scroll/element';
import {
	calendarDayData,
	calendarMoveOf,
	calendarTaskData,
	canDropOnDay,
	isCalendarTaskData
} from './team-tasks-calendar-drop';

/**
 * A task of the calendar as a drag source while `canDrag`; `dueDay` and `startDay` are its days as day numbers (null
 * when it has no such date), which tell the days it can go to. `isDragging` dims the task while it is moved.
 */
export function useCalendarTaskDrag<T extends HTMLElement>(
	taskId: string,
	dueDay: number | null,
	startDay: number | null,
	canDrag: boolean
) {
	const ref = useRef<T>(null);
	const [isDragging, setIsDragging] = useState(false);

	useEffect(() => {
		const element = ref.current;
		if (!element || !canDrag) {
			return;
		}
		return draggable({
			element,
			getInitialData: () => calendarTaskData(taskId, dueDay, startDay),
			onDragStart: () => setIsDragging(true),
			onDrop: () => setIsDragging(false)
		});
	}, [canDrag, dueDay, startDay, taskId]);

	const isShownDragging = canDrag && isDragging;
	return { ref, isDragging: isShownDragging };
}

/** A day of the month as a drop target while `canDrop`: `isOver` while a task that can go there is over it. */
export function useCalendarDayDrop(day: number, canDrop: boolean) {
	const ref = useRef<HTMLDivElement>(null);
	const [isOver, setIsOver] = useState(false);

	useEffect(() => {
		const element = ref.current;
		if (!element || !canDrop) {
			return;
		}
		return dropTargetForElements({
			element,
			canDrop: ({ source }) => canDropOnDay(source.data, day),
			getData: () => calendarDayData(day),
			onDragEnter: () => setIsOver(true),
			onDragLeave: () => setIsOver(false),
			onDrop: () => setIsOver(false)
		});
	}, [canDrop, day]);

	const isShownOver = canDrop && isOver;
	return { ref, isOver: isShownOver };
}

/**
 * While tasks can be dragged: a task dropped on a day it can go to moves there through `moveToDay`, and the month
 * scrolls when a task is dragged near its edges. The latest command is read at the drop, so a new one (the view
 * refetched mid-drag) never registers the monitor again.
 */
export function useCalendarTaskMoves(
	scrollRef: RefObject<HTMLElement | null>,
	isEnabled: boolean,
	moveToDay: (taskId: string, day: number) => void
) {
	const moveRef = useRef(moveToDay);
	useEffect(() => {
		moveRef.current = moveToDay;
	});

	useEffect(() => {
		const scroller = scrollRef.current;
		if (!isEnabled || !scroller) {
			return;
		}
		return combine(
			monitorForElements({
				canMonitor: ({ source }) => isCalendarTaskData(source.data),
				onDrop: ({ source, location }) => {
					const [target] = location.current.dropTargets;
					if (!target) {
						return;
					}
					const move = calendarMoveOf(source.data, target.data);
					if (!move) {
						return;
					}
					moveRef.current(move.taskId, move.day);
				}
			}),
			autoScrollForElements({ element: scroller })
		);
	}, [isEnabled, scrollRef]);
}

/**
 * A day's "+N more" list while a task of the month is dragged. One of its own tasks dragged out of it: `isDraggingOut`
 * lets the month under the list take the drop (the list fades and lets the pointer through), and the list closes
 * once the task is dropped. Any other task: the list closes at once, since a drag sends no click to close it by
 * (Safari and Firefox on macOS do not move the focus out of it on a press either), and it would hide the days below.
 */
export function useDayListDragOut(isOpen: boolean, setIsOpen: (isOpen: boolean) => void) {
	const listRef = useRef<HTMLDivElement>(null);
	const [isDraggingOut, setIsDraggingOut] = useState(false);

	useEffect(() => {
		if (!isOpen) {
			return;
		}
		const isInList = (element: Element) => Boolean(listRef.current?.contains(element));
		const cleanup = monitorForElements({
			canMonitor: ({ source }) => isCalendarTaskData(source.data),
			onDragStart: ({ source }) => {
				if (!isInList(source.element)) {
					setIsOpen(false);
					return;
				}
				setIsDraggingOut(true);
			},
			onDrop: ({ source }) => {
				if (!isInList(source.element)) {
					return;
				}
				setIsDraggingOut(false);
				setIsOpen(false);
			}
		});
		// The list may close another way mid-drag: it never opens again faded.
		return () => {
			cleanup();
			setIsDraggingOut(false);
		};
	}, [isOpen, setIsOpen]);

	return { listRef, isDraggingOut };
}
