import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { TodayTask } from '../data/timer';
import { TodayTasks } from './today-tasks';
import { useEmployeeId } from './use-home-timer';

jest.mock('./use-home-timer', () => ({
	useEmployeeId: jest.fn()
}));

const HAR_3 = { id: 'task-har-3', title: 'Repaint maintenance hatch', seconds: 2393 };
const HAR_1 = { id: 'task-har-1', title: 'Inspect north pier bolts', seconds: 1800 };
const runningOnHar3 = { startedAt: '2026-11-18T09:02:00.000Z', taskId: 'task-har-3', organizationTeamId: 'team-field' };
const employee = { data: 'employee-kofi', isSuccess: true, isError: false, refetch: jest.fn() };
const onStart = jest.fn();

function read(answer: { data?: TodayTask[]; isError?: boolean }) {
	return { data: undefined as TodayTask[] | undefined, isError: false, refetch: jest.fn(), ...answer };
}

beforeEach(() => {
	jest.clearAllMocks();
	(useEmployeeId as jest.Mock).mockReturnValue(employee);
});

describe("today's tasks on Home", () => {
	it('list the tasks tracked today with their time, and a tap starts the timer on one', async () => {
		await render(<TodayTasks tasks={read({ data: [HAR_3, HAR_1] })} enabled failed={false} onStart={onStart} />);

		expect(screen.getByText('Repaint maintenance hatch')).toBeTruthy();
		expect(screen.getByText('shell.home.duration {"hours":0,"minutes":39}')).toBeTruthy();
		await fireEvent.press(screen.getByText('Inspect north pier bolts'));
		expect(onStart).toHaveBeenCalledWith('task-har-1');
	});

	it('mark the task the timer runs on, which a tap leaves running', async () => {
		await render(
			<TodayTasks
				tasks={read({ data: [HAR_3, HAR_1] })}
				running={runningOnHar3}
				enabled
				failed={false}
				onStart={onStart}
			/>
		);

		expect(screen.getByTestId('home-today-task-running')).toBeTruthy();
		await fireEvent.press(screen.getByText('Repaint maintenance hatch'));
		expect(onStart).not.toHaveBeenCalled();
	});

	it('switch from the task that runs to the one tapped, and say so to a screen reader', async () => {
		await render(
			<TodayTasks
				tasks={read({ data: [HAR_3, HAR_1] })}
				running={runningOnHar3}
				enabled
				failed={false}
				onStart={onStart}
			/>
		);

		const har1 = screen.getByLabelText('shell.home.switchToTask {"title":"Inspect north pier bolts"}');
		await fireEvent.press(har1);
		expect(onStart).toHaveBeenCalledWith('task-har-1');
	});

	it('wait without the network or while another timer action is under way', async () => {
		await render(<TodayTasks tasks={read({ data: [HAR_1] })} enabled={false} failed={false} onStart={onStart} />);

		await fireEvent.press(screen.getByText('Inspect north pier bolts'));
		expect(onStart).not.toHaveBeenCalled();
	});

	it('say when nothing was tracked today', async () => {
		await render(<TodayTasks tasks={read({ data: [] })} enabled failed={false} onStart={onStart} />);

		expect(screen.getByText(/^shell.home.todayTasksEmpty/)).toBeTruthy();
	});

	it('say they are loading, never that nothing was tracked', async () => {
		await render(<TodayTasks tasks={read({})} enabled failed={false} onStart={onStart} />);

		expect(screen.getByText(/^shell.states.loading/)).toBeTruthy();
		expect(screen.queryByText(/^shell.home.todayTasksEmpty/)).toBeNull();
	});

	it('say when they could not load, and read them again on Try again', async () => {
		const tasks = read({ isError: true });

		await render(<TodayTasks tasks={tasks} enabled failed={false} onStart={onStart} />);

		expect(screen.getByText(/^shell.home.todayTasksFailed/)).toBeTruthy();
		await fireEvent.press(screen.getByText(/^shell.states.retry/));
		expect(tasks.refetch).toHaveBeenCalled();
	});

	it('say when the account tracks no time here, instead of loading for ever', async () => {
		(useEmployeeId as jest.Mock).mockReturnValue({ ...employee, data: null });

		await render(<TodayTasks tasks={read({})} enabled failed={false} onStart={onStart} />);

		expect(screen.getByText(/^shell.home.weekUnavailable/)).toBeTruthy();
		expect(screen.queryByText(/^shell.states.loading/)).toBeNull();
	});

	it('read the employee again, and not yet the tasks, when the employee lookup failed', async () => {
		(useEmployeeId as jest.Mock).mockReturnValue({ ...employee, data: undefined, isSuccess: false, isError: true });
		const tasks = read({});

		await render(<TodayTasks tasks={tasks} enabled failed={false} onStart={onStart} />);

		expect(screen.getByText(/^shell.home.todayTasksFailed/)).toBeTruthy();
		await fireEvent.press(screen.getByText(/^shell.states.retry/));
		expect(employee.refetch).toHaveBeenCalled();
		expect(tasks.refetch).not.toHaveBeenCalled();
	});

	it('say when a switch failed', async () => {
		await render(<TodayTasks tasks={read({ data: [HAR_3] })} enabled failed onStart={onStart} />);

		expect(screen.getByText(/^shell.home.switchFailedTitle/)).toBeTruthy();
	});
});
