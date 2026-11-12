/** @jest-environment jsdom */

import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';

const mockMoveDates = jest.fn();
// The active team's tasks: every task of these tests but `other`.
jest.mock('jotai', () => ({
	useAtomValue: () => [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }, { id: 'due' }]
}));
jest.mock('@/core/stores', () => ({ tasksByTeamState: 'team-tasks' }));
jest.mock('@/core/hooks/tasks/use-team-task-updates', () => ({
	useTeamTaskUpdates: () => ({ moveDates: mockMoveDates })
}));
jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: Record<string, unknown>) =>
		values ? `${key}(${Object.values(values).join(',')})` : key,
	useLocale: () => 'en'
}));
// A mouse hovers by default; a touch screen does not.
let mockCanHover = true;
jest.mock('@/core/hooks/common/use-media-query', () => ({ useMediaQuery: () => mockCanHover }));
// An hour and a quarter worked on every task, read by a bar's card.
jest.mock('@/core/hooks/tasks/use-task-worked-seconds', () => ({ useTaskWorkedSeconds: () => 4500 }));

import { TeamTasksTimelineView } from './team-tasks-timeline';

// jsdom has no PointerEvent: without one, a fired pointer event carries no button, position or pointer id.
if (typeof window.PointerEvent === 'undefined') {
	class PointerEventOfTests extends MouseEvent {
		readonly pointerId: number;
		constructor(type: string, init: PointerEventInit = {}) {
			super(type, init);
			this.pointerId = init.pointerId ?? 0;
		}
	}
	(window as unknown as { PointerEvent: typeof PointerEventOfTests }).PointerEvent = PointerEventOfTests;
}

const DONE = { id: 'done', name: 'done', isDone: true };
const OPEN = { id: 'open', name: 'open', isTodo: true };
const IN_PROGRESS = { id: 'doing', name: 'in-progress', isInProgress: true, color: '#f97316' };

function renderTimeline(tasks: Array<Record<string, unknown>>) {
	const view = {
		groups: [{ key: 'all', tasks }],
		statuses: [OPEN, IN_PROGRESS, DONE]
	} as unknown as Parameters<typeof TeamTasksTimelineView>[0]['view'];
	const commands = {
		openTask: jest.fn(),
		openPicker: jest.fn(),
		openMenu: jest.fn(),
		createTaskInGroup: jest.fn()
	};
	render(<TeamTasksTimelineView view={view} commands={commands} />);
	return { commands };
}

describe('TeamTasksTimelineView', () => {
	beforeAll(() => {
		jest.useFakeTimers();
		jest.setSystemTime(new Date(2026, 10, 12, 10, 0));
	});
	afterAll(() => jest.useRealTimers());
	afterEach(() => {
		mockCanHover = true;
	});

	it('draws a bar per dated task, lists the undated ones apart, and opens a task from either', () => {
		const { commands } = renderTimeline([
			{
				id: 'a',
				title: 'Ship the release',
				number: 12,
				startDate: '2026-11-10',
				dueDate: '2026-11-14',
				status: 'open',
				taskStatusId: 'open'
			},
			{ id: 'b', title: 'Write the notes', status: 'open', taskStatusId: 'open' },
			{ id: 'c', title: 'Old bug', dueDate: '2026-11-01', status: 'open', taskStatusId: 'open' }
		]);

		expect(screen.getByTestId('timeline-bar-a').getAttribute('aria-label')).toBe(
			'Ship the release · pages.teamTasks.TIMELINE_RANGE(Nov 10,Nov 14)'
		);
		// Due before today and open: overdue, and said so.
		expect(screen.getByTestId('timeline-bar-c').getAttribute('aria-label')).toContain(
			'pages.teamTasks.TIMELINE_OVERDUE'
		);
		expect(screen.getByTestId('timeline-today')).toBeTruthy();

		const unscheduled = screen.getByTestId('timeline-unscheduled');
		expect(unscheduled.textContent).toContain('pages.teamTasks.TIMELINE_UNSCHEDULED(1)');
		expect(unscheduled.textContent).toContain('Write the notes');

		fireEvent.click(screen.getByTestId('timeline-bar-a'));
		fireEvent.click(screen.getByText('Write the notes'));
		expect(commands.openTask).toHaveBeenNthCalledWith(1, 'a');
		expect(commands.openTask).toHaveBeenNthCalledWith(2, 'b');
	});

	it('never marks a done task overdue, and switches the zoom', () => {
		renderTimeline([
			{ id: 'd', title: 'Done long ago', dueDate: '2026-10-01', status: 'done', taskStatusId: 'done' }
		]);

		expect(screen.getByTestId('timeline-bar-d').getAttribute('aria-label')).not.toContain('TIMELINE_OVERDUE');
		const zoom = screen.getByRole('tablist', { name: 'pages.teamTasks.TIMELINE_ZOOM' });
		const months = within(zoom).getByRole('tab', { name: 'pages.teamTasks.TIMELINE_ZOOM_MONTHS' });
		expect(months.getAttribute('aria-selected')).toBe('false');
		fireEvent.click(months);
		expect(months.getAttribute('aria-selected')).toBe('true');
	});

	it('moves a task of the team by a day with Alt + arrows, and its due date with Alt + Shift + arrows', () => {
		mockMoveDates.mockClear();
		renderTimeline([
			{
				id: 'a',
				title: 'Ship',
				startDate: '2026-11-10',
				dueDate: '2026-11-14',
				status: 'open',
				taskStatusId: 'open'
			}
		]);
		const bar = screen.getByTestId('timeline-bar-a');

		fireEvent.keyDown(bar, { key: 'ArrowRight', altKey: true });
		expect(mockMoveDates).toHaveBeenLastCalledWith('a', 'move', 1);
		fireEvent.keyDown(bar, { key: 'ArrowLeft', altKey: true, shiftKey: true });
		expect(mockMoveDates).toHaveBeenLastCalledWith('a', 'end', -1);
		// Without Alt the arrows are the page's.
		fireEvent.keyDown(bar, { key: 'ArrowRight' });
		expect(mockMoveDates).toHaveBeenCalledTimes(2);
	});

	it('moves a due-only task with Alt + Shift + arrows too, and rounds half days alike both ways', () => {
		mockMoveDates.mockClear();
		renderTimeline([{ id: 'due', title: 'Due only', dueDate: '2026-11-20', status: 'open', taskStatusId: 'open' }]);
		const bar = screen.getByTestId('timeline-bar-due');

		fireEvent.keyDown(bar, { key: 'ArrowLeft', altKey: true, shiftKey: true });
		expect(mockMoveDates).toHaveBeenLastCalledWith('due', 'move', -1);

		// Weeks zoom, 36 px a day: 18 px is half a day, one day either way.
		fireEvent.pointerDown(bar, { button: 0, clientX: 100, pointerId: 7 });
		fireEvent.pointerMove(bar, { clientX: 82, pointerId: 7 });
		fireEvent.pointerUp(bar, { clientX: 82, pointerId: 7 });
		expect(mockMoveDates).toHaveBeenCalledTimes(2);
		expect(mockMoveDates).toHaveBeenLastCalledWith('due', 'move', -1);
		fireEvent.pointerDown(bar, { button: 0, clientX: 100, pointerId: 8 });
		fireEvent.pointerMove(bar, { clientX: 118, pointerId: 8 });
		fireEvent.pointerUp(bar, { clientX: 118, pointerId: 8 });
		expect(mockMoveDates).toHaveBeenCalledTimes(3);
		expect(mockMoveDates).toHaveBeenLastCalledWith('due', 'move', 1);
	});

	it('moves a held bar by the calendar scrolled under it, even without a pointer move', () => {
		mockMoveDates.mockClear();
		const { commands } = renderTimeline([
			{ id: 'due', title: 'Due only', dueDate: '2026-11-20', status: 'open', taskStatusId: 'open' }
		]);
		const bar = screen.getByTestId('timeline-bar-due');
		const calendar = bar.closest('.overflow-auto') as HTMLElement;

		fireEvent.pointerDown(bar, { button: 0, clientX: 100, pointerId: 9 });
		// Two days of scrolling under the held bar (36 px a day in the weeks zoom).
		calendar.scrollLeft += 72;
		fireEvent.scroll(calendar);
		fireEvent.pointerUp(bar, { clientX: 100, pointerId: 9 });
		fireEvent.click(bar);

		expect(mockMoveDates).toHaveBeenCalledWith('due', 'move', 2);
		expect(commands.openTask).not.toHaveBeenCalled();
	});

	it('keeps the first pointer as the owner of a press: a second touch on the bar changes nothing', () => {
		mockMoveDates.mockClear();
		renderTimeline([{ id: 'due', title: 'Due only', dueDate: '2026-11-20', status: 'open', taskStatusId: 'open' }]);
		const bar = screen.getByTestId('timeline-bar-due');

		fireEvent.pointerDown(bar, { button: 0, clientX: 100, pointerId: 1 });
		fireEvent.pointerDown(bar, { button: 0, clientX: 300, pointerId: 2 });
		fireEvent.pointerCancel(bar, { pointerId: 2 });
		fireEvent.pointerMove(bar, { clientX: 172, pointerId: 1 });
		fireEvent.pointerUp(bar, { clientX: 400, pointerId: 2 });
		expect(mockMoveDates).not.toHaveBeenCalled();
		// Weeks zoom, 36 px a day: the first pointer's 72 px are two days.
		fireEvent.pointerUp(bar, { clientX: 172, pointerId: 1 });
		expect(mockMoveDates).toHaveBeenCalledTimes(1);
		expect(mockMoveDates).toHaveBeenLastCalledWith('due', 'move', 2);
	});

	it('opens the task on the next tap or key even when a drag was followed by no click', () => {
		mockMoveDates.mockClear();
		const { commands } = renderTimeline([
			{ id: 'due', title: 'Due only', dueDate: '2026-11-20', status: 'open', taskStatusId: 'open' }
		]);
		const bar = screen.getByTestId('timeline-bar-due');
		const dragWithoutClick = (pointerId: number) => {
			fireEvent.pointerDown(bar, { button: 0, clientX: 100, pointerId });
			fireEvent.pointerMove(bar, { clientX: 136, pointerId });
			fireEvent.pointerUp(bar, { clientX: 136, pointerId });
		};

		dragWithoutClick(1);
		fireEvent.pointerDown(bar, { button: 0, clientX: 100, pointerId: 2 });
		fireEvent.pointerUp(bar, { clientX: 100, pointerId: 2 });
		fireEvent.click(bar);
		expect(commands.openTask).toHaveBeenCalledTimes(1);

		dragWithoutClick(3);
		fireEvent.keyDown(bar, { key: 'Enter' });
		fireEvent.click(bar);
		expect(commands.openTask).toHaveBeenCalledTimes(2);
		expect(mockMoveDates).toHaveBeenCalledTimes(2);
	});

	it('shows end handles only on a range of several days, so a one-day range moves as a whole', () => {
		renderTimeline([
			{
				id: 'a',
				title: 'Range',
				startDate: '2026-11-10',
				dueDate: '2026-11-14',
				status: 'open',
				taskStatusId: 'open'
			},
			{
				id: 'b',
				title: 'One day',
				startDate: '2026-11-11',
				dueDate: '2026-11-11',
				status: 'open',
				taskStatusId: 'open'
			}
		]);
		expect(screen.getByTestId('timeline-bar-a').querySelectorAll('[data-handle]')).toHaveLength(2);
		expect(screen.getByTestId('timeline-bar-b').querySelectorAll('[data-handle]')).toHaveLength(0);
	});

	it('drags a bar by whole days, and a drag does not open the task', () => {
		mockMoveDates.mockClear();
		const { commands } = renderTimeline([
			{ id: 'due', title: 'Due only', dueDate: '2026-11-20', status: 'open', taskStatusId: 'open' }
		]);
		const bar = screen.getByTestId('timeline-bar-due');

		// Weeks zoom: 36 px a day; 80 px is two days.
		fireEvent.pointerDown(bar, { button: 0, clientX: 100, pointerId: 1 });
		fireEvent.pointerMove(bar, { clientX: 180, pointerId: 1 });
		fireEvent.pointerUp(bar, { clientX: 180, pointerId: 1 });
		fireEvent.click(bar);

		expect(mockMoveDates).toHaveBeenCalledWith('due', 'move', 2);
		expect(commands.openTask).not.toHaveBeenCalled();

		// A press without movement is a click.
		fireEvent.pointerDown(bar, { button: 0, clientX: 100, pointerId: 2 });
		fireEvent.pointerUp(bar, { clientX: 101, pointerId: 2 });
		fireEvent.click(bar);
		expect(commands.openTask).toHaveBeenCalledWith('due');
		expect(mockMoveDates).toHaveBeenCalledTimes(1);
	});

	it('leaves the dates of another team’s task alone: its bar only opens it', () => {
		mockMoveDates.mockClear();
		renderTimeline([
			{
				id: 'other',
				title: 'Elsewhere',
				startDate: '2026-11-10',
				dueDate: '2026-11-12',
				status: 'open',
				taskStatusId: 'open'
			}
		]);
		const bar = screen.getByTestId('timeline-bar-other');

		fireEvent.keyDown(bar, { key: 'ArrowRight', altKey: true });
		fireEvent.pointerDown(bar, { button: 0, clientX: 100, pointerId: 3 });
		fireEvent.pointerMove(bar, { clientX: 200, pointerId: 3 });
		fireEvent.pointerUp(bar, { clientX: 200, pointerId: 3 });

		expect(mockMoveDates).not.toHaveBeenCalled();
		expect(bar.getAttribute('aria-keyshortcuts')).toBeNull();
	});

	it('gives a title the full label, and keeps a task dated far outside the calendar with a marker at that edge', () => {
		const { commands } = renderTimeline([
			{
				id: 'a',
				title: 'Ship',
				startDate: '2026-11-10',
				dueDate: '2026-11-14',
				status: 'open',
				taskStatusId: 'open'
			},
			{ id: 'old', title: 'Ancient', dueDate: '2019-01-01', status: 'open', taskStatusId: 'open' },
			{
				id: 'span',
				title: 'Decade',
				startDate: '2020-01-01',
				dueDate: '2031-01-01',
				status: 'open',
				taskStatusId: 'open'
			}
		]);

		// The title and the bar both carry the full label.
		expect(
			screen.getAllByRole('button', { name: 'Ship · pages.teamTasks.TIMELINE_RANGE(Nov 10,Nov 14)' })
		).toHaveLength(2);
		// Far outside the capped calendar: no bar, a marker that opens the task, its own date in the label.
		const marker = screen.getByTestId('timeline-outside-old');
		expect(marker.getAttribute('aria-label')).toBe(
			'Ancient · Jan 1, 2019 · pages.teamTasks.TIMELINE_DUE_ONLY · pages.teamTasks.TIMELINE_OVERDUE'
		);
		// The title says which way the dates are, the marker being far from the days in view.
		expect(screen.getByTestId('timeline-title-before-old')).toBeTruthy();
		fireEvent.click(marker);
		expect(commands.openTask).toHaveBeenCalledWith('old');
		// A long task cut at the edges is labelled with its own dates, not the calendar's.
		expect(screen.getByTestId('timeline-bar-span').getAttribute('aria-label')).toContain(
			'TIMELINE_RANGE(Jan 1, 2020,Jan 1, 2031)'
		);
	});

	it('says so when the view has no tasks', () => {
		renderTimeline([]);
		expect(screen.getByText('pages.teamTasks.TIMELINE_EMPTY')).toBeTruthy();
	});

	describe('a bar and its card', () => {
		const ranged = {
			id: 'a',
			title: 'Ship the release',
			startDate: '2026-11-02',
			dueDate: '2026-11-14',
			status: 'in-progress',
			taskStatusId: 'doing',
			priority: 'high',
			estimate: 18000,
			members: [
				{ id: 'm1', fullName: 'Ada Lovelace' },
				{ id: 'm2', fullName: 'Alan Turing' }
			]
		};

		/** Hovers a bar the way a mouse does, then waits out the card's delay. */
		function hover(bar: HTMLElement) {
			fireEvent.pointerEnter(bar, { pointerType: 'mouse' });
			fireEvent.mouseEnter(bar);
			fireEvent.mouseMove(bar);
			act(() => {
				jest.advanceTimersByTime(800);
			});
		}

		it('takes the colour of its status, and holds the faces of its people', () => {
			renderTimeline([
				ranged,
				{ id: 'b', title: 'Plain', dueDate: '2026-11-20', status: 'open', taskStatusId: 'open' }
			]);
			const bar = screen.getByTestId('timeline-bar-a');
			const plain = screen.getByTestId('timeline-bar-b');

			const tone = bar.style.getPropertyValue('--entry');
			expect(tone).not.toBe('');
			expect(tone).not.toBe(plain.style.getPropertyValue('--entry'));
			expect(bar.textContent).toContain('Ship the release');
			// Two faces, the initials of the people on the task, at the end of the bar.
			expect(bar.textContent).toContain('AL');
			expect(bar.textContent).toContain('AT');
			// Its label stays what it was: title and dates.
			expect(bar.getAttribute('aria-label')).toBe(
				'Ship the release · pages.teamTasks.TIMELINE_RANGE(Nov 2,Nov 14)'
			);
		});

		it('shows a card with the status, priority, dates, people and time worked when hovered', () => {
			renderTimeline([ranged]);
			const bar = screen.getByTestId('timeline-bar-a');
			expect(screen.queryByTestId('timeline-card-a')).toBeNull();

			hover(bar);

			const card = screen.getByTestId('timeline-card-a');
			expect(card.textContent).toContain('in progress');
			expect(card.textContent).toContain('high');
			expect(card.textContent).toContain('pages.teamTasks.TIMELINE_RANGE(Nov 2,Nov 14)');
			expect(within(card).getByTestId('timeline-card-people').textContent).toContain('Ada Lovelace');
			expect(within(card).getByTestId('timeline-card-people').textContent).toContain('Alan Turing');
			// 1 h 15 worked of a 5 h estimate.
			expect(card.textContent).toContain('1h 15m / 5h 0m');
			expect(card.textContent).toContain('pages.teamTasks.TIMELINE_DRAG_HINT');
		});

		it('hides its card while it is pressed', () => {
			renderTimeline([ranged]);
			const bar = screen.getByTestId('timeline-bar-a');
			hover(bar);
			expect(screen.getByTestId('timeline-card-a')).toBeTruthy();

			fireEvent.pointerDown(bar, { button: 0, clientX: 100, pointerId: 4 });
			expect(screen.queryByTestId('timeline-card-a')).toBeNull();
			fireEvent.pointerUp(bar, { clientX: 100, pointerId: 4 });
		});

		it('keeps its card closed after a click or a drag, until the pointer leaves the bar', () => {
			renderTimeline([ranged]);
			const bar = screen.getByTestId('timeline-bar-a');

			fireEvent.pointerDown(bar, { button: 0, clientX: 100, pointerId: 5 });
			fireEvent.pointerUp(bar, { clientX: 100, pointerId: 5 });
			hover(bar);
			expect(screen.queryByTestId('timeline-card-a')).toBeNull();

			fireEvent.pointerLeave(bar);
			hover(bar);
			expect(screen.getByTestId('timeline-card-a')).toBeTruthy();
		});

		it('opens no card on a focus, the drawer giving the focus back on Escape included', () => {
			renderTimeline([ranged]);
			const bar = screen.getByTestId('timeline-bar-a');

			act(() => bar.focus());
			fireEvent.focus(bar);
			act(() => {
				jest.advanceTimersByTime(800);
			});

			expect(screen.queryByTestId('timeline-card-a')).toBeNull();
		});

		it('never shows a card where nothing hovers', () => {
			mockCanHover = false;
			renderTimeline([ranged]);

			hover(screen.getByTestId('timeline-bar-a'));

			expect(screen.queryByTestId('timeline-card-a')).toBeNull();
		});
	});

	it('marks today in the header and the weekends in the weeks zoom only', () => {
		renderTimeline([{ id: 'a', title: 'Ship', dueDate: '2026-11-20', status: 'open', taskStatusId: 'open' }]);
		const today = document.querySelector('[data-today="true"]');

		expect(today?.textContent).toBe('12');
		expect(screen.getAllByTestId('timeline-weekend').length).toBeGreaterThan(0);

		fireEvent.click(screen.getByRole('tab', { name: 'pages.teamTasks.TIMELINE_ZOOM_MONTHS' }));
		expect(screen.queryAllByTestId('timeline-weekend')).toHaveLength(0);
		expect(screen.getByTestId('timeline-today')).toBeTruthy();
	});

	it('brings the calendar back to today', () => {
		renderTimeline([{ id: 'a', title: 'Ship', dueDate: '2026-11-20', status: 'open', taskStatusId: 'open' }]);
		const calendar = screen.getByTestId('timeline-bar-a').closest('.overflow-auto') as HTMLElement;
		const scrollTo = jest.fn();
		calendar.scrollTo = scrollTo;
		const openedAt = calendar.scrollLeft;
		calendar.scrollLeft = 0;

		fireEvent.click(screen.getByRole('button', { name: 'common.TODAY' }));

		expect(scrollTo).toHaveBeenCalledWith({ left: openedAt, behavior: 'smooth' });
	});
});
