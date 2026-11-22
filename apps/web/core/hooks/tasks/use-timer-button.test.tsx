/** @jest-environment jsdom */
/**
 * A task card's Start switches the timer to its task: the run this tab shows is stopped first, then the task starts.
 *
 * #5684: on a page that had not read the timer yet, Start did not stop the run (the tab did not show it), the start
 * then found that run and refused it as another device's, and the task change stopped it: nothing ran. The start now
 * waits for the tab's first read of the timer.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import type { PropsWithChildren } from 'react';

import { timerStatusState } from '@/core/stores';
import type { ITimerStatus } from '@/core/types/interfaces/timer/timer-status';
import type { TTask } from '@/core/types/schemas/task/task.schema';
import { useTimerButtonLogic } from './use-timer-button';

/** What the person's actions sent, in order. */
const mockCalls: string[] = [];
const mockStopTimer = jest.fn(async () => {
	mockCalls.push('stop');
});
const mockStartTimer = jest.fn(async (task: TTask) => {
	mockCalls.push(`start ${task.id}`);
	return 'started';
});
const mockGetTimerStatus = jest.fn();
const mockSetActiveTask = jest.fn(async () => undefined);

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
const mockToastWarning = jest.fn();

jest.mock('sonner', () => ({
	toast: {
		loading: jest.fn(() => 'toast-1'),
		success: jest.fn(),
		dismiss: jest.fn(),
		warning: (...args: unknown[]) => mockToastWarning(...args)
	}
}));
jest.mock('@/core/hooks/timer', () => ({
	useTimerActions: () => ({
		canTrack: true,
		canRunTimer: true,
		hasPlan: undefined,
		startTimer: mockStartTimer,
		stopTimer: mockStopTimer,
		getTimerStatus: mockGetTimerStatus
	})
}));
jest.mock('@/core/hooks/organizations/teams/use-team-tasks-state', () => ({
	useSetActiveTask: () => ({ setActiveTask: mockSetActiveTask })
}));
jest.mock('@/core/hooks/activities/use-start-stop-timer-handler', () => ({
	useStartStopTimerHandler: () => ({ modals: {}, startStopTimerHandler: jest.fn() })
}));

const TASK_B = { id: 'task-b', title: 'Draft the release notes', status: 'open' } as never as TTask;
const RUN_ON_TASK_A = { running: true, lastLog: { id: 'log-a', taskId: 'task-a' } } as never as ITimerStatus;

/** The card of task B, in a tab whose timer status is `status` (null: not read yet). */
function renderCardOfTaskB(status: ITimerStatus | null) {
	const store = createStore();
	store.set(timerStatusState, status);
	const wrapper = ({ children }: PropsWithChildren) => <Provider store={store}>{children}</Provider>;
	const view = renderHook(() => useTimerButtonLogic({ task: TASK_B }), { wrapper });
	return { store, view };
}

beforeEach(() => {
	mockCalls.length = 0;
	window.scrollTo = jest.fn();
});

describe("a task card's Start", () => {
	it('stops the run this tab shows, then starts its task', async () => {
		const { view } = renderCardOfTaskB(RUN_ON_TASK_A);

		await act(async () => {
			await view.result.current.startTimerWithTask();
		});

		expect(mockCalls).toEqual(['stop', 'start task-b']);
		expect(mockGetTimerStatus).not.toHaveBeenCalled();
	});

	it('starts its task at once when this tab shows no run', async () => {
		const { view } = renderCardOfTaskB({ running: false, lastLog: null } as never);

		await act(async () => {
			await view.result.current.startTimerWithTask();
		});

		expect(mockCalls).toEqual(['start task-b']);
		expect(mockGetTimerStatus).not.toHaveBeenCalled();
	});

	it('waits for the first read of the timer, then stops the run it shows and starts its task', async () => {
		const { store, view } = renderCardOfTaskB(null);
		let answerRead: () => void = () => undefined;
		mockGetTimerStatus.mockImplementation(
			() =>
				new Promise((resolve) => {
					answerRead = () => {
						store.set(timerStatusState, RUN_ON_TASK_A);
						resolve({ data: RUN_ON_TASK_A });
					};
				})
		);

		await act(async () => {
			void view.result.current.startTimerWithTask();
		});
		expect(view.result.current.loading).toBe(true);
		expect(mockCalls).toEqual([]);
		expect(mockSetActiveTask).not.toHaveBeenCalled();

		await act(async () => {
			answerRead();
		});

		await waitFor(() => expect(mockCalls).toEqual(['stop', 'start task-b']));
		expect(view.result.current.loading).toBe(false);
	});

	it('settles only once the switch it waited for has started its task, so Continue keeps its notes until then', async () => {
		const { store, view } = renderCardOfTaskB(null);
		mockGetTimerStatus.mockImplementation(async () => {
			store.set(timerStatusState, RUN_ON_TASK_A);
			return { data: RUN_ON_TASK_A };
		});
		let answerStart: () => void = () => undefined;
		mockStartTimer.mockImplementationOnce(
			(task: TTask) =>
				new Promise((resolve) => {
					answerStart = () => {
						mockCalls.push(`start ${task.id}`);
						resolve('started');
					};
				})
		);
		let isSettled = false;
		let start: Promise<void> = Promise.resolve();

		await act(async () => {
			start = view.result.current.startTimerWithTask().then(() => {
				isSettled = true;
			});
		});
		await waitFor(() => expect(mockStartTimer).toHaveBeenCalledTimes(1));
		expect(isSettled).toBe(false);

		await act(async () => {
			answerStart();
			await start;
		});
		expect(isSettled).toBe(true);
		expect(mockCalls).toEqual(['stop', 'start task-b']);
	});

	it('starts its task, with no stop, when the first read finds no run', async () => {
		const { store, view } = renderCardOfTaskB(null);
		mockGetTimerStatus.mockImplementation(async () => {
			store.set(timerStatusState, { running: false, lastLog: null } as never);
			return { data: { running: false, lastLog: null } };
		});
		let start: Promise<void> = Promise.resolve();

		await act(async () => {
			start = view.result.current.startTimerWithTask();
		});

		await waitFor(() => expect(mockCalls).toEqual(['start task-b']));
		await act(async () => {
			await start;
		});
	});

	it('starts nothing when its task was closed while the first read was on its way', async () => {
		const store = createStore();
		store.set(timerStatusState, null);
		const wrapper = ({ children }: PropsWithChildren) => <Provider store={store}>{children}</Provider>;
		const view = renderHook(({ task }) => useTimerButtonLogic({ task }), {
			wrapper,
			initialProps: { task: TASK_B }
		});
		let answerRead: () => void = () => undefined;
		mockGetTimerStatus.mockImplementation(
			() =>
				new Promise((resolve) => {
					answerRead = () => {
						store.set(timerStatusState, RUN_ON_TASK_A);
						resolve({ data: RUN_ON_TASK_A });
					};
				})
		);

		await act(async () => {
			void view.result.current.startTimerWithTask();
		});
		view.rerender({ task: { ...TASK_B, status: 'closed' } as never as TTask });
		await act(async () => {
			answerRead();
		});

		await waitFor(() => expect(mockToastWarning).toHaveBeenCalledWith('timer.TASK_CLOSED', expect.anything()));
		expect(mockCalls).toEqual([]);
	});

	it.each([
		['the read fails', () => Promise.reject(new Error('Network Error'))],
		['the read cannot be sent', () => undefined]
	])('still starts its task when %s, as before', async (_, read) => {
		const { view } = renderCardOfTaskB(null);
		mockGetTimerStatus.mockImplementation(read);

		await act(async () => {
			await view.result.current.startTimerWithTask();
		});

		expect(mockCalls).toEqual(['start task-b']);
		expect(view.result.current.loading).toBe(false);
	});
});
