/**
 * The clock of a running timer counts from the run's start.
 *
 * It counted from the moment the entry was created, so a start moved on the web (ever-co/ever-teams#5266) or on the
 * phone never showed on the phone: Marie, who started at 9:25 and moved her start to 9:00, kept seeing 9:25 here.
 * The clock now follows the run's `startedAt`, which every status read carries.
 */
import { act, renderHook } from '@testing-library/react-native';
import { TimerStore, TimerStoreModel } from '../../models/timer/timer-store';
import { TimerSource } from '../interfaces/ITimer';
import { useTimer } from './use-timer';

let mockStores: Record<string, unknown> = {};

jest.mock('../../models', () => ({ useStores: () => mockStores }));
jest.mock('react-native-flash-message', () => ({ showMessage: jest.fn() }));
jest.mock('./features/use-team-tasks', () => ({ useTeamTasks: () => ({ updateTask: jest.fn() }) }));
jest.mock('./features/use-task-statistics', () => ({ useTaskStatistics: () => ({ activeTaskEstimation: 0 }) }));
// The status is polled by a query of its own: here the timer store holds what the last read answered
jest.mock('../client/queries/timer/timer', () => ({
	__esModule: true,
	default: () => ({ isSuccess: false, data: undefined })
}));

const CREATED_AT = '2026-11-16T09:25:00.000Z';
const NOW = Date.parse('2026-11-16T09:30:00.000Z');

let timerStore: TimerStore;

/** A status read of Marie's running timer, whose entry was created at 9:25 and which starts at `startedAt`. */
function runningStatus(startedAt: string) {
	return {
		duration: 0,
		running: true,
		lastLog: {
			id: 'log-running',
			startedAt,
			createdAt: CREATED_AT,
			duration: 0,
			isRunning: true,
			source: TimerSource.MOBILE
		} as never
	};
}

/** Lets the status effect read the local timer, which it does asynchronously, and write the clock's start. */
async function settle() {
	await act(async () => {
		await Promise.resolve();
		await Promise.resolve();
	});
}

async function openTimerScreen(startedAt: string) {
	timerStore = TimerStoreModel.create({
		timerStatus: runningStatus(startedAt),
		localTimerStatus: { lastTaskId: 'task-1', runnedDateTime: Date.parse(CREATED_AT), running: true }
	});
	mockStores = {
		authenticationStore: {
			tenantId: 'tenant-1',
			organizationId: 'organization-1',
			authToken: 'token',
			user: { employee: { id: 'employee-1' } }
		},
		TimerStore: timerStore,
		TaskStore: { activeTask: { id: 'task-1', status: 'in-progress' }, statActiveTask: { total: 0, today: 0 } },
		teamStore: { activeTeamId: 'team-1', activeTeam: { id: 'team-1' } }
	};
	const view = await renderHook(() => useTimer());
	await settle();
	return view;
}

beforeEach(() => {
	jest.setSystemTime(NOW);
});

describe('The clock of a running timer', () => {
	it("counts from the run's start, not from when its entry was created", async () => {
		await openTimerScreen('2026-11-16T09:00:00.000Z');

		expect(timerStore.localTimerStatus.runnedDateTime).toBe(Date.parse('2026-11-16T09:00:00.000Z'));
	});

	it('follows a start moved elsewhere at the next status read', async () => {
		const { rerender } = await openTimerScreen('2026-11-16T09:25:00.000Z');

		// Marie moved her start to 9:00 on the web: the next status read says so
		await act(async () => {
			timerStore.setTimerStatus(runningStatus('2026-11-16T09:00:00.000Z'));
		});
		await rerender({});
		await settle();

		expect(timerStore.localTimerStatus.runnedDateTime).toBe(Date.parse('2026-11-16T09:00:00.000Z'));
	});

	it('counts the worked seconds again from a start moved later, so they shrink with the clock', async () => {
		const { rerender } = await openTimerScreen('2026-11-16T09:00:00.000Z');
		// The screen renders again as the stores change (its components observe them): the hook here is told so
		const renderAgain = async () => {
			await rerender({});
			await rerender({});
		};
		/** The clock runs for a second, and the screen renders what it counted. */
		const clockRunsASecond = async () => {
			await act(async () => {
				jest.advanceTimersByTime(1000);
			});
			await renderAgain();
		};
		await renderAgain();
		await clockRunsASecond();
		// 30 minutes and a second since 9:00
		expect(timerStore.timerSecondsState).toBeGreaterThanOrEqual(30 * 60);

		// The start moves to 9:25: five minutes worked, not thirty
		await act(async () => {
			timerStore.setTimerStatus(runningStatus('2026-11-16T09:25:00.000Z'));
		});
		await renderAgain();
		await settle();
		await renderAgain();
		await clockRunsASecond();

		expect(timerStore.timerSecondsState).toBeLessThan(6 * 60);
	});
});
