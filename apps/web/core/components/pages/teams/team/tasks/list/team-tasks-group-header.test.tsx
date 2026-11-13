/** @jest-environment jsdom */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { dataColorHue } from '@/core/components/tasks/task-data-color';
import {
	DEFAULT_TEAM_TASKS_VIEW,
	NONE_VALUE,
	type TeamTasksGroup,
	type TeamTasksGrouping
} from '@/core/lib/utils/team-tasks-view';
import { teamTasksGridOf } from './team-tasks-grid';

type PriorityItems = Map<string, { bgColor?: string | null }>;

let mockList: Record<string, unknown> = {};

// No time worked on any task: the band draws no total.
jest.mock('jotai', () => ({ useAtomValue: () => new Map() }));
jest.mock('@/core/stores', () => ({ activeTeamWorkedDurationByTaskState: 'worked-durations' }));
jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('./team-tasks-list-context', () => ({ useTeamTasksList: () => mockList }));

import { TeamTasksGroupHeader } from './team-tasks-group-header';

const NEUTRAL_BAND = 'bg-[color-mix(in_oklab,hsl(var(--background)),hsl(var(--foreground))_2.5%)]';
const BLUE = '#3B82F6';
const RED = '#EF4444';

function groupOf(grouping: TeamTasksGrouping, value: string, extra: Record<string, unknown> = {}) {
	const group = { key: `${grouping}:${value}`, grouping, value, tasks: [], ...extra };
	return group as unknown as TeamTasksGroup;
}

function statusGroupOf(name: string, color: string | null) {
	return groupOf('status', name, { status: { id: name, name, color } });
}

function renderBand(group: TeamTasksGroup, priorityItems: PriorityItems = new Map(), isCollapsed = false) {
	const list = {
		grid: teamTasksGridOf(DEFAULT_TEAM_TASKS_VIEW),
		priorityItems,
		memberNames: new Map<string, string>(),
		projectNames: new Map<string, string>(),
		toggleGroup: jest.fn(),
		setManySelected: jest.fn(),
		createTaskInGroup: jest.fn()
	};
	mockList = list;
	const { unmount } = render(
		<TeamTasksGroupHeader group={group} isCollapsed={isCollapsed} selectedIds={new Set<string>()} />
	);
	const band = screen.getByRole('row');
	return { list, band, unmount };
}

function bandColorOf(band: HTMLElement) {
	return band.style.getPropertyValue('--band');
}

function isNeutral(band: HTMLElement) {
	return band.classList.contains(NEUTRAL_BAND);
}

function readsBandColor(band: HTMLElement) {
	return band.className.includes('var(--band)');
}

describe('the band of a group of the team tasks list', () => {
	it('is tinted with the colour of its status', () => {
		const { band } = renderBand(statusGroupOf('in-progress', BLUE));

		expect(bandColorOf(band)).toBe(dataColorHue(BLUE));
		expect(readsBandColor(band)).toBe(true);
		expect(isNeutral(band)).toBe(true);
	});

	it('stays neutral for a status without a colour it can paint, and for a group of tasks without a status', () => {
		const uncoloured = [
			statusGroupOf('in-progress', null),
			statusGroupOf('in-progress', ''),
			statusGroupOf('in-progress', 'transparent'),
			groupOf('status', NONE_VALUE)
		];
		for (const group of uncoloured) {
			const { band, unmount } = renderBand(group);

			expect(isNeutral(band)).toBe(true);
			expect(bandColorOf(band)).toBe('');
			expect(readsBandColor(band)).toBe(false);
			unmount();
		}
	});

	it('stays neutral for a group of people, whatever the colours the list knows', () => {
		const priorityItems: PriorityItems = new Map([['employee-1', { bgColor: RED }]]);
		const member = { id: 'employee-1', fullName: 'Ana Silva' };
		const group = groupOf('assignee', 'employee-1', { tasks: [{ id: 't1', members: [member] }] });
		const { band } = renderBand(group, priorityItems);

		expect(band.textContent).toContain('Ana Silva');
		expect(isNeutral(band)).toBe(true);
		expect(bandColorOf(band)).toBe('');
	});

	it('is tinted with the colour the list has for its priority, and stays neutral without one', () => {
		const priorityItems: PriorityItems = new Map([
			['high', { bgColor: RED }],
			['medium', { bgColor: null }]
		]);

		const high = renderBand(groupOf('priority', 'high'), priorityItems);
		expect(bandColorOf(high.band)).toBe(dataColorHue(RED));
		expect(readsBandColor(high.band)).toBe(true);
		expect(isNeutral(high.band)).toBe(true);
		high.unmount();

		for (const value of ['medium', 'low', NONE_VALUE]) {
			const { band, unmount } = renderBand(groupOf('priority', value), priorityItems);

			expect(isNeutral(band)).toBe(true);
			expect(bandColorOf(band)).toBe('');
			unmount();
		}
	});

	it('folds and unfolds through the list, by the key of its group', () => {
		const group = statusGroupOf('in-progress', BLUE);
		const open = renderBand(group);
		fireEvent.click(screen.getByRole('button', { expanded: true }));

		expect(open.list.toggleGroup).toHaveBeenCalledTimes(1);
		expect(open.list.toggleGroup).toHaveBeenCalledWith('status:in-progress');
		open.unmount();

		const folded = renderBand(group, new Map(), true);
		fireEvent.click(screen.getByRole('button', { expanded: false }));

		expect(folded.list.toggleGroup).toHaveBeenCalledTimes(1);
		expect(folded.list.toggleGroup).toHaveBeenCalledWith('status:in-progress');
	});
});
