'use client';

import {
	type MouseEvent as ReactMouseEvent,
	type PointerEvent as ReactPointerEvent,
	type RefObject,
	useCallback,
	useEffect,
	useEffectEvent,
	useMemo,
	useRef,
	useState
} from 'react';
import {
	type CreatableSpot,
	DRAG_STEP_MINUTES,
	type DragRefusal,
	edgeScrollStepOf,
	gridMinuteAt,
	type HorizontalSpan,
	isSameWindow,
	type MinuteRange,
	movedWindowOf,
	nearestSpanIndexOf,
	rangeOnDay,
	rangeWithin,
	type ResizeEdge,
	resizedWindowOf,
	selectionRangeOf,
	timeAtGridMinute,
	windowOfRange
} from '@/core/lib/utils/calendar-drag';
import type { CalendarDay, CalendarEntry } from '@/core/lib/utils/calendar-view';
import type { TimeWindow } from '@/core/lib/utils/dashboards/timesheet-sheet-edit';

/** The attribute each day column of the grid carries, so a pointer position is read against the real columns. */
export const DAY_COLUMN_ATTRIBUTE = 'data-calendar-day';

const DAY_COLUMN_SELECTOR = `[${DAY_COLUMN_ATTRIBUTE}]`;

/** A mouse press becomes a drag once it has moved this far; under it, it stays a click. */
const MOUSE_DRAG_THRESHOLD_PX = 4;

/** A finger that moves this far before the hold ends is scrolling the grid, not dragging. */
const TOUCH_SCROLL_THRESHOLD_PX = 8;

/** A finger drags after resting this long, so a swipe still scrolls the grid. */
const TOUCH_HOLD_MILLISECONDS = 350;

/** The click a browser sends after a drag ends on the element it began on is dropped during this time. */
const CLICK_AFTER_DRAG_MILLISECONDS = 400;

/** How often the grid scrolls one step while a drag is held near its top or bottom edge. */
const EDGE_SCROLL_TICK_MILLISECONDS = 40;

const PRIMARY_BUTTON = 0;

const ESCAPE_KEY = 'Escape';

export type GridDragKind = 'create' | 'move' | 'resize';

export type GridDragPreview =
	| { kind: 'create'; dayKey: string; window: TimeWindow }
	| { kind: 'entry'; entry: CalendarEntry; window: TimeWindow };

interface DragSession {
	kind: GridDragKind;
	edge: ResizeEdge;
	pointerId: number;
	isTouch: boolean;
	startX: number;
	startY: number;
	/** Where the pointer was last seen: a drag held still near an edge keeps scrolling from there. */
	pointerX: number;
	pointerY: number;
	isActive: boolean;
	/** Given up with Escape while the button is still down: nothing follows the pointer until its release. */
	isGivenUp: boolean;
	waitsForHold: boolean;
	day: CalendarDay;
	dayIndex: number;
	anchorMinute: number;
	entry: CalendarEntry | null;
	spot: CreatableSpot | null;
	preview: GridDragPreview | null;
}

export interface GridDragOptions {
	days: ReadonlyArray<CalendarDay>;
	hourHeightPx: number;
	bodyRef: RefObject<HTMLDivElement | null>;
	scrollRef: RefObject<HTMLDivElement | null>;
	creatableSpot: (time: Date) => CreatableSpot;
	onCreateRefused: (refusal: DragRefusal) => void;
	onCreateRange: (range: TimeWindow) => void;
	onMoveEntry: (entry: CalendarEntry, next: TimeWindow) => void;
}

interface PointerPlace {
	dayIndex: number;
	minute: number;
}

const NOT_ARMED = 0;

function isSamePreview(first: GridDragPreview | null, second: GridDragPreview | null) {
	if (first === null || second === null) {
		return first === second;
	}
	if (first.kind !== second.kind) {
		return false;
	}
	return isSameWindow(first.window, second.window);
}

function columnsOf(body: HTMLElement) {
	const columns = body.querySelectorAll<HTMLElement>(DAY_COLUMN_SELECTOR);
	return [...columns];
}

function columnAround(target: HTMLElement) {
	return target.closest<HTMLElement>(DAY_COLUMN_SELECTOR);
}

function spanOf(column: HTMLElement): HorizontalSpan {
	const bounds = column.getBoundingClientRect();
	return { left: bounds.left, right: bounds.right };
}

function hasMovedPast(session: DragSession, event: PointerEvent, threshold: number) {
	const movedX = Math.abs(event.clientX - session.startX);
	const movedY = Math.abs(event.clientY - session.startY);
	return movedX > threshold || movedY > threshold;
}

function limitsOf(spot: CreatableSpot | null, day: Date): MinuteRange | null {
	const freeTime = spot?.window;
	if (!freeTime) {
		return null;
	}
	return rangeOnDay(freeTime, day);
}

function createPreviewOf(session: DragSession, place: PointerPlace): GridDragPreview | null {
	const limits = limitsOf(session.spot, session.day.date);
	if (!limits) {
		return null;
	}
	const selection = selectionRangeOf(session.anchorMinute, place.minute, DRAG_STEP_MINUTES);
	const range = rangeWithin(selection, limits);
	if (!range) {
		return session.preview;
	}
	const window = windowOfRange(session.day.date, range);
	return { kind: 'create', dayKey: session.day.key, window };
}

function entryPreviewOf(session: DragSession, entry: CalendarEntry, place: PointerPlace): GridDragPreview {
	const current: TimeWindow = { start: entry.start, end: entry.end };
	if (session.kind === 'move') {
		const dayShift = place.dayIndex - session.dayIndex;
		const minuteShift = place.minute - session.anchorMinute;
		const moved = movedWindowOf(current, dayShift, minuteShift, DRAG_STEP_MINUTES);
		return { kind: 'entry', entry, window: moved };
	}
	const resized = resizedWindowOf(current, session.edge, session.day.date, place.minute, DRAG_STEP_MINUTES);
	return { kind: 'entry', entry, window: resized };
}

function previewOf(session: DragSession, place: PointerPlace): GridDragPreview | null {
	if (session.kind === 'create') {
		return createPreviewOf(session, place);
	}
	if (!session.entry) {
		return null;
	}
	return entryPreviewOf(session, session.entry, place);
}

/**
 * The drags of the week and day grids, on plain pointer events: over empty time to select a new entry, on an entry
 * to move it across times and days, on its edges to resize it. A mouse drags after a few pixels and a finger after
 * a short hold, so a click still opens the entry and a swipe still scrolls. Escape gives the drag up.
 */
export function useCalendarGridDrag(options: GridDragOptions) {
	const { bodyRef, scrollRef, hourHeightPx } = options;
	const sessionRef = useRef<DragSession | null>(null);
	const armCountRef = useRef(NOT_ARMED);
	const clicksDroppedUntilRef = useRef(0);
	const latestRef = useRef(options);
	const [armedId, setArmedId] = useState(NOT_ARMED);
	const [preview, setPreview] = useState<GridDragPreview | null>(null);
	const [activeKind, setActiveKind] = useState<GridDragKind | null>(null);

	useEffect(() => {
		latestRef.current = options;
	});

	const endSession = useCallback(() => {
		sessionRef.current = null;
		setArmedId(NOT_ARMED);
		setActiveKind(null);
		setPreview(null);
	}, []);

	const dropClicksFor = useCallback((milliseconds: number) => {
		clicksDroppedUntilRef.current = performance.now() + milliseconds;
	}, []);

	const placeOf = useCallback(
		(session: DragSession, clientX: number, clientY: number): PointerPlace | null => {
			const body = bodyRef.current;
			if (!body) {
				return null;
			}
			const columns = columnsOf(body);
			let dayIndex = session.dayIndex;
			if (session.kind === 'move') {
				const spans = columns.map(spanOf);
				dayIndex = nearestSpanIndexOf(clientX, spans);
			}
			const column = columns[dayIndex];
			if (!column) {
				return null;
			}
			const bounds = column.getBoundingClientRect();
			const minute = gridMinuteAt(clientY - bounds.top, hourHeightPx);
			return { dayIndex, minute };
		},
		[bodyRef, hourHeightPx]
	);

	const followPointer = useCallback(
		(session: DragSession, clientX: number, clientY: number) => {
			const place = placeOf(session, clientX, clientY);
			if (!place) {
				return;
			}
			const next = previewOf(session, place);
			session.preview = next;
			setPreview((current) => {
				if (isSamePreview(current, next)) {
					return current;
				}
				return next;
			});
		},
		[placeOf]
	);

	/** Scrolls one step when the pointer is near the top or the bottom, and tells whether the grid moved. */
	const scrollNearEdge = useCallback(
		(clientY: number): boolean => {
			const container = scrollRef.current;
			if (!container) {
				return false;
			}
			const bounds = container.getBoundingClientRect();
			const step = edgeScrollStepOf(clientY, bounds.top, bounds.bottom);
			if (step === 0) {
				return false;
			}
			const previousScrollTop = container.scrollTop;
			container.scrollTop += step;
			return container.scrollTop !== previousScrollTop;
		},
		[scrollRef]
	);

	const activate = useEffectEvent((session: DragSession, clientX: number, clientY: number) => {
		const refusal = session.spot?.refusal ?? 'none';
		if (refusal !== 'none') {
			options.onCreateRefused(refusal);
			dropClicksFor(CLICK_AFTER_DRAG_MILLISECONDS);
			endSession();
			return;
		}
		session.isActive = true;
		session.pointerX = clientX;
		session.pointerY = clientY;
		setActiveKind(session.kind);
		followPointer(session, clientX, clientY);
	});

	const commit = useEffectEvent((session: DragSession) => {
		const result = session.preview;
		if (!result) {
			return;
		}
		if (result.kind === 'create') {
			options.onCreateRange(result.window);
			return;
		}
		const previous: TimeWindow = { start: result.entry.start, end: result.entry.end };
		if (isSameWindow(previous, result.window)) {
			return;
		}
		options.onMoveEntry(result.entry, result.window);
	});

	const handleHoldEnd = useEffectEvent(() => {
		const session = sessionRef.current;
		if (!session?.waitsForHold) {
			return;
		}
		session.waitsForHold = false;
		activate(session, session.startX, session.startY);
	});

	const handlePointerMove = useEffectEvent((event: PointerEvent) => {
		const session = sessionRef.current;
		if (session?.pointerId !== event.pointerId) {
			return;
		}
		if (session.isGivenUp) {
			return;
		}
		if (session.isActive) {
			session.pointerX = event.clientX;
			session.pointerY = event.clientY;
			followPointer(session, event.clientX, event.clientY);
			return;
		}
		if (session.waitsForHold) {
			if (hasMovedPast(session, event, TOUCH_SCROLL_THRESHOLD_PX)) {
				endSession();
			}
			return;
		}
		if (hasMovedPast(session, event, MOUSE_DRAG_THRESHOLD_PX)) {
			activate(session, event.clientX, event.clientY);
		}
	});

	const handleEdgeScrollTick = useEffectEvent(() => {
		const session = sessionRef.current;
		if (!session?.isActive) {
			return;
		}
		const hasScrolled = scrollNearEdge(session.pointerY);
		if (hasScrolled) {
			followPointer(session, session.pointerX, session.pointerY);
		}
	});

	const handlePointerUp = useEffectEvent((event: PointerEvent) => {
		const session = sessionRef.current;
		if (session?.pointerId !== event.pointerId) {
			return;
		}
		if (session.isGivenUp) {
			dropClicksFor(CLICK_AFTER_DRAG_MILLISECONDS);
		}
		if (session.isActive) {
			dropClicksFor(CLICK_AFTER_DRAG_MILLISECONDS);
			commit(session);
		}
		endSession();
	});

	const handlePointerCancel = useEffectEvent((event: PointerEvent) => {
		const session = sessionRef.current;
		if (session?.pointerId === event.pointerId) {
			endSession();
		}
	});

	const handleKeyDown = useEffectEvent((event: KeyboardEvent) => {
		if (event.key !== ESCAPE_KEY) {
			return;
		}
		const session = sessionRef.current;
		if (!session?.isActive) {
			endSession();
			return;
		}
		session.isActive = false;
		session.isGivenUp = true;
		session.preview = null;
		setActiveKind(null);
		setPreview(null);
	});

	const handleTouchMove = useEffectEvent((event: TouchEvent) => {
		const session = sessionRef.current;
		if (session?.isActive && event.cancelable) {
			event.preventDefault();
		}
	});

	const handleContextMenu = useEffectEvent((event: Event) => {
		const session = sessionRef.current;
		if (session?.isTouch) {
			event.preventDefault();
		}
	});

	useEffect(() => {
		if (armedId === NOT_ARMED) {
			return;
		}
		let holdTimer: number | null = null;
		if (sessionRef.current?.waitsForHold) {
			holdTimer = window.setTimeout(() => handleHoldEnd(), TOUCH_HOLD_MILLISECONDS);
		}
		const onPointerMove = (event: PointerEvent) => handlePointerMove(event);
		const onPointerUp = (event: PointerEvent) => handlePointerUp(event);
		const onPointerCancel = (event: PointerEvent) => handlePointerCancel(event);
		const onKeyDown = (event: KeyboardEvent) => handleKeyDown(event);
		const onContextMenu = (event: Event) => handleContextMenu(event);
		window.addEventListener('pointermove', onPointerMove);
		window.addEventListener('pointerup', onPointerUp);
		window.addEventListener('pointercancel', onPointerCancel);
		window.addEventListener('keydown', onKeyDown);
		window.addEventListener('contextmenu', onContextMenu);
		return () => {
			if (holdTimer !== null) {
				window.clearTimeout(holdTimer);
			}
			window.removeEventListener('pointermove', onPointerMove);
			window.removeEventListener('pointerup', onPointerUp);
			window.removeEventListener('pointercancel', onPointerCancel);
			window.removeEventListener('keydown', onKeyDown);
			window.removeEventListener('contextmenu', onContextMenu);
		};
	}, [armedId]);

	// A pointer held still near the top or the bottom sends no move: the grid scrolls on a timer for as long as the
	// drag stays there, and the preview follows what is now under the pointer
	useEffect(() => {
		if (activeKind === null) {
			return;
		}
		const timer = window.setInterval(() => handleEdgeScrollTick(), EDGE_SCROLL_TICK_MILLISECONDS);
		return () => window.clearInterval(timer);
	}, [activeKind]);

	// Once a held finger drags, the grid must not scroll under it. Only a touchmove listener that is not passive
	// can refuse that scroll, and some browsers ask for it to be there before the touch begins.
	useEffect(() => {
		const container = scrollRef.current;
		if (!container) {
			return;
		}
		const onTouchMove = (event: TouchEvent) => handleTouchMove(event);
		container.addEventListener('touchmove', onTouchMove, { passive: false });
		return () => container.removeEventListener('touchmove', onTouchMove);
	}, [scrollRef]);

	const arm = useCallback((session: DragSession) => {
		armCountRef.current += 1;
		sessionRef.current = session;
		setArmedId(armCountRef.current);
	}, []);

	const sessionOf = useCallback(
		(event: ReactPointerEvent<HTMLElement>, kind: GridDragKind, day: CalendarDay): DragSession | null => {
			const isPrimaryButton = event.button === PRIMARY_BUTTON;
			if (!isPrimaryButton || !event.isPrimary) {
				return null;
			}
			const column = columnAround(event.currentTarget);
			if (!column) {
				return null;
			}
			const dayIndex = latestRef.current.days.findIndex((candidate) => candidate.key === day.key);
			if (dayIndex < 0) {
				return null;
			}
			const bounds = column.getBoundingClientRect();
			const anchorMinute = gridMinuteAt(event.clientY - bounds.top, hourHeightPx);
			const isTouch = event.pointerType === 'touch';
			const isResize = kind === 'resize';
			return {
				kind,
				edge: 'end',
				pointerId: event.pointerId,
				isTouch,
				startX: event.clientX,
				startY: event.clientY,
				pointerX: event.clientX,
				pointerY: event.clientY,
				isActive: false,
				isGivenUp: false,
				waitsForHold: isTouch && !isResize,
				day,
				dayIndex,
				anchorMinute,
				entry: null,
				spot: null,
				preview: null
			};
		},
		[hourHeightPx]
	);

	const beginCreate = useCallback(
		(day: CalendarDay, event: ReactPointerEvent<HTMLElement>) => {
			const session = sessionOf(event, 'create', day);
			if (!session) {
				return;
			}
			const anchorTime = timeAtGridMinute(day.date, session.anchorMinute);
			session.spot = latestRef.current.creatableSpot(anchorTime);
			arm(session);
		},
		[arm, sessionOf]
	);

	const beginMove = useCallback(
		(day: CalendarDay, entry: CalendarEntry, event: ReactPointerEvent<HTMLElement>) => {
			const session = sessionOf(event, 'move', day);
			if (!session) {
				return;
			}
			session.entry = entry;
			arm(session);
		},
		[arm, sessionOf]
	);

	const beginResize = useCallback(
		(day: CalendarDay, entry: CalendarEntry, edge: ResizeEdge, event: ReactPointerEvent<HTMLElement>) => {
			event.stopPropagation();
			const session = sessionOf(event, 'resize', day);
			if (!session) {
				return;
			}
			session.entry = entry;
			session.edge = edge;
			arm(session);
		},
		[arm, sessionOf]
	);

	const dropClickAfterDrag = useCallback((event: ReactMouseEvent<HTMLElement>) => {
		const isJustAfterDrag = performance.now() < clicksDroppedUntilRef.current;
		if (!isJustAfterDrag) {
			return;
		}
		clicksDroppedUntilRef.current = 0;
		event.preventDefault();
		event.stopPropagation();
	}, []);

	return useMemo(
		() => ({ preview, activeKind, beginCreate, beginMove, beginResize, dropClickAfterDrag }),
		[activeKind, beginCreate, beginMove, beginResize, dropClickAfterDrag, preview]
	);
}

export type CalendarGridDrag = ReturnType<typeof useCalendarGridDrag>;
