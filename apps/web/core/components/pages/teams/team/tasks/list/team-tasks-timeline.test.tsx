/** @jest-environment jsdom */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

const mockSetDates = jest.fn();
// The active team's tasks: every task of these tests but `other`.
jest.mock('jotai', () => ({
	useAtomValue: () => [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }, { id: 'due' }]
}));
jest.mock('@/core/stores', () => ({ tasksByTeamState: 'team-tasks' }));
jest.mock('@/core/hooks/tasks/use-team-task-updates', () => ({
	useTeamTaskUpdates: () => ({ setDates: mockSetDates })
}));
jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: Record<string, unknown>) =>
		values ? `${key}(${Object.values(values).join(',')})` : key,
	useLocale: () => 'en'
}));

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

function renderTimeline(tasks: Array<Record<string, unknown>>) {
	const view = {
		groups: [{ key: 'all', tasks }],
		statuses: [OPEN, DONE]
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

	it('draws a bar per dated task, lists the undated ones apart, and opens a task from either', () => {
		const { commands } = renderTimeline([
			{ id: 'a', title: 'Ship the release', number: 12, startDate: '2026-11-10', dueDate: '2026-11-14', status: 'open', taskStatusId: 'open' },
			{ id: 'b', title: 'Write the notes', status: 'open', taskStatusId: 'open' },
			{ id: 'c', title: 'Old bug', dueDate: '2026-11-01', status: 'open', taskStatusId: 'open' }
		]);

		expect(screen.getByTestId('timeline-bar-a').getAttribute('aria-label')).toBe(
			'Ship the release · pages.teamTasks.TIMELINE_RANGE(Nov 10,Nov 14)'
		);
		// Due before today and open: overdue, and said so.
		expect(screen.getByTestId('timeline-bar-c').getAttribute('aria-label')).toContain('pages.teamTasks.TIMELINE_OVERDUE');
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
		renderTimeline([{ id: 'd', title: 'Done long ago', dueDate: '2026-10-01', status: 'done', taskStatusId: 'done' }]);

		expect(screen.getByTestId('timeline-bar-d').getAttribute('aria-label')).not.toContain('TIMELINE_OVERDUE');
		const months = screen.getByText('pages.teamTasks.TIMELINE_ZOOM_MONTHS');
		expect(months.getAttribute('aria-pressed')).toBe('false');
		fireEvent.click(months);
		expect(months.getAttribute('aria-pressed')).toBe('true');
	});

	it('moves a task of the team by a day with Alt + arrows, and its due date with Alt + Shift + arrows', () => {
		mockSetDates.mockClear();
		renderTimeline([
			{ id: 'a', title: 'Ship', startDate: '2026-11-10', dueDate: '2026-11-14', status: 'open', taskStatusId: 'open' }
		]);
		const bar = screen.getByTestId('timeline-bar-a');

		fireEvent.keyDown(bar, { key: 'ArrowRight', altKey: true });
		expect(mockSetDates).toHaveBeenLastCalledWith('a', {
			startDate: new Date(2026, 10, 11),
			dueDate: new Date(2026, 10, 15)
		});
		fireEvent.keyDown(bar, { key: 'ArrowLeft', altKey: true, shiftKey: true });
		expect(mockSetDates).toHaveBeenLastCalledWith('a', { dueDate: new Date(2026, 10, 13) });
		// Without Alt the arrows are the page's.
		fireEvent.keyDown(bar, { key: 'ArrowRight' });
		expect(mockSetDates).toHaveBeenCalledTimes(2);
	});

	it('drags a bar by whole days, and a drag does not open the task', () => {
		mockSetDates.mockClear();
		const { commands } = renderTimeline([
			{ id: 'due', title: 'Due only', dueDate: '2026-11-20', status: 'open', taskStatusId: 'open' }
		]);
		const bar = screen.getByTestId('timeline-bar-due');

		// Weeks zoom: 36 px a day; 80 px is two days.
		fireEvent.pointerDown(bar, { button: 0, clientX: 100, pointerId: 1 });
		fireEvent.pointerMove(bar, { clientX: 180, pointerId: 1 });
		fireEvent.pointerUp(bar, { clientX: 180, pointerId: 1 });
		fireEvent.click(bar);

		expect(mockSetDates).toHaveBeenCalledWith('due', { dueDate: new Date(2026, 10, 22) });
		expect(commands.openTask).not.toHaveBeenCalled();

		// A press without movement is a click.
		fireEvent.pointerDown(bar, { button: 0, clientX: 100, pointerId: 2 });
		fireEvent.pointerUp(bar, { clientX: 101, pointerId: 2 });
		fireEvent.click(bar);
		expect(commands.openTask).toHaveBeenCalledWith('due');
		expect(mockSetDates).toHaveBeenCalledTimes(1);
	});

	it('leaves the dates of another team’s task alone: its bar only opens it', () => {
		mockSetDates.mockClear();
		renderTimeline([
			{ id: 'other', title: 'Elsewhere', startDate: '2026-11-10', dueDate: '2026-11-12', status: 'open', taskStatusId: 'open' }
		]);
		const bar = screen.getByTestId('timeline-bar-other');

		fireEvent.keyDown(bar, { key: 'ArrowRight', altKey: true });
		fireEvent.pointerDown(bar, { button: 0, clientX: 100, pointerId: 3 });
		fireEvent.pointerMove(bar, { clientX: 200, pointerId: 3 });
		fireEvent.pointerUp(bar, { clientX: 200, pointerId: 3 });

		expect(mockSetDates).not.toHaveBeenCalled();
		expect(bar.getAttribute('aria-keyshortcuts')).toBeNull();
	});

	it('says so when the view has no tasks', () => {
		renderTimeline([]);
		expect(screen.getByText('pages.teamTasks.TIMELINE_EMPTY')).toBeTruthy();
	});
});
