import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createStore, Provider } from 'jotai';
import { TimerSource } from '../../app/services/interfaces/ITimer';
import {
	readEmployeeId,
	readTimerStatus,
	readTodayTasks,
	readTrackedTotals,
	sendTimeSlot,
	startTimer,
	stopTimer
} from '../data/timer';
import { sessionAtom } from '../state/session';
import type { SessionState } from '../state/session';
import { followRun, forgetRun } from './heartbeat';
import {
	homeKeys,
	useEmployeeId,
	useStartOnTask,
	useStopTimer,
	useTimerStatus,
	useTodayTasks,
	useTrackedTotals
} from './use-home-timer';

jest.mock('../data/timer', () => ({
	readTimerStatus: jest.fn(),
	readTrackedTotals: jest.fn(),
	readTodayTasks: jest.fn(),
	readEmployeeId: jest.fn(),
	readTask: jest.fn(),
	readLastLogOfAnyDay: jest.fn(),
	sendTimeSlot: jest.fn(),
	startTimer: jest.fn(),
	stopTimer: jest.fn()
}));

const kofi = { accessToken: 'access', tenantId: 'tenant', organizationId: 'organization' };

function wrapperFor(state: SessionState) {
	const store = createStore();
	store.set(sessionAtom, state);
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	function Wrapper({ children }: { children: React.ReactNode }) {
		return (
			<Provider store={store}>
				<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
			</Provider>
		);
	}
	return Wrapper;
}

beforeEach(() => {
	jest.clearAllMocks();
	forgetRun();
	(sendTimeSlot as jest.Mock).mockResolvedValue(undefined);
	(readTimerStatus as jest.Mock).mockResolvedValue({ duration: 6740, running: false });
	(readEmployeeId as jest.Mock).mockResolvedValue('employee-kofi');
	(readTrackedTotals as jest.Mock).mockResolvedValue({ weekDuration: 25763, todayDuration: 6758 });
	(stopTimer as jest.Mock).mockResolvedValue(undefined);
	(startTimer as jest.Mock).mockResolvedValue(undefined);
	(readTodayTasks as jest.Mock).mockResolvedValue([
		{ id: 'task-har-3', title: 'Repaint maintenance hatch', seconds: 2393 }
	]);
});

describe('Home reads', () => {
	it('the timer of the person signed in', async () => {
		const { result } = await renderHook(() => useTimerStatus(), {
			wrapper: wrapperFor({ status: 'signed-in', session: kofi })
		});

		await waitFor(() => expect(result.current.data).toEqual({ duration: 6740, running: false }));
		expect(readTimerStatus).toHaveBeenCalledWith(kofi, expect.any(Date));
	});

	it('nothing while nobody is signed in', async () => {
		await renderHook(() => useTimerStatus(), { wrapper: wrapperFor({ status: 'signed-out' }) });

		expect(readTimerStatus).not.toHaveBeenCalled();
	});

	it('the totals of the employee the person is', async () => {
		const { result } = await renderHook(() => useTrackedTotals(), {
			wrapper: wrapperFor({ status: 'signed-in', session: kofi })
		});

		await waitFor(() => expect(result.current.data).toEqual({ weekDuration: 25763, todayDuration: 6758 }));
		expect(readTrackedTotals).toHaveBeenCalledWith(kofi, 'employee-kofi', expect.any(Date));
	});
});

describe('a stop from Home', () => {
	it('names the running log, then reads the timer and the totals again', async () => {
		const wrapper = wrapperFor({ status: 'signed-in', session: kofi });
		const status = await renderHook(() => useTimerStatus(), { wrapper });
		await waitFor(() => expect(status.result.current.isSuccess).toBe(true));
		const stop = await renderHook(() => useStopTimer(), { wrapper });
		const running = { startedAt: '2026-11-18T08:00:00.000Z', taskId: 'task-har-3' };

		await act(async () => {
			await stop.result.current.mutateAsync(running);
		});

		expect(stopTimer).toHaveBeenCalledWith(kofi, running);
		await waitFor(() => expect(readTimerStatus).toHaveBeenCalledTimes(2));
	});
});

describe('the answers Home saves', () => {
	function tokenFor(id: string): string {
		return `header.${btoa(JSON.stringify({ id })).replace(/=+$/, '')}.signature`;
	}

	it('are kept apart for two people of the same workspace', () => {
		const kofiKey = homeKeys.status({ ...kofi, accessToken: tokenFor('user-kofi') });
		const priyaKey = homeKeys.status({ ...kofi, accessToken: tokenFor('user-priya') });

		expect(kofiKey).not.toEqual(priyaKey);
		expect(kofiKey).toContain('user-kofi');
	});
});

describe('a stop from Home, while the heartbeat follows the run', () => {
	it('writes the time since the last heartbeat first, then stops', async () => {
		const wrapper = wrapperFor({ status: 'signed-in', session: kofi });
		const { result } = await renderHook(() => ({ stop: useStopTimer(), employee: useEmployeeId() }), { wrapper });
		await waitFor(() => expect(result.current.employee.data).toBe('employee-kofi'));
		const sent: string[] = [];
		(sendTimeSlot as jest.Mock).mockImplementation(async () => {
			sent.push('time slot');
		});
		(stopTimer as jest.Mock).mockImplementation(async () => {
			sent.push('stop');
		});
		followRun('log-1', Date.now());
		await act(async () => {
			jest.advanceTimersByTime(42_000);
		});

		await act(async () => {
			await result.current.stop.mutateAsync({ id: 'log-1', startedAt: '2026-11-18T08:00:00.000Z' });
		});

		expect(sendTimeSlot).toHaveBeenCalledWith(kofi, {
			employeeId: 'employee-kofi',
			source: TimerSource.MOBILE,
			seconds: 42
		});
		expect(sent).toEqual(['time slot', 'stop']);
	});

	it('stops all the same when that write fails', async () => {
		const wrapper = wrapperFor({ status: 'signed-in', session: kofi });
		const { result } = await renderHook(() => ({ stop: useStopTimer(), employee: useEmployeeId() }), { wrapper });
		await waitFor(() => expect(result.current.employee.data).toBe('employee-kofi'));
		(sendTimeSlot as jest.Mock).mockRejectedValue(new Error('offline'));
		followRun('log-1', Date.now());
		await act(async () => {
			jest.advanceTimersByTime(42_000);
		});

		await act(async () => {
			await result.current.stop.mutateAsync({ id: 'log-1', startedAt: '2026-11-18T08:00:00.000Z' });
		});

		expect(sendTimeSlot).toHaveBeenCalled();
		expect(stopTimer).toHaveBeenCalled();
	});
});

describe("today's tasks on Home", () => {
	it("are those of the employee the person is, in the team of today's last log", async () => {
		const { result } = await renderHook(() => useTodayTasks('team-field', true), {
			wrapper: wrapperFor({ status: 'signed-in', session: kofi })
		});

		await waitFor(() =>
			expect(result.current.data).toEqual([
				{ id: 'task-har-3', title: 'Repaint maintenance hatch', seconds: 2393 }
			])
		);
		expect(readTodayTasks).toHaveBeenCalledWith(kofi, 'employee-kofi', expect.any(Date), 'team-field');
	});

	it("wait for the day's first log", async () => {
		const { result } = await renderHook(
			() => ({ employee: useEmployeeId(), tasks: useTodayTasks(undefined, false) }),
			{ wrapper: wrapperFor({ status: 'signed-in', session: kofi }) }
		);

		await waitFor(() => expect(result.current.employee.data).toBe('employee-kofi'));
		expect(result.current.tasks.fetchStatus).toBe('idle');
		expect(readTodayTasks).not.toHaveBeenCalled();
	});
});

describe("a tap on one of today's tasks", () => {
	const running = {
		id: 'log-har-1',
		startedAt: '2026-11-18T08:00:00.000Z',
		taskId: 'task-har-1',
		source: TimerSource.MOBILE
	};

	it('starts the timer on it when nothing runs', async () => {
		const { result } = await renderHook(() => useStartOnTask(), {
			wrapper: wrapperFor({ status: 'signed-in', session: kofi })
		});

		await act(() => result.current.mutateAsync({ taskId: 'task-har-3', organizationTeamId: 'team-field' }));

		expect(stopTimer).not.toHaveBeenCalled();
		expect(startTimer).toHaveBeenCalledWith(kofi, { taskId: 'task-har-3', organizationTeamId: 'team-field' });
	});

	it('stops the run of another task first, then starts the task tapped', async () => {
		const sent: string[] = [];
		(stopTimer as jest.Mock).mockImplementation(async () => {
			sent.push('stop');
		});
		(startTimer as jest.Mock).mockImplementation(async () => {
			sent.push('start');
		});
		const { result } = await renderHook(() => useStartOnTask(), {
			wrapper: wrapperFor({ status: 'signed-in', session: kofi })
		});

		await act(() => result.current.mutateAsync({ taskId: 'task-har-3', running }));

		expect(stopTimer).toHaveBeenCalledWith(kofi, running);
		expect(startTimer).toHaveBeenCalledWith(kofi, { taskId: 'task-har-3' });
		expect(sent).toEqual(['stop', 'start']);
	});

	it('starts nothing when the stop of the other run fails, so that run goes on', async () => {
		(stopTimer as jest.Mock).mockRejectedValue(new Error('offline'));
		const { result } = await renderHook(() => useStartOnTask(), {
			wrapper: wrapperFor({ status: 'signed-in', session: kofi })
		});

		await act(async () => {
			await expect(result.current.mutateAsync({ taskId: 'task-har-3', running })).rejects.toThrow('offline');
		});

		expect(startTimer).not.toHaveBeenCalled();
	});
});
