/** @jest-environment jsdom */

import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { dataColorHue } from '@/core/components/tasks/task-data-color';
import { DEFAULT_TEAM_TASKS_VIEW, type TeamTasksViewSettings } from '@/core/lib/utils/team-tasks-view';
import type { TTask } from '@/core/types/schemas/task/task.schema';
import { teamTasksGridOf } from './team-tasks-grid';

type PriorityItems = Map<string, { bgColor?: string | null }>;

let mockList: Record<string, unknown> = {};

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('@/core/hooks/tasks/use-task-worked-seconds', () => ({ useTaskWorkedSeconds: () => 0 }));
jest.mock('./team-tasks-list-context', () => ({ useTeamTasksList: () => mockList }));

import { TeamTaskRow } from './team-task-row';

const RED = '#EF4444';
const UNPAINTED_CHIP = '[--chip:hsl(var(--muted-foreground))]';

interface RowOptions {
	priority?: string | null;
	priorityItems?: PriorityItems;
	settings?: TeamTasksViewSettings;
}

function renderRow({ priority = null, priorityItems = new Map(), settings = DEFAULT_TEAM_TASKS_VIEW }: RowOptions) {
	const list = {
		grid: teamTasksGridOf(settings),
		properties: settings.properties,
		statuses: [],
		priorityItems,
		sizeItems: new Map(),
		projectNames: new Map(),
		memberNames: new Map(),
		taskById: new Map(),
		childCounts: new Map(),
		childDoneCounts: new Map(),
		liveByTask: new Map(),
		formatDay: () => '',
		formatRelativeDay: () => '',
		now: 0,
		openTask: jest.fn(),
		openPicker: jest.fn(),
		openRowMenu: jest.fn(),
		toggleSelected: jest.fn(),
		focusTask: jest.fn()
	};
	mockList = list;
	const task = { id: 't1', title: 'Ship the release', priority, members: [], tags: [] } as unknown as TTask;
	const { container, unmount } = render(
		<TeamTaskRow task={task} isSelected={false} isFocused={false} isTabStop={false} isSelecting={false} />
	);
	const priorityCell = container.querySelector<HTMLElement>('[data-cell="priority"]');
	const title = container.querySelector<HTMLElement>('a[href="/task/t1"]');
	return { list, container, priorityCell, title, unmount };
}

describe('the priority of a row of the team tasks list', () => {
	it('is a label with the name of the priority, in the colour of that priority', () => {
		const priorityItems: PriorityItems = new Map([['very-high', { bgColor: RED }]]);
		const { priorityCell } = renderRow({ priority: 'very-high', priorityItems });
		const chip = priorityCell?.querySelector<HTMLElement>('.chip-3d');

		expect(priorityCell?.tagName).toBe('BUTTON');
		expect(priorityCell?.textContent).toBe('very high');
		expect(priorityCell?.getAttribute('aria-label')).toBe('taskMenus.fields.priority: very high');
		expect(chip?.querySelector('[data-slot="task-property-icon"]')).not.toBeNull();
		expect(chip?.style.getPropertyValue('--chip')).toBe(dataColorHue(RED));
		expect(chip?.classList.contains(UNPAINTED_CHIP)).toBe(false);
	});

	it('keeps the name on a muted label when the priority has no colour to paint', () => {
		const priorityItems: PriorityItems = new Map([['medium', { bgColor: 'transparent' }]]);
		for (const priority of ['medium', 'low']) {
			const { priorityCell, unmount } = renderRow({ priority, priorityItems });
			const chip = priorityCell?.querySelector<HTMLElement>('.chip-3d');

			expect(priorityCell?.textContent).toBe(priority);
			expect(chip?.style.getPropertyValue('--chip')).toBe('');
			expect(chip?.classList.contains(UNPAINTED_CHIP)).toBe(true);
			unmount();
		}
	});

	it('shows no name and no label for a task without a priority, only the placeholder glyph', () => {
		const { priorityCell } = renderRow({ priority: null });

		expect(priorityCell).not.toBeNull();
		expect(priorityCell?.textContent).toBe('');
		expect(priorityCell?.querySelector('.chip-3d')).toBeNull();
		expect(priorityCell?.querySelector('[data-slot="task-property-icon"]')).not.toBeNull();
	});

	it('opens the priority picker for its task, anchored on the cell, without opening the task', () => {
		const { list, priorityCell } = renderRow({ priority: 'high' });
		fireEvent.click(priorityCell as HTMLElement);

		expect(list.openPicker).toHaveBeenCalledTimes(1);
		expect(list.openPicker).toHaveBeenCalledWith('priority', ['t1'], priorityCell);
		expect(list.openTask).not.toHaveBeenCalled();
	});

	it('sits in the first cell after the title, and leaves the row when the property is hidden', () => {
		const shown = renderRow({ priority: 'high' });
		const titleCell = shown.title?.closest('[role="gridcell"]');
		const cellOfPriority = shown.priorityCell?.closest('[role="gridcell"]');

		expect(titleCell).not.toBeNull();
		expect(titleCell?.nextElementSibling).toBe(cellOfPriority);
		shown.unmount();

		const properties = { ...DEFAULT_TEAM_TASKS_VIEW.properties, priority: false };
		const hidden = renderRow({ priority: 'high', settings: { ...DEFAULT_TEAM_TASKS_VIEW, properties } });

		expect(hidden.title).not.toBeNull();
		expect(hidden.priorityCell).toBeNull();
	});
});
