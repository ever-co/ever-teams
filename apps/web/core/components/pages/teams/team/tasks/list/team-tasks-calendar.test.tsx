/** @jest-environment jsdom */

import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import { currentOrganizationState } from '@/core/stores/user/user-organizations';
import { EWeekDays } from '@/core/types/generics/enums/date';
import type { TOrganization } from '@/core/types/schemas/organization/organization.schema';

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: Record<string, unknown>) =>
		values ? `${key}(${Object.values(values).join(',')})` : key,
	useLocale: () => 'en'
}));
// The owner hook asks the server for the organisation; the calendar only reads the atom it fills.
jest.mock('@/core/hooks/bootstrap/use-feature-data', () => ({ useCurrentOrganizationOwner: jest.fn() }));
let mockFitsMonthGrid = true;
jest.mock('@/core/hooks/common/use-media-query', () => ({ useMediaQuery: () => mockFitsMonthGrid }));

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

describe('TeamTasksCalendarView', () => {
	beforeAll(() => {
		jest.useFakeTimers();
		jest.setSystemTime(new Date(2026, 10, 12, 10, 0));
	});
	afterAll(() => jest.useRealTimers());
	afterEach(() => {
		mockFitsMonthGrid = true;
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
		const setDueDate = within(rows[1]).getByRole('button', { name: 'pages.teamTasks.SET_DUE_DATE' });
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
});
