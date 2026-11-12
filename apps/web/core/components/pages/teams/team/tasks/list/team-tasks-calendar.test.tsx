/** @jest-environment jsdom */

import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import { dayNumberOf } from '@/core/lib/utils/team-tasks-timeline';
import { teamTasksState } from '@/core/stores/teams/team-tasks';
import { currentOrganizationState } from '@/core/stores/user/user-organizations';
import { EWeekDays } from '@/core/types/generics/enums/date';
import type { TOrganization } from '@/core/types/schemas/organization/organization.schema';
import type { TTask } from '@/core/types/schemas/task/task.schema';

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: Record<string, unknown>) =>
		values ? `${key}(${Object.values(values).join(',')})` : key,
	useLocale: () => 'en'
}));
// The owner hook asks the server for the organisation; the calendar only reads the atom it fills.
jest.mock('@/core/hooks/bootstrap/use-feature-data', () => ({ useCurrentOrganizationOwner: jest.fn() }));
// The month is a grid from `sm`, the list of its busy days on a phone; tasks are dragged with a mouse or a pen only.
let mockFitsMonthGrid = true;
let mockHasFinePointer = true;
function mockMatchOf(query: string) {
	const isPointerQuery = query.includes('pointer');
	if (isPointerQuery) {
		return mockHasFinePointer;
	}
	return mockFitsMonthGrid;
}
jest.mock('@/core/hooks/common/use-media-query', () => ({ useMediaQuery: (query: string) => mockMatchOf(query) }));
const mockMoveToDay = jest.fn();
jest.mock('@/core/hooks/tasks/use-team-task-updates', () => ({
	useTeamTaskUpdates: () => ({ moveToDay: mockMoveToDay })
}));

// Pragmatic drag and drop listens to native drag events, which jsdom does not have. These stand-ins keep what the
// calendar registers, so a test plays a drag the way the library calls those registrations.
type DragData = Record<string | symbol, unknown>;
interface DragSource {
	element: HTMLElement;
	data: DragData;
}
interface DropTarget {
	element: HTMLElement;
	data: DragData;
}
interface DragLocation {
	current: { dropTargets: DropTarget[] };
}
interface DraggableRegistration {
	element: HTMLElement;
	getInitialData: () => DragData;
	onDragStart?: () => void;
	onDrop?: () => void;
}
interface DropTargetRegistration {
	element: HTMLElement;
	canDrop: (args: { source: DragSource }) => boolean;
	getData: () => DragData;
	onDragEnter?: () => void;
	onDrop?: () => void;
}
interface MonitorRegistration {
	canMonitor?: (args: { source: DragSource }) => boolean;
	onDragStart?: (args: { source: DragSource; location: DragLocation }) => void;
	onDrop?: (args: { source: DragSource; location: DragLocation }) => void;
}
const mockDraggables: DraggableRegistration[] = [];
const mockDropTargets: DropTargetRegistration[] = [];
const mockMonitors: MonitorRegistration[] = [];
function mockRegister<T>(registrations: T[], registration: T) {
	registrations.push(registration);
	return () => {
		const index = registrations.indexOf(registration);
		registrations.splice(index, 1);
	};
}
jest.mock(
	'@atlaskit/pragmatic-drag-and-drop/element/adapter',
	() => ({
		draggable: (registration: DraggableRegistration) => mockRegister(mockDraggables, registration),
		dropTargetForElements: (registration: DropTargetRegistration) => mockRegister(mockDropTargets, registration),
		monitorForElements: (registration: MonitorRegistration) => mockRegister(mockMonitors, registration)
	}),
	{ virtual: true }
);
jest.mock(
	'@atlaskit/pragmatic-drag-and-drop/combine',
	() => ({
		combine:
			(...cleanups: Array<() => void>) =>
			() =>
				cleanups.forEach((cleanup) => cleanup())
	}),
	{ virtual: true }
);
jest.mock(
	'@atlaskit/pragmatic-drag-and-drop-auto-scroll/element',
	() => ({ autoScrollForElements: () => () => undefined }),
	{ virtual: true }
);

import { TeamTasksCalendarView } from './team-tasks-calendar';

const DONE = { id: 'done', name: 'done', isDone: true };
const OPEN = { id: 'open', name: 'open', isTodo: true };

const openTask = (id: string, title: string, dueDate?: string) => ({
	id,
	title,
	dueDate,
	status: 'open',
	taskStatusId: 'open'
});

interface CalendarOptions {
	selected?: string[];
	startWeekOn?: EWeekDays;
	/** The tasks of the active team, the ones that change day; none by default. */
	teamTaskIds?: string[];
}

function renderCalendar(tasks: Array<Record<string, unknown>>, options: CalendarOptions = {}) {
	const toggleSelected = jest.fn();
	const view = {
		groups: [{ key: 'all', tasks }],
		statuses: [OPEN, DONE],
		selectedIds: new Set<string>(options.selected ?? []),
		toggleSelected
	} as unknown as Parameters<typeof TeamTasksCalendarView>[0]['view'];
	const commands = {
		openTask: jest.fn(),
		openPicker: jest.fn(),
		openMenu: jest.fn(),
		createTaskInGroup: jest.fn()
	};
	const store = createStore();
	if (options.startWeekOn) {
		const organization = { startWeekOn: options.startWeekOn } as unknown as TOrganization;
		store.set(currentOrganizationState, organization);
	}
	const teamTaskIds = options.teamTaskIds ?? [];
	const teamTasks = tasks.filter((task) => teamTaskIds.includes(String(task.id)));
	store.set(teamTasksState, teamTasks as unknown as TTask[]);
	const { unmount } = render(
		<Provider store={store}>
			<TeamTasksCalendarView view={view} commands={commands} />
		</Provider>
	);
	return { commands, toggleSelected, unmount };
}

// The month is a grid from `sm` and the list of its busy days on a phone; `mockFitsMonthGrid` picks which one is drawn.
const monthGrid = (name: string) => screen.getByRole('grid', { name });
const dayCell = (grid: HTMLElement, name: string) => within(grid).getByRole('gridcell', { name });
const monthTitle = () => screen.getByRole('heading', { level: 2 }).textContent;

function weekdayNamesOf(grid: HTMLElement) {
	const headers = within(grid).getAllByRole('columnheader');
	return headers.map((header) => header.textContent);
}

/** The titles of the open tasks drawn in a day or in a list, in their order. */
function openTaskTitlesIn(container: HTMLElement) {
	const chips = within(container).getAllByRole('button', { name: /, open$/ });
	return chips.map((chip) => chip.getAttribute('title'));
}

const NO_DROP_TARGET: DragLocation = { current: { dropTargets: [] } };

function registrationOn<T extends { element: HTMLElement }>(registrations: T[], element: HTMLElement) {
	const registration = registrations.find((candidate) => candidate.element === element);
	if (!registration) {
		throw new Error('Nothing is registered on this element');
	}
	return registration;
}

function watches(monitor: MonitorRegistration, source: DragSource) {
	if (!monitor.canMonitor) {
		return true;
	}
	return monitor.canMonitor({ source });
}

/** Starts dragging an element as the library does: its data read, then its own start and the monitors'. */
function beginDrag(element: HTMLElement) {
	const draggable = registrationOn(mockDraggables, element);
	const source: DragSource = { element, data: draggable.getInitialData() };
	const monitors = mockMonitors.filter((monitor) => watches(monitor, source));
	act(() => {
		draggable.onDragStart?.();
		for (const monitor of monitors) {
			monitor.onDragStart?.({ source, location: NO_DROP_TARGET });
		}
	});
	return { draggable, source, monitors };
}

type Drag = ReturnType<typeof beginDrag>;

/** Whether a day takes the dragged task; the task enters a day that does. */
function enterDay(drag: Drag, day: HTMLElement) {
	const target = registrationOn(mockDropTargets, day);
	const accepts = target.canDrop({ source: drag.source });
	if (accepts) {
		act(() => target.onDragEnter?.());
	}
	return accepts;
}

/** Drops the dragged task on a day; on no drop target when the day refuses it. */
function dropOn(drag: Drag, day: HTMLElement) {
	const target = registrationOn(mockDropTargets, day);
	const accepts = target.canDrop({ source: drag.source });
	const dropTargets: DropTarget[] = [];
	if (accepts) {
		dropTargets.push({ element: day, data: target.getData() });
	}
	const location: DragLocation = { current: { dropTargets } };
	act(() => {
		if (accepts) {
			target.onDrop?.();
		}
		for (const monitor of drag.monitors) {
			monitor.onDrop?.({ source: drag.source, location });
		}
		drag.draggable.onDrop?.();
	});
}

function isDraggable(element: HTMLElement) {
	return mockDraggables.some((registration) => registration.element === element);
}

const november = (date: number) => dayNumberOf(new Date(2026, 10, date));

describe('TeamTasksCalendarView', () => {
	beforeAll(() => {
		jest.useFakeTimers();
		jest.setSystemTime(new Date(2026, 10, 12, 10, 0));
	});
	afterAll(() => jest.useRealTimers());
	afterEach(() => {
		mockFitsMonthGrid = true;
		mockHasFinePointer = true;
		mockMoveToDay.mockReset();
	});

	it('draws the month as the list of its busy days where seven columns do not fit, and never both', () => {
		mockFitsMonthGrid = false;
		const { commands } = renderCalendar([
			openTask('a', 'Ship the release', '2026-11-12'),
			openTask('b', 'Write the notes', '2026-11-20')
		]);

		expect(screen.queryByRole('grid')).toBeNull();
		const days = screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent);
		expect(days).toEqual(['Thursday, November 12', 'Friday, November 20']);

		fireEvent.click(screen.getByRole('button', { name: 'Write the notes, open' }));
		expect(commands.openTask).toHaveBeenCalledWith('b');
	});

	it('shows a task on the day it is due, and opens it on a click', () => {
		const { commands, toggleSelected } = renderCalendar([openTask('a', 'Ship the release', '2026-11-12')]);
		const today = dayCell(monthGrid('November 2026'), 'Thursday, November 12');
		const chip = within(today).getByRole('button', { name: 'Ship the release, open' });

		expect(chip.textContent).toContain('Ship the release');
		fireEvent.click(chip);

		expect(commands.openTask).toHaveBeenCalledTimes(1);
		expect(commands.openTask).toHaveBeenCalledWith('a');
		expect(toggleSelected).not.toHaveBeenCalled();
	});

	it('selects a task on a click with Ctrl or Cmd held, instead of opening it', () => {
		const { commands, toggleSelected } = renderCalendar(
			[openTask('a', 'Ship the release', '2026-11-12'), openTask('b', 'Write the notes', '2026-11-12')],
			{ selected: ['b'] }
		);
		const today = dayCell(monthGrid('November 2026'), 'Thursday, November 12');
		const chip = within(today).getByRole('button', { name: 'Ship the release, open' });
		const selectedChip = within(today).getByRole('button', { name: 'Write the notes, open' });

		fireEvent.click(chip, { ctrlKey: true });
		expect(toggleSelected).toHaveBeenLastCalledWith('a', false);
		fireEvent.click(chip, { metaKey: true });
		expect(toggleSelected).toHaveBeenCalledTimes(2);

		expect(commands.openTask).not.toHaveBeenCalled();
		expect(chip.getAttribute('data-selected')).toBe('false');
		expect(selectedChip.getAttribute('data-selected')).toBe('true');
	});

	it('shows three tasks of a day and counts the others in "+N more"', () => {
		renderCalendar([
			openTask('a', 'First', '2026-11-20'),
			openTask('b', 'Second', '2026-11-20'),
			openTask('c', 'Third', '2026-11-20'),
			openTask('d', 'Fourth', '2026-11-20'),
			openTask('e', 'Fifth', '2026-11-20'),
			openTask('f', 'One', '2026-11-21'),
			openTask('g', 'Two', '2026-11-21'),
			openTask('h', 'Three', '2026-11-21')
		]);
		const grid = monthGrid('November 2026');
		const fullDay = dayCell(grid, 'Friday, November 20');
		const dayOfThree = dayCell(grid, 'Saturday, November 21');

		expect(openTaskTitlesIn(fullDay)).toEqual(['First', 'Second', 'Third']);
		expect(within(fullDay).getByRole('button', { name: 'dashboard.calendar.MORE_ENTRIES(2)' })).toBeTruthy();
		expect(openTaskTitlesIn(dayOfThree)).toEqual(['One', 'Two', 'Three']);
		expect(within(dayOfThree).queryByRole('button', { name: /MORE_ENTRIES/ })).toBeNull();
	});

	it('lists every task of a full day behind "+N more", and closes that list when one of them opens', () => {
		const { commands, toggleSelected } = renderCalendar([
			openTask('a', 'First', '2026-11-20'),
			openTask('b', 'Second', '2026-11-20'),
			openTask('c', 'Third', '2026-11-20'),
			openTask('d', 'Fourth', '2026-11-20')
		]);
		const fullDay = dayCell(monthGrid('November 2026'), 'Friday, November 20');
		expect(within(fullDay).queryByRole('button', { name: 'Fourth, open' })).toBeNull();

		fireEvent.click(within(fullDay).getByRole('button', { name: 'dashboard.calendar.MORE_ENTRIES(1)' }));
		const dayList = screen.getByRole('dialog');
		const fourth = within(dayList).getByRole('button', { name: 'Fourth, open' });
		expect(openTaskTitlesIn(dayList)).toEqual(['First', 'Second', 'Third', 'Fourth']);
		expect(within(dayList).getByText('Friday, November 20')).toBeTruthy();

		// Selecting a task leaves the list open, for the next one.
		fireEvent.click(fourth, { ctrlKey: true });
		expect(toggleSelected).toHaveBeenCalledWith('d', false);
		expect(screen.getByRole('dialog')).toBeTruthy();

		fireEvent.click(fourth);
		expect(commands.openTask).toHaveBeenCalledTimes(1);
		expect(commands.openTask).toHaveBeenCalledWith('d');
		expect(screen.queryByRole('dialog')).toBeNull();
	});

	it('counts the tasks without a due date on a button, and lists them in a panel with the due date picker', () => {
		const { commands } = renderCalendar([
			openTask('a', 'Ship the release', '2026-11-12'),
			openTask('u1', 'Write the notes'),
			openTask('u2', 'Call the client')
		]);
		const noDueDate = screen.getByRole('button', { name: /^pages\.teamTasks\.CALENDAR_NO_DUE_DATE/ });

		expect(noDueDate.textContent).toBe('pages.teamTasks.CALENDAR_NO_DUE_DATE2');
		expect(noDueDate.getAttribute('aria-expanded')).toBe('false');
		expect(screen.queryByRole('complementary')).toBeNull();
		expect(screen.queryByText('Write the notes')).toBeNull();

		fireEvent.click(noDueDate);

		const panel = screen.getByRole('complementary', { name: 'pages.teamTasks.CALENDAR_NO_DUE_DATE' });
		const rows = within(panel).getAllByRole('listitem');
		const rowTitles = rows.map((row) => row.textContent);
		const setDueDate = within(rows[1]).getByRole('button', {
			name: 'Call the client, pages.teamTasks.SET_DUE_DATE'
		});
		expect(noDueDate.getAttribute('aria-expanded')).toBe('true');
		expect(noDueDate.getAttribute('aria-controls')).toBe(panel.id);
		expect(rowTitles).toEqual(['Write the notes', 'Call the client']);

		fireEvent.click(setDueDate);
		expect(commands.openPicker).toHaveBeenCalledTimes(1);
		expect(commands.openPicker).toHaveBeenCalledWith('dueDate', ['u2'], setDueDate);
		expect(commands.openTask).not.toHaveBeenCalled();

		fireEvent.click(within(rows[0]).getByRole('button', { name: 'Write the notes' }));
		expect(commands.openTask).toHaveBeenCalledWith('u1');

		fireEvent.click(noDueDate);
		expect(screen.queryByRole('complementary')).toBeNull();
	});

	it('selects a task without a due date on a click with Ctrl or Cmd held, and marks it', () => {
		const { commands, toggleSelected } = renderCalendar(
			[openTask('u1', 'Write the notes'), openTask('u2', 'Call the client')],
			{ selected: ['u2'] }
		);
		fireEvent.click(screen.getByRole('button', { name: /^pages\.teamTasks\.CALENDAR_NO_DUE_DATE/ }));
		const notes = screen.getByRole('button', { name: 'Write the notes' });
		const client = screen.getByRole('button', { name: 'Call the client' });

		expect(notes.getAttribute('data-selected')).toBe('false');
		expect(client.getAttribute('data-selected')).toBe('true');

		fireEvent.click(notes, { ctrlKey: true });
		fireEvent.click(client, { metaKey: true });

		expect(toggleSelected.mock.calls).toEqual([
			['u1', false],
			['u2', false]
		]);
		expect(commands.openTask).not.toHaveBeenCalled();
	});

	it('offers no panel when every task has a due date', () => {
		renderCalendar([openTask('a', 'Ship the release', '2026-11-12')]);

		expect(screen.queryByRole('button', { name: /CALENDAR_NO_DUE_DATE/ })).toBeNull();
	});

	it('moves to the next and the previous month, and back to the month of today', () => {
		renderCalendar([openTask('a', 'Ship the release', '2026-11-12'), openTask('b', 'Plan the year', '2026-12-15')]);
		expect(monthTitle()).toBe('November 2026');

		fireEvent.click(screen.getByRole('button', { name: 'dashboard.calendar.NEXT(month)' }));
		expect(monthTitle()).toBe('December 2026');
		const december15 = dayCell(monthGrid('December 2026'), 'Tuesday, December 15');
		expect(within(december15).getByRole('button', { name: 'Plan the year, open' })).toBeTruthy();

		fireEvent.click(screen.getByRole('button', { name: 'dashboard.calendar.PREVIOUS(month)' }));
		fireEvent.click(screen.getByRole('button', { name: 'dashboard.calendar.PREVIOUS(month)' }));
		expect(monthTitle()).toBe('October 2026');

		fireEvent.click(screen.getByRole('button', { name: 'common.TODAY' }));
		expect(monthTitle()).toBe('November 2026');
		expect(monthGrid('November 2026')).toBeTruthy();
	});

	it('counts the tasks due in the month shown, and says so when none is', () => {
		renderCalendar([
			openTask('a', 'Ship the release', '2026-11-12'),
			openTask('b', 'Write the notes', '2026-11-20'),
			// Shown in the last week of the November grid, counted in December.
			openTask('c', 'Plan the year', '2026-12-03')
		]);
		expect(screen.getByText('pages.teamTasks.CALENDAR_DUE_COUNT(2)')).toBeTruthy();

		fireEvent.click(screen.getByRole('button', { name: 'dashboard.calendar.NEXT(month)' }));
		expect(screen.getByText('pages.teamTasks.CALENDAR_DUE_COUNT(1)')).toBeTruthy();

		fireEvent.click(screen.getByRole('button', { name: 'dashboard.calendar.NEXT(month)' }));
		expect(screen.getByText('pages.teamTasks.CALENDAR_EMPTY_MONTH(January 2027)')).toBeTruthy();
		expect(screen.queryByText(/CALENDAR_DUE_COUNT/)).toBeNull();
	});

	it('says an empty month is empty', () => {
		renderCalendar([]);

		expect(screen.getByText('pages.teamTasks.CALENDAR_EMPTY_MONTH(November 2026)')).toBeTruthy();
		expect(within(monthGrid('November 2026')).queryAllByRole('button')).toHaveLength(0);
	});

	it('starts the weeks on Monday, or on the first day of the week of the organisation', () => {
		const { unmount } = renderCalendar([]);
		const fromMonday = monthGrid('November 2026');
		const daysFromMonday = within(fromMonday).getAllByRole('gridcell');
		expect(weekdayNamesOf(fromMonday)).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
		expect(daysFromMonday).toHaveLength(42);
		expect(daysFromMonday[0].getAttribute('aria-label')).toBe('Monday, October 26');
		unmount();

		renderCalendar([], { startWeekOn: EWeekDays.SUNDAY });
		const fromSunday = monthGrid('November 2026');
		const daysFromSunday = within(fromSunday).getAllByRole('gridcell');
		expect(weekdayNamesOf(fromSunday)).toEqual(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
		expect(daysFromSunday[0].getAttribute('aria-label')).toBe('Sunday, November 1');
	});

	it('says overdue for an open task due before today, never for a done one', () => {
		renderCalendar([
			openTask('late', 'Old bug', '2026-11-02'),
			{ id: 'closed', title: 'Done long ago', dueDate: '2026-11-02', status: 'done', taskStatusId: 'done' }
		]);
		const november2 = dayCell(monthGrid('November 2026'), 'Monday, November 2');

		expect(
			within(november2).getByRole('button', { name: 'Old bug, open, pages.teamTasks.TIMELINE_OVERDUE' })
		).toBeTruthy();
		expect(within(november2).getByRole('button', { name: 'Done long ago, done' })).toBeTruthy();
	});

	describe('a task dragged to another day', () => {
		it('moves there when dropped, the day marked while the task is over it and the task dimmed', () => {
			renderCalendar([openTask('a', 'Ship the release', '2026-11-12')], { teamTaskIds: ['a'] });
			const grid = monthGrid('November 2026');
			const chip = within(dayCell(grid, 'Thursday, November 12')).getByRole('button', {
				name: 'Ship the release, open'
			});
			const november17 = dayCell(grid, 'Tuesday, November 17');

			const drag = beginDrag(chip);
			expect(chip.className).toContain('opacity-40');
			expect(enterDay(drag, november17)).toBe(true);
			expect(november17.getAttribute('data-drop-target')).toBe('true');
			dropOn(drag, november17);

			expect(mockMoveToDay).toHaveBeenCalledTimes(1);
			expect(mockMoveToDay).toHaveBeenCalledWith('a', november(17));
			expect(november17.getAttribute('data-drop-target')).toBe('false');
			expect(chip.className).not.toContain('opacity-40');
		});

		it('stays where it is when dropped back on the day it is due', () => {
			renderCalendar([openTask('a', 'Ship the release', '2026-11-12')], { teamTaskIds: ['a'] });
			const november12 = dayCell(monthGrid('November 2026'), 'Thursday, November 12');
			const chip = within(november12).getByRole('button', { name: 'Ship the release, open' });

			const drag = beginDrag(chip);
			expect(enterDay(drag, november12)).toBe(false);
			dropOn(drag, november12);

			expect(november12.getAttribute('data-drop-target')).toBe('false');
			expect(mockMoveToDay).not.toHaveBeenCalled();
		});

		it('says it can be dragged, and only for a task of the active team', () => {
			renderCalendar(
				[openTask('a', 'Ship the release', '2026-11-12'), openTask('o', 'Their release', '2026-11-12')],
				{ teamTaskIds: ['a'] }
			);
			const november12 = dayCell(monthGrid('November 2026'), 'Thursday, November 12');
			const ours = within(november12).getByRole('button', { name: 'Ship the release, open' });
			const theirs = within(november12).getByRole('button', { name: 'Their release, open' });

			expect(isDraggable(ours)).toBe(true);
			expect(ours.getAttribute('title')).toBe('Ship the release\npages.teamTasks.CALENDAR_DRAG_HINT');
			expect(isDraggable(theirs)).toBe(false);
			expect(theirs.getAttribute('title')).toBe('Their release');
		});

		it('is never dragged on the phone list of days, nor with a touch screen', () => {
			mockFitsMonthGrid = false;
			const { unmount } = renderCalendar([openTask('a', 'Ship the release', '2026-11-12')], {
				teamTaskIds: ['a']
			});
			expect(mockDraggables).toHaveLength(0);
			expect(mockDropTargets).toHaveLength(0);
			expect(mockMonitors).toHaveLength(0);
			unmount();

			mockFitsMonthGrid = true;
			mockHasFinePointer = false;
			renderCalendar([openTask('a', 'Ship the release', '2026-11-12')], { teamTaskIds: ['a'] });
			const chip = screen.getByRole('button', { name: 'Ship the release, open' });
			expect(isDraggable(chip)).toBe(false);
			expect(chip.getAttribute('title')).toBe('Ship the release');
			expect(mockDropTargets).toHaveLength(0);
		});

		it('gets a due date from the day a task of the panel is dropped on, never a day before it starts', () => {
			renderCalendar(
				[openTask('u1', 'Write the notes'), { ...openTask('u2', 'Call the client'), startDate: '2026-11-18' }],
				{ teamTaskIds: ['u1', 'u2'] }
			);
			fireEvent.click(screen.getByRole('button', { name: /^pages\.teamTasks\.CALENDAR_NO_DUE_DATE/ }));
			const panel = screen.getByRole('complementary', { name: 'pages.teamTasks.CALENDAR_NO_DUE_DATE' });
			const grid = monthGrid('November 2026');
			const notes = within(panel).getByRole('button', { name: 'Write the notes' });
			const client = within(panel).getByRole('button', { name: 'Call the client' });

			expect(within(panel).getByText('pages.teamTasks.CALENDAR_UNDATED_DRAG_HINT')).toBeTruthy();
			const notesDrag = beginDrag(notes);
			expect(notes.closest('li')?.className).toContain('opacity-40');
			dropOn(notesDrag, dayCell(grid, 'Friday, November 20'));
			expect(mockMoveToDay).toHaveBeenCalledWith('u1', november(20));

			const clientDrag = beginDrag(client);
			expect(enterDay(clientDrag, dayCell(grid, 'Tuesday, November 17'))).toBe(false);
			expect(enterDay(clientDrag, dayCell(grid, 'Wednesday, November 18'))).toBe(true);
			dropOn(clientDrag, dayCell(grid, 'Tuesday, November 17'));
			expect(mockMoveToDay).toHaveBeenCalledTimes(1);
		});

		it('leaves the month free under "+N more" while a task is dragged out of it, and closes it on the drop', () => {
			renderCalendar(
				[
					openTask('a', 'First', '2026-11-20'),
					openTask('b', 'Second', '2026-11-20'),
					openTask('c', 'Third', '2026-11-20'),
					openTask('d', 'Fourth', '2026-11-20')
				],
				{ teamTaskIds: ['a', 'b', 'c', 'd'] }
			);
			const grid = monthGrid('November 2026');
			fireEvent.click(
				within(dayCell(grid, 'Friday, November 20')).getByRole('button', {
					name: 'dashboard.calendar.MORE_ENTRIES(1)'
				})
			);
			const dayList = screen.getByRole('dialog');
			const fourth = within(dayList).getByRole('button', { name: 'Fourth, open' });

			const drag = beginDrag(fourth);
			const placement = dayList.closest('[data-slot="popover-positioner"]');
			expect(dayList.className).toContain('opacity-0');
			expect(dayList.className).toContain('pointer-events-none');
			expect(placement?.className).toContain('pointer-events-none');
			dropOn(drag, dayCell(grid, 'Monday, November 23'));

			expect(mockMoveToDay).toHaveBeenCalledWith('d', november(23));
			expect(screen.queryByRole('dialog')).toBeNull();
		});
	});
});
