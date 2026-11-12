/** @jest-environment jsdom */

import React from 'react';
import { act, render, screen } from '@testing-library/react';
import type { TTask } from '@/core/types/schemas/task/task.schema';

interface CapturedProps {
	view: { selectedIds: ReadonlySet<string>; toggleSelected: (taskId: string, extend: boolean) => void };
	commands: {
		openTask: (taskId: string) => void;
		openPicker: (kind: string, taskIds: string[], anchor: Element) => void;
	};
}

let mockLastViewProps: CapturedProps | null = null;
const mockOpenTaskDrawer = jest.fn();
const mockToggleSelected = jest.fn();
const mockUseTeamTasksView = jest.fn();

jest.mock('@/core/hooks/tasks/use-team-tasks-view', () => ({
	useTeamTasksView: (options: unknown) => mockUseTeamTasksView(options)
}));
jest.mock('@/core/hooks/tasks/use-task-drawer', () => ({
	useTaskDrawer: () => ({ openTaskDrawer: mockOpenTaskDrawer })
}));
jest.mock('@/core/components/pages/teams/team/tasks/list/team-tasks-calendar', () => ({
	TeamTasksCalendarView: (props: CapturedProps) => {
		mockLastViewProps = props;
		return <div data-testid="calendar-view" />;
	}
}));
jest.mock('@/core/components/pages/teams/team/tasks/list/team-tasks-timeline', () => ({
	TeamTasksTimelineView: (props: CapturedProps) => {
		mockLastViewProps = props;
		return <div data-testid="timeline-view" />;
	}
}));
jest.mock('@/core/components/pages/teams/team/tasks/list/team-task-picker', () => ({
	TeamTaskPicker: ({ target, isOpen }: { target: { kind: string; taskIds: string[] } | null; isOpen: boolean }) => {
		if (!isOpen || !target) {
			return null;
		}
		return <div data-testid="picker">{`${target.kind}:${target.taskIds.join(',')}`}</div>;
	}
}));

import { ProjectTasksLayoutView } from './project-tasks-layouts';

const TASKS = [
	{ id: 'a', title: 'Ship the release' },
	{ id: 'b', title: 'Write the notes' }
] as unknown as TTask[];

function capturedProps() {
	if (!mockLastViewProps) {
		throw new Error('No view was drawn');
	}
	return mockLastViewProps;
}

describe('ProjectTasksLayoutView', () => {
	beforeEach(() => {
		mockLastViewProps = null;
		mockOpenTaskDrawer.mockReset();
		mockToggleSelected.mockReset();
		mockUseTeamTasksView.mockReset().mockReturnValue({
			orderedIds: ['a', 'b'],
			statuses: [],
			taskById: new Map(),
			selectedIds: new Set(['a']),
			toggleSelected: mockToggleSelected
		});
	});

	it("draws the project's tasks with a view of its own, every status included, the device's view left alone", () => {
		render(<ProjectTasksLayoutView layout="calendar" tasks={TASKS} />);

		expect(screen.getByTestId('calendar-view')).toBeTruthy();
		const options = mockUseTeamTasksView.mock.calls[0][0];
		expect(options.tasks).toBe(TASKS);
		expect(options.resetKey).toBe('calendar');
		expect(options.initial.scope).toBe('all');
		expect(options.initial.filters).toEqual({});
		expect(options.initial.settings.layout).toBe('calendar');
	});

	it('draws the timeline when it is the layout picked', () => {
		render(<ProjectTasksLayoutView layout="timeline" tasks={TASKS} />);

		expect(screen.getByTestId('timeline-view')).toBeTruthy();
		expect(screen.queryByTestId('calendar-view')).toBeNull();
	});

	it("opens a task in the drawer in the view's order, and selects nothing", () => {
		render(<ProjectTasksLayoutView layout="calendar" tasks={TASKS} />);
		const { view, commands } = capturedProps();

		commands.openTask('b');
		view.toggleSelected('a', false);

		expect(mockOpenTaskDrawer).toHaveBeenCalledWith('b', ['a', 'b']);
		expect(view.selectedIds.size).toBe(0);
		expect(mockToggleSelected).not.toHaveBeenCalled();
	});

	it('opens the due date picker in the tab', () => {
		render(<ProjectTasksLayoutView layout="calendar" tasks={TASKS} />);
		const { commands } = capturedProps();

		act(() => commands.openPicker('dueDate', ['a'], document.body));

		expect(screen.getByTestId('picker').textContent).toBe('dueDate:a');
	});
});
