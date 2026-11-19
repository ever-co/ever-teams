import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { TodayTasks } from './today-tasks';
import { useStartOnTask, useTodayTasks } from './use-home-timer';

jest.mock('./use-home-timer', () => ({
	useTodayTasks: jest.fn(),
	useStartOnTask: jest.fn()
}));

const HAR_3 = { id: 'task-har-3', title: 'Repaint maintenance hatch', seconds: 2393 };
const HAR_1 = { id: 'task-har-1', title: 'Inspect north pier bolts', seconds: 1800 };
const runningOnHar3 = { startedAt: '2026-11-18T09:02:00.000Z', taskId: 'task-har-3', organizationTeamId: 'team-field' };
const startOnTask = { mutate: jest.fn(), isPending: false, isError: false };

function todayTasks(read: Record<string, unknown>) {
	(useTodayTasks as jest.Mock).mockReturnValue({ data: undefined, isError: false, refetch: jest.fn(), ...read });
}

beforeEach(() => {
	jest.clearAllMocks();
	(useStartOnTask as jest.Mock).mockReturnValue(startOnTask);
});

describe("today's tasks on Home", () => {
	it('list the tasks tracked today with their time, and a tap starts the timer on one', async () => {
		todayTasks({ data: [HAR_3, HAR_1] });

		await render(<TodayTasks organizationTeamId="team-field" enabled />);

		expect(screen.getByText('Repaint maintenance hatch')).toBeTruthy();
		expect(screen.getByText('shell.home.duration {"hours":0,"minutes":39}')).toBeTruthy();
		await fireEvent.press(screen.getByText('Inspect north pier bolts'));
		expect(startOnTask.mutate).toHaveBeenCalledWith({
			taskId: 'task-har-1',
			organizationTeamId: 'team-field',
			running: undefined
		});
	});

	it('mark the task the timer runs on, which a tap leaves running', async () => {
		todayTasks({ data: [HAR_3, HAR_1] });

		await render(<TodayTasks running={runningOnHar3} organizationTeamId="team-field" enabled />);

		expect(screen.getByTestId('home-today-task-running')).toBeTruthy();
		await fireEvent.press(screen.getByText('Repaint maintenance hatch'));
		expect(startOnTask.mutate).not.toHaveBeenCalled();
	});

	it('switch from the task that runs to the one tapped, and say so to a screen reader', async () => {
		todayTasks({ data: [HAR_3, HAR_1] });

		await render(<TodayTasks running={runningOnHar3} organizationTeamId="team-field" enabled />);

		const har1 = screen.getByLabelText('shell.home.switchToTask {"title":"Inspect north pier bolts"}');
		await fireEvent.press(har1);
		expect(startOnTask.mutate).toHaveBeenCalledWith({
			taskId: 'task-har-1',
			organizationTeamId: 'team-field',
			running: runningOnHar3
		});
	});

	it('wait without the network or another action under way', async () => {
		todayTasks({ data: [HAR_1] });

		await render(<TodayTasks enabled={false} />);

		await fireEvent.press(screen.getByText('Inspect north pier bolts'));
		expect(startOnTask.mutate).not.toHaveBeenCalled();
	});

	it('say when nothing was tracked today', async () => {
		todayTasks({ data: [] });

		await render(<TodayTasks enabled />);

		expect(screen.getByText(/^shell.home.todayTasksEmpty/)).toBeTruthy();
	});

	it('say they are loading, never that nothing was tracked', async () => {
		todayTasks({ data: undefined });

		await render(<TodayTasks enabled />);

		expect(screen.getByText(/^shell.states.loading/)).toBeTruthy();
		expect(screen.queryByText(/^shell.home.todayTasksEmpty/)).toBeNull();
	});

	it('say when they could not load, and read them again on Try again', async () => {
		const refetch = jest.fn();
		todayTasks({ isError: true, refetch });

		await render(<TodayTasks enabled />);

		expect(screen.getByText(/^shell.home.todayTasksFailed/)).toBeTruthy();
		await fireEvent.press(screen.getByText(/^shell.states.retry/));
		expect(refetch).toHaveBeenCalled();
	});

	it('say when a switch failed', async () => {
		todayTasks({ data: [HAR_3] });
		(useStartOnTask as jest.Mock).mockReturnValue({ ...startOnTask, isError: true });

		await render(<TodayTasks enabled />);

		expect(screen.getByText(/^shell.home.switchFailedTitle/)).toBeTruthy();
	});
});
