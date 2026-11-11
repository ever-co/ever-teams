/** @jest-environment jsdom */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: Record<string, unknown>) =>
		values ? `${key}(${Object.values(values).join(',')})` : key,
	useLocale: () => 'en'
}));

import { TeamTasksTimelineView } from './team-tasks-timeline';

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

	it('says so when the view has no tasks', () => {
		renderTimeline([]);
		expect(screen.getByText('pages.teamTasks.TIMELINE_EMPTY')).toBeTruthy();
	});
});
