import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { onlineManager } from '@tanstack/react-query';
import { HomeTimer } from './home-timer';
import { useLogTask, useStartTimer, useStopTimer, useTimerStatus, useTrackedTotals } from './use-home-timer';

jest.mock('./use-home-timer', () => ({
	useTimerStatus: jest.fn(),
	useTrackedTotals: jest.fn(),
	useLogTask: jest.fn(),
	useStartTimer: jest.fn(),
	useStopTimer: jest.fn()
}));

const lastLog = { startedAt: '2026-11-18T07:05:00.000Z', taskId: 'task-har-3', organizationTeamId: 'team-field' };
const start = { mutate: jest.fn(), isPending: false, isError: false };
const stop = { mutate: jest.fn(), isPending: false, isError: false };

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
	(useLogTask as jest.Mock).mockReturnValue({ data: { taskNumber: 'HAR-3', title: 'Repaint maintenance hatch' } });
	(useStartTimer as jest.Mock).mockReturnValue(start);
	(useStopTimer as jest.Mock).mockReturnValue(stop);
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

	it('offers to try again when the first status fails', async () => {
		status(undefined, { isError: true });

		await render(<HomeTimer />);

		expect(screen.getByText(/shell\.states\.errorTitle/)).toBeTruthy();
	});
});
