/** @jest-environment jsdom */

import React, { type ComponentType } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ProjectTaskStatsState } from '@/core/hooks/projects/use-project-task-stats';
import type { TTask } from '@/core/types/schemas/task/task.schema';
import type { TTaskStatus } from '@/core/types/schemas/task/task-status.schema';

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: Record<string, unknown>) =>
		values ? `${key}(${Object.values(values).join(',')})` : key,
	useLocale: () => 'en'
}));
let mockTaskViewsEnabled = false;
jest.mock('@/core/lib/utils/task-views-enabled', () => ({ isTaskViewsEnabled: () => mockTaskViewsEnabled }));
jest.mock('@/core/components/tasks/drawer/task-drawer-link', () => ({
	TaskDrawerLink: ({ children }: { children: React.ReactNode }) => <a href="#task">{children}</a>
}));
// The calendar and the timeline are the Team tasks views, tested there: here each says which tasks it was given.
jest.mock('./project-tasks-layouts', () => ({
	ProjectTasksLayoutView: ({
		layout,
		tasks,
		className
	}: {
		layout: string;
		tasks: Array<{ title: string }>;
		className?: string;
	}) => (
		<div data-testid={`project-tasks-${layout}`} className={className}>
			{tasks.map((task) => task.title).join(', ')}
		</div>
	)
}));
// The lazy parts render once loaded, as `next/dynamic` renders them in the browser.
jest.mock('next/dynamic', () => {
	const { createElement, lazy, Suspense } = jest.requireActual<typeof import('react')>('react');
	return {
		__esModule: true,
		default: (loader: () => Promise<{ default: ComponentType<object> }>) => {
			const Lazy = lazy(loader);
			return function Loaded(props: object) {
				return createElement(Suspense, { fallback: null }, createElement(Lazy, props));
			};
		}
	};
});

import { ProjectTasksTab } from './project-tasks-tab';

const STATUSES = [{ id: 'open', name: 'open', value: 'open' }] as unknown as TTaskStatus[];

const TASKS = [
	{ id: 'a', title: 'Ship the release', status: 'open', taskStatusId: 'open', dueDate: '2026-11-14' },
	{ id: 'b', title: 'Write the notes', status: 'open', taskStatusId: 'open' }
] as unknown as TTask[];

function renderTab({ isReady = true }: { isReady?: boolean } = {}) {
	const taskStats = {
		hasTeam: true,
		isReady,
		teamName: 'Team A',
		statsOf: () => ({ tasks: TASKS, total: TASKS.length })
	} as unknown as ProjectTaskStatsState;
	return render(<ProjectTasksTab projectId="p1" taskStats={taskStats} statuses={STATUSES} />);
}

const layoutSwitch = () => screen.getByRole('tablist', { name: 'pages.teamTasks.LAYOUT' });

function layoutNamesOf(tablist: HTMLElement) {
	const tabs = within(tablist).getAllByRole('tab');
	return tabs.map((tab) => tab.textContent);
}

describe('ProjectTasksTab', () => {
	afterEach(() => {
		mockTaskViewsEnabled = false;
		window.localStorage.clear();
	});

	it('lists the project tasks by status, and offers the list and the calendar', () => {
		renderTab();

		expect(layoutNamesOf(layoutSwitch())).toEqual(['pages.teamTasks.LAYOUT_LIST', 'common.CALENDAR']);
		expect(screen.getByText('Ship the release')).toBeTruthy();
		expect(screen.queryByTestId('project-tasks-calendar')).toBeNull();
	});

	it('shows the project tasks in a calendar once picked, and remembers it on the device', async () => {
		renderTab();

		fireEvent.click(within(layoutSwitch()).getByRole('tab', { name: 'common.CALENDAR' }));

		const calendar = await screen.findByTestId('project-tasks-calendar');
		expect(calendar.textContent).toBe('Ship the release, Write the notes');
		expect(screen.queryByRole('link', { name: 'Ship the release' })).toBeNull();
		expect(window.localStorage.getItem('project-tasks-layout')).toBe('"calendar"');
	});

	it('offers the timeline where saved views are on', async () => {
		mockTaskViewsEnabled = true;
		renderTab();

		expect(layoutNamesOf(layoutSwitch())).toEqual([
			'pages.teamTasks.LAYOUT_LIST',
			'common.CALENDAR',
			'pages.teamTasks.LAYOUT_TIMELINE'
		]);
		fireEvent.click(within(layoutSwitch()).getByRole('tab', { name: 'pages.teamTasks.LAYOUT_TIMELINE' }));
		expect(await screen.findByTestId('project-tasks-timeline')).toBeTruthy();
	});

	it('sizes the calendar to the screen, with a lower floor on a phone', async () => {
		window.localStorage.setItem('project-tasks-layout', JSON.stringify('calendar'));
		renderTab();

		const frame = await screen.findByTestId('project-tasks-calendar');
		expect(frame.className).toContain('h-[min(78svh,760px)]');
		expect(frame.className).toContain('min-h-80');
		expect(frame.className).toContain('sm:min-h-120');
	});

	it('shows the frame of the stored view while the tasks load, not the list of rows', () => {
		window.localStorage.setItem('project-tasks-layout', JSON.stringify('calendar'));
		const { container } = renderTab({ isReady: false });

		expect(container.querySelector('.min-h-80')).not.toBeNull();
		expect(container.querySelectorAll('.h-11')).toHaveLength(0);
	});

	it('opens on the list when the layout stored on the device is not offered here', () => {
		window.localStorage.setItem('project-tasks-layout', JSON.stringify('timeline'));
		renderTab();

		const list = within(layoutSwitch()).getByRole('tab', { name: 'pages.teamTasks.LAYOUT_LIST' });
		expect(list.getAttribute('aria-selected')).toBe('true');
		expect(screen.getByText('Ship the release')).toBeTruthy();
		expect(screen.queryByTestId('project-tasks-timeline')).toBeNull();
	});
});
