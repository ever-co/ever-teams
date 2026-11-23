/**
 * The active task changes while the timer runs.
 *
 * Each timer hook stops a running timer when the active task changes, for the person who switches task. Opening the
 * app changed it too: the team's task sync takes up the task the team names, which the timer runs on, after the
 * person's card or the state saved by the last session named another one, and the app stopped the run. A change to
 * the task the timer runs on, or one made before the API said what runs, stops nothing now.
 *
 * The timer hook, the stores of the session and of the timer, the requests and the HTTP client are the app's own
 * here: only `fetch` is a stand-in for Gauzy, and the status query answers what the test says it read.
 */
import { act, renderHook } from '@testing-library/react-native';
import { AuthenticationStoreModel } from '../../models/authentication-store';
import { TimerStoreModel } from '../../models/timer/timer-store';
import { createFakeGauzy, FakeGauzy } from '../../../test/fake-gauzy-session';
import { useTimer } from './use-timer';

let mockStores: Record<string, unknown> = {};
let mockStatusRead: { isSuccess: boolean; data: unknown } = { isSuccess: false, data: undefined };

jest.mock('../../models', () => ({ useStores: () => mockStores }));
jest.mock('react-native-flash-message', () => ({ showMessage: jest.fn() }));
jest.mock('./features/use-team-tasks', () => ({ useTeamTasks: () => ({ updateTask: jest.fn() }) }));
jest.mock('./features/use-task-statistics', () => ({ useTaskStatistics: () => ({ activeTaskEstimation: 0 }) }));
// What the status query read from the API this session, if anything
jest.mock('../client/queries/timer/timer', () => ({
	__esModule: true,
	default: () => mockStatusRead
}));

const originalFetch = global.fetch;
const START = Date.parse('2026-11-19T09:00:00.000Z');
const HATCH = 'task-repaint-hatch';

let gauzy: FakeGauzy;

/** A status in which Kofi's timer runs on `taskId`. */
function runningOn(taskId: string) {
	return { duration: 0, running: true, lastLog: { ...gauzy.timer(), taskId } as never };
}

/**
 * Kofi's app, whose timer runs on "Repaint maintenance hatch" while `activeTaskId` is the active task. `statusRead`:
 * the API already said what runs, this session. `savedTaskId`: the task the status saved by the last session names.
 */
async function openApp({
	activeTaskId,
	statusRead,
	savedTaskId = HATCH
}: {
	activeTaskId: string;
	statusRead: boolean;
	savedTaskId?: string;
}) {
	const pair = gauzy.signIn();
	const session = AuthenticationStoreModel.create({
		user: null,
		tenantId: 'tenant-1',
		organizationId: 'organization-1'
	});
	session.setAuthToken(pair.token);
	session.setRefreshToken(pair.refresh_token);
	gauzy.runTimer();
	const timerStore = TimerStoreModel.create({
		timerStatus: runningOn(savedTaskId),
		localTimerStatus: { lastTaskId: savedTaskId, runnedDateTime: START, running: true }
	});
	mockStatusRead = statusRead ? { isSuccess: true, data: runningOn(HATCH) } : { isSuccess: false, data: undefined };
	const taskStoreWith = (taskId: string) => ({
		activeTask: { id: taskId, status: 'in-progress' },
		statActiveTask: { total: 0, today: 0 }
	});
	mockStores = {
		authenticationStore: session,
		TimerStore: timerStore,
		TaskStore: taskStoreWith(activeTaskId),
		teamStore: { activeTeamId: 'team-1', activeTeam: { id: 'team-1' } }
	};
	const { result, rerender } = await renderHook(() => useTimer());
	/**
	 * The active task becomes `taskId`, then any stop it asks for reaches the API. `withFirstRead`: in the same render,
	 * the status query reads for the first time that the timer runs on "Repaint maintenance hatch".
	 */
	const makeActive = async (taskId: string, { withFirstRead = false }: { withFirstRead?: boolean } = {}) => {
		if (withFirstRead) {
			mockStatusRead = { isSuccess: true, data: runningOn(HATCH) };
		}
		mockStores = { ...mockStores, TaskStore: taskStoreWith(taskId) };
		await rerender({});
		await act(async () => {
			await jest.advanceTimersByTimeAsync(100);
		});
	};
	/** Stop pressed on the phone. */
	const pressStop = () =>
		act(async () => {
			await result.current.stopTimer();
		});
	/** Start pressed on the phone, on the active task. */
	const pressStart = () =>
		act(async () => {
			await result.current.startTimer();
		});
	return { makeActive, pressStop, pressStart };
}

const stopsSent = () => gauzy.sentTo('POST', '/timesheet/timer/stop');

beforeEach(() => {
	jest.setSystemTime(START);
	jest.spyOn(console, 'error').mockImplementation(() => undefined);
	gauzy = createFakeGauzy();
	global.fetch = gauzy.fetch as unknown as typeof fetch;
});

afterEach(() => {
	global.fetch = originalFetch;
	jest.restoreAllMocks();
});

describe('The active task changes while the timer runs', () => {
	it('goes on when the app takes up the task the timer runs on, after another one', async () => {
		const app = await openApp({ activeTaskId: 'task-inspect-bolts', statusRead: true });

		await app.makeActive(HATCH);

		expect(stopsSent()).toHaveLength(0);
		expect(gauzy.timer()?.isRunning).toBe(true);
	});

	it('goes on when the active task changes before the API said what runs this session', async () => {
		const app = await openApp({ activeTaskId: 'task-inspect-bolts', statusRead: false });

		await app.makeActive('task-check-crane-log');

		expect(stopsSent()).toHaveLength(0);
		expect(gauzy.timer()?.isRunning).toBe(true);
	});

	it('goes on when the first read names the task that becomes active, not the one saved', async () => {
		const app = await openApp({ activeTaskId: 'task-yesterday', statusRead: false, savedTaskId: 'task-yesterday' });

		await app.makeActive(HATCH, { withFirstRead: true });

		expect(stopsSent()).toHaveLength(0);
		expect(gauzy.timer()?.isRunning).toBe(true);
	});

	it('stops on a switch back to the task of the last read, after a stop and a start made here since', async () => {
		const app = await openApp({ activeTaskId: HATCH, statusRead: true });
		await app.pressStop();
		await app.makeActive('task-inspect-bolts');
		await app.pressStart();

		// The last read still says the timer runs on the hatch: the start made here outdates it
		await app.makeActive(HATCH);

		expect(stopsSent()).toHaveLength(2);
		expect(gauzy.timer()?.isRunning).toBe(false);
	});

	it('stops when the active task becomes another one than the task the timer runs on', async () => {
		const app = await openApp({ activeTaskId: HATCH, statusRead: true });

		await app.makeActive('task-inspect-bolts');

		expect(stopsSent()).toHaveLength(1);
		expect(gauzy.timer()?.isRunning).toBe(false);
	});
});
