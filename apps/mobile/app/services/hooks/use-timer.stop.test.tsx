/**
 * The person presses Stop on the timer screen.
 *
 * With an access token that had expired, the stop was refused and nothing said so: the screen showed the timer
 * stopped, read `duration` and `isRunning` on the refusal's body, and the timer went on in the API. The stop now goes
 * through, the session being renewed behind it. And a stop the API does refuse leaves the timer shown as running,
 * and tells the person.
 *
 * The timer hook, the stores of the session and of the timer, the requests and the HTTP client are the app's own
 * here: only `fetch` is a stand-in for Gauzy.
 */
import { act, renderHook } from '@testing-library/react-native';
import { showMessage } from 'react-native-flash-message';
import { AuthenticationStore, AuthenticationStoreModel } from '../../models/authentication-store';
import { TimerStore, TimerStoreModel } from '../../models/timer/timer-store';
import { createFakeGauzy, FakeGauzy, HOUR_MS } from '../../../test/fake-gauzy-session';
import { useTimer } from './use-timer';

let mockStores: Record<string, unknown> = {};

jest.mock('../../models', () => ({ useStores: () => mockStores }));
jest.mock('react-native-flash-message', () => ({ showMessage: jest.fn() }));
// What the timer hook reads beside the session and the timer themselves
jest.mock('./features/use-team-tasks', () => ({ useTeamTasks: () => ({ updateTask: jest.fn() }) }));
jest.mock('./features/use-task-statistics', () => ({ useTaskStatistics: () => ({ activeTaskEstimation: 0 }) }));
// The status is polled by a query of its own: the hook is only asked to stop here
jest.mock('../client/queries/timer/timer', () => ({
	__esModule: true,
	default: () => ({ isSuccess: false, data: undefined })
}));

const originalFetch = global.fetch;
const START = Date.parse('2026-11-14T09:00:00.000Z');

let gauzy: FakeGauzy;
let session: AuthenticationStore;
let timerStore: TimerStore;

/** The timer screen of a signed-in person whose timer runs. */
async function openTimerScreen() {
	const pair = gauzy.signIn();
	session = AuthenticationStoreModel.create({ user: null, tenantId: 'tenant-1', organizationId: 'organization-1' });
	session.setAuthToken(pair.token);
	session.setRefreshToken(pair.refresh_token);
	const runningLog = gauzy.runTimer();
	timerStore = TimerStoreModel.create({
		timerStatus: { duration: 0, running: true, lastLog: runningLog as never },
		localTimerStatus: { lastTaskId: 'task-1', runnedDateTime: START - 30 * 60 * 1000, running: true }
	});
	mockStores = {
		authenticationStore: session,
		TimerStore: timerStore,
		TaskStore: { activeTask: { id: 'task-1', status: 'in-progress' }, statActiveTask: { total: 0, today: 0 } },
		teamStore: { activeTeamId: 'team-1', activeTeam: { id: 'team-1' } }
	};
	const { result } = await renderHook(() => useTimer());
	const pressStop = () =>
		act(async () => {
			await result.current.stopTimer();
		});
	return { pressStop };
}

beforeEach(() => {
	jest.setSystemTime(START);
	(showMessage as jest.Mock).mockClear();
	jest.spyOn(console, 'error').mockImplementation(() => undefined);
	gauzy = createFakeGauzy();
	global.fetch = gauzy.fetch as unknown as typeof fetch;
});

afterEach(() => {
	global.fetch = originalFetch;
	jest.restoreAllMocks();
});

describe('Stop pressed on the timer screen', () => {
	it('stops the timer although the access token expired, and says nothing: the session is renewed behind it', async () => {
		const screen = await openTimerScreen();
		// The app stayed open past the access token's lifetime
		jest.setSystemTime(START + 25 * HOUR_MS);

		await screen.pressStop();

		expect(gauzy.timer()?.isRunning).toBe(false);
		expect(timerStore.timerStatus.running).toBe(false);
		expect(timerStore.localTimerStatus.running).toBe(false);
		expect(gauzy.sentTo('POST', '/auth/refresh-token')).toHaveLength(1);
		expect(session.isAuthenticated).toBe(true);
		expect(showMessage).not.toHaveBeenCalled();
	});

	it('leaves the timer shown as running, and tells the person, when the API refuses the stop', async () => {
		const screen = await openTimerScreen();
		gauzy.breakStop();

		await screen.pressStop();

		// The timer still runs in the API: the screen says the same, and goes on counting
		expect(gauzy.timer()?.isRunning).toBe(true);
		expect(timerStore.timerStatus.running).toBe(true);
		expect(timerStore.localTimerStatus.running).toBe(true);
		expect(timerStore.localTimerStatus.runnedDateTime).toBeGreaterThan(0);
		expect(showMessage).toHaveBeenCalledTimes(1);
		expect(showMessage).toHaveBeenCalledWith(
			expect.objectContaining({ message: expect.stringContaining('timer.stopFailedTitle'), type: 'danger' })
		);
	});

	it('says the session ended, not that the stop failed, when the API no longer renews the session', async () => {
		const screen = await openTimerScreen();
		gauzy.endSession();

		await screen.pressStop();

		expect(session.isAuthenticated).toBe(false);
		expect(showMessage).toHaveBeenCalledTimes(1);
		expect(showMessage).toHaveBeenCalledWith(
			expect.objectContaining({ message: expect.stringContaining('session.endedTitle'), type: 'warning' })
		);
	});

	it('says nothing when the timer was already stopped from another device: the screen then shows it stopped', async () => {
		const screen = await openTimerScreen();
		// Stopped from the web app meanwhile: Gauzy answers 406 to a stop with nothing running
		await gauzy.fetch('/api/timesheet/timer/stop', {
			method: 'POST',
			headers: { authorization: `Bearer ${session.authToken}` }
		});

		await screen.pressStop();

		expect(timerStore.localTimerStatus.running).toBe(false);
		expect(showMessage).not.toHaveBeenCalled();
	});
});
