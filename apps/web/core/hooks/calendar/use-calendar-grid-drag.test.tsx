/** @jest-environment jsdom */

import { act, render } from '@testing-library/react';
import { type PointerEvent as ReactPointerEvent, useRef } from 'react';
import type { GridWindow } from '@/core/lib/utils/calendar-grid-settings';
import type { CalendarDay, CalendarEntry } from '@/core/lib/utils/calendar-view';
import type { TimeWindow } from '@/core/lib/utils/dashboards/timesheet-sheet-edit';
import {
	type CalendarGridDrag,
	DAY_COLUMN_ATTRIBUTE,
	type GridPress,
	useCalendarGridDrag
} from './use-calendar-grid-drag';

const HOUR_HEIGHT = 48;
const WHOLE_DAY: GridWindow = { firstMinute: 0, lastMinute: 1440 };
const DAY: CalendarDay = { key: '2026-11-09', date: new Date(2026, 10, 9), entries: [] } as unknown as CalendarDay;

function at(hour: number, minute = 0) {
	return new Date(2026, 10, 9, hour, minute);
}

const ENTRY = { id: 'entry-1', start: at(9), end: at(10), isManual: true } as unknown as CalendarEntry;

interface Harness {
	drag: CalendarGridDrag | null;
	column: HTMLElement | null;
}

function Grid({
	harness,
	stepMinutes,
	gridWindow,
	onPress,
	onMoveEntry,
	onCreateRange
}: Readonly<{
	harness: Harness;
	stepMinutes: number;
	gridWindow: GridWindow;
	onPress: (press: GridPress) => void;
	onMoveEntry: (entry: CalendarEntry, next: TimeWindow) => void;
	onCreateRange: (range: TimeWindow) => void;
}>) {
	const bodyRef = useRef<HTMLDivElement>(null);
	const scrollRef = useRef<HTMLDivElement>(null);
	harness.drag = useCalendarGridDrag({
		days: [DAY],
		hourHeightPx: HOUR_HEIGHT,
		gridWindow,
		stepMinutes,
		bodyRef,
		scrollRef,
		creatableSpot: () => ({ refusal: 'none', window: { start: at(0), end: at(23, 59) } }),
		onCreateRefused: () => undefined,
		onCreateRange,
		onMoveEntry,
		onPress
	});
	const markColumn = { [DAY_COLUMN_ATTRIBUTE]: DAY.key };
	return (
		<div ref={scrollRef}>
			<div ref={bodyRef}>
				<div
					{...markColumn}
					ref={(element) => {
						harness.column = element;
					}}
				/>
			</div>
		</div>
	);
}

function setUp(options: { stepMinutes?: number; gridWindow?: GridWindow } = {}) {
	const harness: Harness = { drag: null, column: null };
	const onPress = jest.fn();
	const onMoveEntry = jest.fn();
	const onCreateRange = jest.fn();
	render(
		<Grid
			harness={harness}
			stepMinutes={options.stepMinutes ?? 15}
			gridWindow={options.gridWindow ?? WHOLE_DAY}
			onPress={onPress}
			onMoveEntry={onMoveEntry}
			onCreateRange={onCreateRange}
		/>
	);
	const column = harness.column as HTMLElement;
	const height = 24 * HOUR_HEIGHT;
	const bounds = { x: 0, y: 0, top: 0, left: 0, right: 100, bottom: height, width: 100, height };
	column.getBoundingClientRect = () => ({ ...bounds, toJSON: () => bounds }) as DOMRect;
	return { harness, onPress, onMoveEntry, onCreateRange };
}

function pressEvent(harness: Harness, pointerType: 'mouse' | 'touch', clientY: number) {
	return {
		button: 0,
		isPrimary: true,
		pointerId: 1,
		pointerType,
		clientX: 50,
		clientY,
		currentTarget: harness.column,
		stopPropagation: () => undefined
	} as unknown as ReactPointerEvent<HTMLElement>;
}

function windowPointer(type: 'pointermove' | 'pointerup', clientY: number) {
	const event = new Event(type);
	Object.assign(event, { pointerId: 1, clientX: 50, clientY });
	act(() => {
		window.dispatchEvent(event);
	});
}

beforeEach(() => {
	jest.useFakeTimers();
});

afterEach(() => {
	jest.useRealTimers();
});

describe('useCalendarGridDrag', () => {
	it('opens the menu of an entry a finger held and lifted without moving, and moves nothing', () => {
		const { harness, onPress, onMoveEntry } = setUp();

		act(() => harness.drag?.beginPress(DAY, ENTRY, pressEvent(harness, 'touch', 9 * HOUR_HEIGHT)));
		act(() => jest.advanceTimersByTime(400));
		windowPointer('pointerup', 9 * HOUR_HEIGHT);
		// The finger's touchend and click still follow: what the press opens must not take them for presses outside it
		expect(onPress).not.toHaveBeenCalled();
		act(() => jest.advanceTimersByTime(100));

		expect(onPress).toHaveBeenCalledWith(expect.objectContaining({ kind: 'entry', entry: ENTRY }));
		expect(onMoveEntry).not.toHaveBeenCalled();
	});

	it('takes a finger that leaves before the hold ends for a tap: no menu', () => {
		const { harness, onPress } = setUp();

		act(() => harness.drag?.beginPress(DAY, ENTRY, pressEvent(harness, 'touch', 9 * HOUR_HEIGHT)));
		act(() => jest.advanceTimersByTime(100));
		windowPointer('pointerup', 9 * HOUR_HEIGHT);

		expect(onPress).not.toHaveBeenCalled();
	});

	it('opens the slot menu for empty time held and lifted, instead of adding time', () => {
		const { harness, onPress, onCreateRange } = setUp();

		act(() => harness.drag?.beginCreate(DAY, pressEvent(harness, 'touch', 14 * HOUR_HEIGHT)));
		act(() => jest.advanceTimersByTime(400));
		windowPointer('pointerup', 14 * HOUR_HEIGHT);
		act(() => jest.advanceTimersByTime(100));

		expect(onPress).toHaveBeenCalledWith(expect.objectContaining({ kind: 'slot', minute: 14 * 60 }));
		expect(onCreateRange).not.toHaveBeenCalled();
	});

	it('keeps a held finger that moves a drag, not a press', () => {
		const { harness, onPress, onMoveEntry } = setUp();

		act(() => harness.drag?.beginMove(DAY, ENTRY, pressEvent(harness, 'touch', 9 * HOUR_HEIGHT)));
		act(() => jest.advanceTimersByTime(400));
		windowPointer('pointermove', 10 * HOUR_HEIGHT);
		windowPointer('pointerup', 10 * HOUR_HEIGHT);

		expect(onPress).not.toHaveBeenCalled();
		expect(onMoveEntry).toHaveBeenCalledWith(ENTRY, { start: at(10), end: at(11) });
	});

	it('never waits for a hold with a mouse: a right click opens the menu instead', () => {
		const { harness, onPress } = setUp();

		act(() => harness.drag?.beginPress(DAY, ENTRY, pressEvent(harness, 'mouse', 9 * HOUR_HEIGHT)));
		act(() => jest.advanceTimersByTime(400));
		windowPointer('pointerup', 9 * HOUR_HEIGHT);

		expect(onPress).not.toHaveBeenCalled();
	});

	it('moves an entry by the chosen step', () => {
		const sevenMinutesPx = (7 / 60) * HOUR_HEIGHT;
		const byFive = setUp({ stepMinutes: 5 });

		act(() => byFive.harness.drag?.beginMove(DAY, ENTRY, pressEvent(byFive.harness, 'mouse', 9 * HOUR_HEIGHT)));
		windowPointer('pointermove', 9 * HOUR_HEIGHT + sevenMinutesPx);
		windowPointer('pointerup', 9 * HOUR_HEIGHT + sevenMinutesPx);

		expect(byFive.onMoveEntry).toHaveBeenCalledWith(ENTRY, { start: at(9, 5), end: at(10, 5) });
	});

	it('leaves an entry in place when the move is smaller than half a step', () => {
		const sevenMinutesPx = (7 / 60) * HOUR_HEIGHT;
		const byFifteen = setUp({ stepMinutes: 15 });

		act(() =>
			byFifteen.harness.drag?.beginMove(DAY, ENTRY, pressEvent(byFifteen.harness, 'mouse', 9 * HOUR_HEIGHT))
		);
		windowPointer('pointermove', 9 * HOUR_HEIGHT + sevenMinutesPx);
		windowPointer('pointerup', 9 * HOUR_HEIGHT + sevenMinutesPx);

		expect(byFifteen.onMoveEntry).not.toHaveBeenCalled();
	});

	it('reads a pointer against the first hour the grid draws', () => {
		const fromSeven = setUp({ gridWindow: { firstMinute: 7 * 60, lastMinute: 19 * 60 } });

		act(() => fromSeven.harness.drag?.beginCreate(DAY, pressEvent(fromSeven.harness, 'touch', 2 * HOUR_HEIGHT)));
		act(() => jest.advanceTimersByTime(400));
		windowPointer('pointerup', 2 * HOUR_HEIGHT);
		act(() => jest.advanceTimersByTime(100));

		expect(fromSeven.onPress).toHaveBeenCalledWith(expect.objectContaining({ kind: 'slot', minute: 9 * 60 }));
	});
});
