import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { onlineManager } from '@tanstack/react-query';
import { HomeTimer } from './home-timer';
import {
	useEmployeeId,
	useLastLog,
	useLogTask,
	useStartTimer,
	useStopTimer,
	useTimerStatus,
	useTrackedTotals
} from './use-home-timer';

jest.mock('./use-home-timer', () => ({
	useTimerStatus: jest.fn(),
	useTrackedTotals: jest.fn(),
	useLogTask: jest.fn(),
	useLastLog: jest.fn(),
	useEmployeeId: jest.fn(),
	useStartTimer: jest.fn(),
	useStopTimer: jest.fn()
}));

const lastLog = { startedAt: '2026-11-18T07:05:00.000Z', taskId: 'task-har-3', organizationTeamId: 'team-field' };
const start = { mutate: jest.fn(), isPending: false, isError: false };
const stop = { mutate: jest.fn(), isPending: false, isError: false };
const employee = { data: 'employee-kofi', isSuccess: true, isError: false, refetch: jest.fn() };

function status(data: unknown, extra: Record<string, unknown> = {}) {
	(useTimerStatus as jest.Mock).mockReturnValue({
		data,
		dataUpdatedAt: Date.now(),
		isError: false,
		refetch: jest.fn(),
		...extra
	});
}

beforeEach(() => {
	jest.clearAllMocks();
	onlineManager.setOnline(true);
	(useTrackedTotals as jest.Mock).mockReturnValue({
		data: { weekDuration: 25763, todayDuration: 6758 },
		refetch: jest.fn()
	});
	(useLogTask as jest.Mock).mockReturnValue({
		data: { taskNumber: 'HAR-3', title: 'Repaint maintenance hatch' },
		isError: false,
		refetch: jest.fn()
	});
	(useStartTimer as jest.Mock).mockReturnValue(start);
	(useStopTimer as jest.Mock).mockReturnValue(stop);
	(useLastLog as jest.Mock).mockImplementation((todaysLog: unknown) => todaysLog);
	(useEmployeeId as jest.Mock).mockReturnValue(employee);
});

describe('Home', () => {
	it('waits for the first status with the loading state', async () => {
		status(undefined);

		await render(<HomeTimer />);

		expect(screen.getByLabelText(/shell\.states\.loading/)).toBeTruthy();
	});

	it("shows today's time, the last task and the week, and starts on that task", async () => {
		status({ duration: 6740, running: false, lastLog });

		await render(<HomeTimer />);

		expect(screen.getByText('01:52:20')).toBeTruthy();
		expect(screen.getByText(/shell\.home\.lastTask/)).toBeTruthy();
		expect(screen.getByText(/Repaint maintenance hatch/)).toBeTruthy();
		expect(screen.getByText('shell.home.duration {"hours":7,"minutes":9}')).toBeTruthy();
		await fireEvent.press(screen.getByRole('button'));
		expect(start.mutate).toHaveBeenCalledWith({ taskId: 'task-har-3', organizationTeamId: 'team-field' });
	});

	it('stops the running log, and says since when it runs', async () => {
		status({ duration: 6740, running: true, lastLog });

		await render(<HomeTimer />);

		expect(screen.getByText(/shell\.home\.currentTask/)).toBeTruthy();
		expect(screen.getByText(/shell\.home\.runningSince/)).toBeTruthy();
		await fireEvent.press(screen.getByRole('button'));
		expect(stop.mutate).toHaveBeenCalledWith(lastLog);
	});

	it('starts again on the last task of an earlier day, before the day\x27s first entry', async () => {
		status({ duration: 0, running: false });
		(useLastLog as jest.Mock).mockReturnValue(lastLog);

		await render(<HomeTimer />);

		expect(screen.getByText(/shell.home.lastTask/)).toBeTruthy();
		await fireEvent.press(screen.getByRole('button'));
		expect(start.mutate).toHaveBeenCalledWith({ taskId: 'task-har-3', organizationTeamId: 'team-field' });
	});

	it('cannot start without a task to continue, and says so', async () => {
		status({ duration: 0, running: false });

		await render(<HomeTimer />);

		expect(screen.getByText(/shell\.home\.noTaskTitle/)).toBeTruthy();
		expect(screen.getByRole('button').props.accessibilityState).toMatchObject({ disabled: true });
	});

	it('needs a connection to start or stop', async () => {
		status({ duration: 6740, running: false, lastLog });
		await act(async () => {
			onlineManager.setOnline(false);
		});

		await render(<HomeTimer />);

		expect(screen.getByText(/shell\.home\.needsNetwork/)).toBeTruthy();
		expect(screen.getByRole('button').props.accessibilityState).toMatchObject({ disabled: true });
	});

	it('says when a start failed', async () => {
		status({ duration: 6740, running: false, lastLog });
		(useStartTimer as jest.Mock).mockReturnValue({ ...start, isError: true });

		await render(<HomeTimer />);

		expect(screen.getByText(/shell\.home\.startFailedTitle/)).toBeTruthy();
	});

	it('says when the week\x27s total did not load, and reads the employee and the totals again', async () => {
		status({ duration: 6740, running: false, lastLog });
		const totals = { data: undefined, isError: true, refetch: jest.fn() };
		(useTrackedTotals as jest.Mock).mockReturnValue(totals);

		await render(<HomeTimer />);

		expect(screen.getByText(/shell.home.weekFailed/)).toBeTruthy();
		await fireEvent.press(screen.getByText(/shell.states.retry/));
		expect(employee.refetch).toHaveBeenCalled();
		expect(totals.refetch).toHaveBeenCalled();
	});

	it('says when the account tracks no time here, instead of loading for ever', async () => {
		status({ duration: 6740, running: false, lastLog });
		(useEmployeeId as jest.Mock).mockReturnValue({ ...employee, data: null });
		(useTrackedTotals as jest.Mock).mockReturnValue({ data: undefined, isError: false, refetch: jest.fn() });

		await render(<HomeTimer />);

		expect(screen.getByText(/shell.home.weekUnavailable/)).toBeTruthy();
		expect(screen.queryByText(/shell.states.loading/)).toBeNull();
	});

	it('says when the task did not load, and reads it again', async () => {
		status({ duration: 6740, running: false, lastLog });
		const task = { data: undefined, isError: true, refetch: jest.fn() };
		(useLogTask as jest.Mock).mockReturnValue(task);

		await render(<HomeTimer />);

		expect(screen.getByText(/shell.home.taskFailed/)).toBeTruthy();
		await fireEvent.press(screen.getByText(/shell.states.retry/));
		expect(task.refetch).toHaveBeenCalled();
	});

	it('offers to try again when the first status fails', async () => {
		status(undefined, { isError: true });

		await render(<HomeTimer />);

		expect(screen.getByText(/shell\.states\.errorTitle/)).toBeTruthy();
	});
});
