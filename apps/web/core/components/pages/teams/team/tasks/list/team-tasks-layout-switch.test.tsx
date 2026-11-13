/** @jest-environment jsdom */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { TeamTasksLayout } from '@/core/lib/utils/team-tasks-view';

let mockIsTaskViewsEnabled = false;
jest.mock('@/core/lib/utils/task-views-enabled', () => ({ isTaskViewsEnabled: () => mockIsTaskViewsEnabled }));
jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
// The real tooltip shows its sentence after a pause, placed by a positioning library: here it is always readable.
jest.mock('@/core/components/duplicated-components/tooltip', () => ({
	Tooltip: ({ label, children }: { label: string; children: React.ReactNode }) => (
		<div data-hint={label}>{children}</div>
	)
}));

import { TeamTasksLayoutSwitch } from './team-tasks-layout-switch';

const LIST = 'pages.teamTasks.LAYOUT_LIST';
const KANBAN = 'common.KANBAN';
const CALENDAR = 'common.CALENDAR';
const TABLE = 'common.TABLE';
const TIMELINE = 'pages.teamTasks.LAYOUT_TIMELINE';

function renderSwitch(layout?: TeamTasksLayout) {
	const setLayout = jest.fn();
	const view = {
		settings: { layout },
		setLayout
	} as unknown as Parameters<typeof TeamTasksLayoutSwitch>[0]['view'];
	const { unmount } = render(<TeamTasksLayoutSwitch view={view} />);
	return { setLayout, unmount };
}

function optionNames() {
	const options = screen.getAllByRole('tab');
	return options.map((option) => option.textContent);
}

function selectedOptionNames() {
	const options = screen.getAllByRole('tab', { selected: true });
	return options.map((option) => option.textContent);
}

function hintOf(optionName: string) {
	const option = screen.getByRole('tab', { name: optionName });
	const tooltip = option.closest('[data-hint]');
	return tooltip?.getAttribute('data-hint');
}

describe('TeamTasksLayoutSwitch', () => {
	beforeEach(() => {
		mockIsTaskViewsEnabled = false;
	});

	it('offers the list, the calendar and the table without the saved views', () => {
		renderSwitch();

		expect(screen.getByRole('tablist', { name: 'pages.teamTasks.LAYOUT' })).toBeTruthy();
		expect(optionNames()).toEqual([LIST, CALENDAR, TABLE]);
	});

	it('offers the list, the Kanban board, the calendar, the table and the timeline with the saved views', () => {
		mockIsTaskViewsEnabled = true;
		renderSwitch();

		expect(optionNames()).toEqual([LIST, KANBAN, CALENDAR, TABLE, TIMELINE]);
	});

	it('gives the view the layout of the option clicked', () => {
		mockIsTaskViewsEnabled = true;
		const { setLayout } = renderSwitch();
		const layoutOfOption: Array<[string, TeamTasksLayout]> = [
			[KANBAN, 'board'],
			[CALENDAR, 'calendar'],
			[TABLE, 'table'],
			[TIMELINE, 'timeline'],
			[LIST, 'list']
		];

		for (const [name, layout] of layoutOfOption) {
			fireEvent.click(screen.getByRole('tab', { name }));
			expect(setLayout).toHaveBeenLastCalledWith(layout);
		}
		expect(setLayout).toHaveBeenCalledTimes(5);
	});

	it('selects the option of the layout the view is shown in, the list for a view without one', () => {
		const withoutLayout = renderSwitch();
		expect(selectedOptionNames()).toEqual([LIST]);
		withoutLayout.unmount();

		const asCalendar = renderSwitch('calendar');
		expect(selectedOptionNames()).toEqual([CALENDAR]);
		asCalendar.unmount();

		mockIsTaskViewsEnabled = true;
		renderSwitch('timeline');
		expect(selectedOptionNames()).toEqual([TIMELINE]);
	});

	it('selects the list for a board or a timeline the deployment does not offer', () => {
		const asBoard = renderSwitch('board');
		expect(optionNames()).toEqual([LIST, CALENDAR, TABLE]);
		expect(selectedOptionNames()).toEqual([LIST]);
		asBoard.unmount();

		renderSwitch('timeline');
		expect(selectedOptionNames()).toEqual([LIST]);
	});

	it('gives each option the sentence that says what its layout shows', () => {
		mockIsTaskViewsEnabled = true;
		renderSwitch();

		expect(hintOf(LIST)).toBe('pages.teamTasks.LAYOUT_LIST_HINT');
		expect(hintOf(KANBAN)).toBe('pages.teamTasks.LAYOUT_BOARD_HINT');
		expect(hintOf(CALENDAR)).toBe('pages.teamTasks.LAYOUT_CALENDAR_HINT');
		expect(hintOf(TABLE)).toBe('pages.teamTasks.LAYOUT_TABLE_HINT');
		expect(hintOf(TIMELINE)).toBe('pages.teamTasks.LAYOUT_TIMELINE_HINT');
	});
});
