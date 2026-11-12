/** @jest-environment jsdom */

import { act, render, screen } from '@testing-library/react';
import { Provider, createStore } from 'jotai';

import type { TimerTaskStartRequest } from '@/core/hooks/timer/use-timer-task-start';
import { teamTasksState, timerBillableChoicesState, timerStatusState } from '@/core/stores';
import { timerStartNotesState } from '@/core/stores/timer/timer-start-notes';
import type { TTask } from '@/core/types/schemas/task/task.schema';

const mockUseTimerButtonLogic = jest.fn();
const mockToast = { warning: jest.fn(), info: jest.fn() };

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('sonner', () => ({
	toast: {
		warning: (...args: unknown[]) => mockToast.warning(...args),
		info: (...args: unknown[]) => mockToast.info(...args)
	}
}));
jest.mock('@/core/lib/helpers/error-message', () => ({ logErrorInDev: jest.fn() }));
jest.mock('@/core/hooks/tasks/use-timer-button', () => ({
	useTimerButtonLogic: (args: unknown) => mockUseTimerButtonLogic(args)
}));
jest.mock('@/core/components/features/daily-plan/timer-plan-dialogs', () => ({
	TimerPlanDialogs: () => <div data-testid="plan-dialogs" />
}));

import { TimerTaskStartLayer } from './timer-task-start';

type JotaiStore = ReturnType<typeof createStore>;

const TASK = { id: 'task-1', title: 'Write the diary', status: 'in-progress' } as unknown as TTask;

const CARRY = { isBillable: true, description: 'Review the invoices' };

interface ButtonLogic {
	activeTaskStatus: { running: boolean } | undefined;
	disabled: boolean;
	canTrack: boolean;
	startStopTimerHandler: jest.Mock;
	startTimerWithTask: jest.Mock;
	modals: Record<string, boolean>;
}

function buttonLogicOf(overrides: Partial<ButtonLogic> = {}): ButtonLogic {
	return {
		activeTaskStatus: undefined,
		disabled: false,
		canTrack: true,
		startStopTimerHandler: jest.fn(),
		startTimerWithTask: jest.fn().mockResolvedValue(undefined),
		modals: {},
		...overrides
	};
}

function requestOf(overrides: Partial<TimerTaskStartRequest> = {}): TimerTaskStartRequest {
	return { id: 1, task: TASK, carry: CARRY, ...overrides };
}

/** A run the timers show: its task is one of the active team's. */
function storeWithTimerOn(taskId: string): JotaiStore {
	const store = createStore();
	store.set(timerStatusState, { running: true, lastLog: { id: 'log-running', taskId } } as never);
	store.set(teamTasksState, [{ id: taskId }] as never);
	return store;
}

/** A run the timers do not show: its task is not one of the active team's (another team's, another device's). */
function storeWithHiddenRunOn(taskId: string): JotaiStore {
	const store = createStore();
	store.set(timerStatusState, { running: true, lastLog: { id: 'log-hidden', taskId } } as never);
	return store;
}

async function renderLayer(request: TimerTaskStartRequest | null, logic: ButtonLogic, store: JotaiStore) {
	mockUseTimerButtonLogic.mockReturnValue(logic);
	const view = render(
		<Provider store={store}>
			<TimerTaskStartLayer request={request} />
		</Provider>
	);
	// The start is asked in an effect and its bookkeeping follows the promise it returns
	await act(async () => {});
	return view;
}

afterEach(() => {
	jest.clearAllMocks();
});

describe('TimerTaskStartLayer', () => {
	it('mounts nothing until a start is asked', async () => {
		await renderLayer(null, buttonLogicOf(), createStore());

		expect(screen.queryByTestId('plan-dialogs')).toBeNull();
		expect(mockUseTimerButtonLogic).not.toHaveBeenCalled();
	});

	it("starts another task through its card's start, with the entry's billable status and notes", async () => {
		const store = createStore();
		let notesAtStart: unknown = 'not started';
		const startTimerWithTask = jest.fn(async () => {
			notesAtStart = store.get(timerStartNotesState);
		});

		await renderLayer(requestOf(), buttonLogicOf({ startTimerWithTask }), store);

		expect(mockUseTimerButtonLogic).toHaveBeenCalledWith({ task: TASK });
		expect(startTimerWithTask).toHaveBeenCalledTimes(1);
		expect(store.get(timerBillableChoicesState)).toEqual({ 'task-1': true });
		expect(notesAtStart).toMatchObject({ taskId: 'task-1', description: 'Review the invoices' });
		expect(screen.getByTestId('plan-dialogs')).toBeTruthy();
	});

	it('takes back the notes a held start did not send', async () => {
		const store = createStore();

		await renderLayer(requestOf(), buttonLogicOf(), store);

		expect(store.get(timerStartNotesState)).toBeNull();
	});

	it('sends the active task through the main Start, the notes waiting while its daily plan dialog is open', async () => {
		const store = createStore();
		const logic = buttonLogicOf({
			activeTaskStatus: { running: false },
			modals: { isSuggestDailyPlanModalOpen: true }
		});

		await renderLayer(requestOf({ carry: { isBillable: false, description: 'Standup' } }), logic, store);

		expect(logic.startStopTimerHandler).toHaveBeenCalledTimes(1);
		expect(logic.startTimerWithTask).not.toHaveBeenCalled();
		expect(store.get(timerBillableChoicesState)).toEqual({ 'task-1': false });
		expect(store.get(timerStartNotesState)).toMatchObject({ taskId: 'task-1', description: 'Standup' });
	});

	it('takes back the notes the main Start did not take when it opened no dialog', async () => {
		const store = createStore();
		const logic = buttonLogicOf({ activeTaskStatus: { running: false } });

		await renderLayer(requestOf(), logic, store);

		expect(logic.startStopTimerHandler).toHaveBeenCalledTimes(1);
		expect(store.get(timerStartNotesState)).toBeNull();
	});

	it('takes back the notes once the daily plan dialogs close without a start, and only those', async () => {
		const store = createStore();
		const dialogOpen = buttonLogicOf({
			activeTaskStatus: { running: false },
			modals: { isEnforceTaskModalOpen: true }
		});
		const view = await renderLayer(requestOf(), dialogOpen, store);
		expect(store.get(timerStartNotesState)).toMatchObject({ description: 'Review the invoices' });

		// The enforce prompt is accepted: it closes as today's plan opens, and the start still waits
		mockUseTimerButtonLogic.mockReturnValue({ ...dialogOpen, modals: { isTasksEstimationHoursModalOpen: true } });
		view.rerender(
			<Provider store={store}>
				<TimerTaskStartLayer request={requestOf()} />
			</Provider>
		);
		await act(async () => {});
		expect(store.get(timerStartNotesState)).toMatchObject({ description: 'Review the invoices' });

		// The plan is dismissed without a start
		mockUseTimerButtonLogic.mockReturnValue({ ...dialogOpen, modals: {} });
		view.rerender(
			<Provider store={store}>
				<TimerTaskStartLayer request={requestOf()} />
			</Provider>
		);
		await act(async () => {});
		expect(store.get(timerStartNotesState)).toBeNull();
	});

	it('leaves notes handed by a later continuation alone when its dialog closes', async () => {
		const store = createStore();
		const dialogOpen = buttonLogicOf({
			activeTaskStatus: { running: false },
			modals: { isEnforceTaskModalOpen: true }
		});
		const view = await renderLayer(requestOf(), dialogOpen, store);
		const laterNotes = { taskId: 'task-1', description: 'Another entry', handedAt: Date.now() };
		store.set(timerStartNotesState, laterNotes);

		mockUseTimerButtonLogic.mockReturnValue({ ...dialogOpen, modals: {} });
		view.rerender(
			<Provider store={store}>
				<TimerTaskStartLayer request={requestOf()} />
			</Provider>
		);
		await act(async () => {});

		expect(store.get(timerStartNotesState)).toBe(laterNotes);
	});

	it('takes back the notes when the start goes with its daily plan dialog open', async () => {
		const store = createStore();
		const logic = buttonLogicOf({
			activeTaskStatus: { running: false },
			modals: { isSuggestDailyPlanModalOpen: true }
		});
		const view = await renderLayer(requestOf(), logic, store);

		view.unmount();

		expect(store.get(timerStartNotesState)).toBeNull();
	});

	it('leaves the billable choice alone for a start that continues no entry', async () => {
		const store = createStore();
		store.set(timerBillableChoicesState, { 'task-1': true });
		const logic = buttonLogicOf();

		await renderLayer(requestOf({ carry: null }), logic, store);

		expect(logic.startTimerWithTask).toHaveBeenCalledTimes(1);
		expect(store.get(timerBillableChoicesState)).toEqual({ 'task-1': true });
		expect(store.get(timerStartNotesState)).toBeNull();
	});

	it('says so and starts nothing when the timer already runs on the task', async () => {
		const store = storeWithTimerOn('task-1');
		const logic = buttonLogicOf({ activeTaskStatus: { running: true } });

		await renderLayer(requestOf(), logic, store);

		expect(mockToast.info).toHaveBeenCalledWith('timeEntryActions.ALREADY_RUNNING', expect.anything());
		expect(logic.startStopTimerHandler).not.toHaveBeenCalled();
		expect(logic.startTimerWithTask).not.toHaveBeenCalled();
		expect(store.get(timerBillableChoicesState)).toEqual({});
	});

	it('stops a timer that runs on another task first, as a start from a task card does', async () => {
		const store = storeWithTimerOn('task-9');
		const logic = buttonLogicOf({ activeTaskStatus: { running: true } });

		await renderLayer(requestOf(), logic, store);

		expect(logic.startTimerWithTask).toHaveBeenCalledTimes(1);
		expect(logic.startStopTimerHandler).not.toHaveBeenCalled();
		expect(mockToast.info).not.toHaveBeenCalled();
	});

	it('stops nothing and starts nothing over a run the timer does not show, active task or not', async () => {
		const otherTaskLogic = buttonLogicOf();
		const otherTaskStore = storeWithHiddenRunOn('task-9');

		await renderLayer(requestOf(), otherTaskLogic, otherTaskStore);

		expect(mockToast.warning).toHaveBeenCalledWith('timer.ALREADY_TRACKING_MESSAGE', expect.anything());
		expect(otherTaskLogic.startTimerWithTask).not.toHaveBeenCalled();
		expect(otherTaskLogic.startStopTimerHandler).not.toHaveBeenCalled();
		expect(otherTaskStore.get(timerBillableChoicesState)).toEqual({});
		expect(otherTaskStore.get(timerStartNotesState)).toBeNull();

		const activeTaskLogic = buttonLogicOf({ activeTaskStatus: { running: true } });

		await renderLayer(requestOf({ id: 2 }), activeTaskLogic, storeWithHiddenRunOn('task-9'));

		expect(activeTaskLogic.startTimerWithTask).not.toHaveBeenCalled();
		expect(activeTaskLogic.startStopTimerHandler).not.toHaveBeenCalled();
	});

	it('holds the start back when the daily plan rule does not let the task start', async () => {
		const logic = buttonLogicOf({ canTrack: false });

		await renderLayer(requestOf(), logic, createStore());

		expect(mockToast.warning).toHaveBeenCalledWith('timer.PLAN_REQUIRED_TO_START', expect.anything());
		expect(logic.startTimerWithTask).not.toHaveBeenCalled();
	});

	it('does not start a closed task', async () => {
		const closedTask = { ...TASK, status: 'closed' } as TTask;
		const logic = buttonLogicOf();

		await renderLayer(requestOf({ task: closedTask }), logic, createStore());

		expect(mockToast.warning).toHaveBeenCalledWith('timer.TASK_CLOSED', expect.anything());
		expect(logic.startTimerWithTask).not.toHaveBeenCalled();
	});

	it('runs a request once whatever re-renders follow, and the next request again', async () => {
		const store = createStore();
		const logic = buttonLogicOf();
		const view = await renderLayer(requestOf(), logic, store);

		view.rerender(
			<Provider store={store}>
				<TimerTaskStartLayer request={requestOf()} />
			</Provider>
		);
		await act(async () => {});
		expect(logic.startTimerWithTask).toHaveBeenCalledTimes(1);

		view.rerender(
			<Provider store={store}>
				<TimerTaskStartLayer request={requestOf({ id: 2 })} />
			</Provider>
		);
		await act(async () => {});
		expect(logic.startTimerWithTask).toHaveBeenCalledTimes(2);
	});
});
