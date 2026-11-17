import assert from 'node:assert/strict';
import { afterEach, describe, it, mock } from 'node:test';

import { installFakeExtension, installFakeFetch } from './fake-chrome.ts';
import type { Session } from '../lib/workspaces.ts';

const SESSION: Session = {
	apiUrl: 'https://api.example.test',
	token: 'access-1',
	refreshToken: 'refresh-1',
	userId: 'user-1',
	email: 'marie@example.test',
	name: 'Marie Curie',
	tenantId: 'tenant-1',
	organizationId: 'organization-1',
	employeeId: 'employee-1',
	teams: [],
	teamId: 'team-1'
};

const REFRESH_ALARM = { name: 'refresh-timer-status' };
const STATUS_PATH = '/api/timesheet/timer/status?';
const SLOT_PATH = '/api/timesheet/time-slot';

/** A run started here five minutes ago, its last heartbeat a minute ago: the server moves it with each heartbeat. */
function runningServer() {
	const run = {
		id: 'log-1',
		startedAt: new Date(Date.now() - 5 * 60_000).toISOString(),
		stoppedAt: new Date(Date.now() - 60_000).toISOString(),
		isRunning: true,
		source: 'BROWSER_EXTENSION'
	};
	return {
		run,
		status: () => ({ running: true, duration: 300, lastLog: { ...run } }),
		creditSlot: () => {
			run.stoppedAt = new Date().toISOString();
		}
	};
}

interface HeldCall {
	url: string;
	body: unknown;
	answer: (status: number, body?: unknown) => void;
	/** The network fails, as offline. */
	fail: () => void;
}

/** Every request waits until the test answers it, as a slow network would; an aborted one fails, as fetch does. */
function holdRequests() {
	const open: HeldCall[] = [];
	const calls = installFakeFetch(
		(url, init) =>
			new Promise((resolve, reject) => {
				init.signal?.addEventListener('abort', () => {
					open.splice(open.indexOf(call), 1);
					reject(init.signal?.reason);
				});
				const call: HeldCall = {
					url,
					body: typeof init.body === 'string' ? JSON.parse(init.body) : undefined,
					answer: (status, body) => {
						open.splice(open.indexOf(call), 1);
						resolve({ status, body });
					},
					fail: () => {
						open.splice(open.indexOf(call), 1);
						reject(new TypeError('Failed to fetch'));
					}
				};
				open.push(call);
			})
	);
	const openTo = (path: string) => open.filter((call) => call.url.includes(path));
	return {
		calls,
		openTo,
		sentTo: (path: string) => calls.filter((call) => call.url.includes(path)),
		/** The first request to `path` still waiting for its answer, once the code under test sent it. */
		next: async (path: string): Promise<HeldCall> => {
			await until(() => openTo(path).length > 0, `a request to ${path}`);
			return openTo(path)[0];
		},
		answerAll: async (status = 200, body: unknown = {}) => {
			for (let round = 0; round < 50 && open.length > 0; round += 1) {
				for (const call of [...open]) {
					call.answer(status, body);
				}
				await settle();
			}
		}
	};
}

// setImmediate, not setTimeout: one test moves the timers on itself (mock.timers)
const turn = () => new Promise((resolve) => setImmediate(resolve));

/** Lets every timer and promise the background started run. */
async function settle(): Promise<void> {
	for (let round = 0; round < 20; round += 1) {
		await turn();
	}
}

async function until(condition: () => boolean, what: string): Promise<void> {
	for (let round = 0; round < 500; round += 1) {
		if (condition()) {
			return;
		}
		await turn();
	}
	assert.fail(`timed out waiting for ${what}`);
}

let instance = 0;

/** A fresh background (its own ports and read order) listening to the extension API installed last. */
async function startBackground(): Promise<void> {
	instance += 1;
	await import(`../background.ts?instance=${instance}`);
}

let server: ReturnType<typeof holdRequests> | null = null;

afterEach(async () => {
	// Nothing of a test may still be on its way when the next one installs its own extension API
	mock.timers.reset();
	await server?.answerAll();
	server = null;
	mock.restoreAll();
});

describe('the background timer', () => {
	it('keeps the badge cleared when a read sent before a sign-out answers after it', async () => {
		const extension = installFakeExtension({ session: SESSION });
		server = holdRequests();
		const { status } = runningServer();
		await startBackground();
		const popup = extension.connect();

		extension.alarms.onAlarm.emit(REFRESH_ALARM);
		const read = await server.next(STATUS_PATH);
		// The person signs out while the alarm's read is out: the background clears the badge
		await (globalThis as unknown as { chrome: typeof chrome }).chrome.storage.local.remove(['session']);
		await until(() => extension.badge.history.length > 0, 'the badge cleared after the sign-out');

		read.answer(200, status());
		await settle();

		assert.equal(extension.badge.text, '');
		assert.deepEqual(extension.badge.colors, [], 'the older answer set no color either');
		assert.deepEqual(popup.received.at(-1), { type: 'statusUpdate', payload: null });
		assert.equal(server.sentTo(SLOT_PATH).length, 0, 'no heartbeat for a session signed out');
	});

	it("sets the badge's color and text together, after one check that the status is still the newest", async () => {
		const extension = installFakeExtension({ session: SESSION });
		server = holdRequests();
		const { status } = runningServer();
		await startBackground();

		const releaseColor = extension.badge.holdColor();
		extension.runtime.onStartup.emit();
		(await server.next(STATUS_PATH)).answer(200, status());
		// The text is not sent after the color: nothing can come between the check and either of them
		await until(() => extension.badge.text === '0:05', 'the run shown while the color is still being set');
		assert.deepEqual(extension.badge.colors, ['#6366f1']);
		releaseColor();
		await settle();
		assert.equal(extension.badge.text, '0:05');
	});

	it('signs out once when the API refuses the session and the renewal cannot cure it', async () => {
		const extension = installFakeExtension({ session: SESSION });
		server = holdRequests();
		const { status } = runningServer();
		await startBackground();
		const popup = extension.connect();
		extension.runtime.onStartup.emit();
		(await server.next(STATUS_PATH)).answer(200, status());
		await until(() => extension.badge.text === '0:05', 'the run shown');

		extension.alarms.onAlarm.emit(REFRESH_ALARM);
		(await server.next(STATUS_PATH)).answer(401, { message: 'Unauthorized' });
		(await server.next('/auth/refresh-token')).answer(401, { message: 'Unauthorized' });
		await until(() => !extension.stored.has('session'), 'the session taken out');
		// The same sign-out reaches the background again by its storage event, then by each alarm while signed out
		await until(() => extension.storageEvents.told > 0, 'the sign-out told');
		extension.alarms.onAlarm.emit(REFRESH_ALARM);
		await settle();

		assert.equal(extension.badge.text, '');
		const signedOut = popup.received.filter((message) => (message as { payload: unknown }).payload === null);
		assert.equal(signedOut.length, 1, 'the popups hear the sign-out once');
		assert.equal(server.sentTo(SLOT_PATH).length, 0, 'no heartbeat for a session refused');
	});

	it('signs nobody out when a read or a heartbeat ends at its deadline or offline: only a 401 does', async () => {
		mock.timers.enable({ apis: ['setTimeout'] });
		mock.method(console, 'warn', () => undefined);
		const extension = installFakeExtension({ session: SESSION });
		server = holdRequests();
		const { status } = runningServer();
		await startBackground();

		// A read that never answers, cancelled at its deadline
		extension.alarms.onAlarm.emit(REFRESH_ALARM);
		await server.next(STATUS_PATH);
		mock.timers.tick(30_000);
		await settle();
		// A read that cannot reach the API
		extension.alarms.onAlarm.emit(REFRESH_ALARM);
		(await server.next(STATUS_PATH)).fail();
		await settle();
		// A heartbeat that never answers, cancelled at its deadline
		extension.alarms.onAlarm.emit(REFRESH_ALARM);
		(await server.next(STATUS_PATH)).answer(200, status());
		await server.next(SLOT_PATH);
		mock.timers.tick(30_000);
		await settle();

		assert.equal(server.openTo('/api/').length, 0, 'every call ended');
		assert.ok(extension.stored.has('session'), 'still signed in');
		assert.equal(server.sentTo('/auth/refresh-token').length, 0, 'no renewal: nothing was refused');
		assert.equal(extension.badge.text, '0:05');
	});

	it('keeps the badge cleared when the sign-out lands while an older answer is being shown', async () => {
		const extension = installFakeExtension({ session: SESSION });
		server = holdRequests();
		const { status } = runningServer();
		await startBackground();
		const popup = extension.connect();

		extension.alarms.onAlarm.emit(REFRESH_ALARM);
		const read = await server.next(STATUS_PATH);
		// The answer is the latest when it lands, and the badge starts showing it: its color is still being set
		const releaseColor = extension.badge.holdColor();
		read.answer(200, status());
		await settle();
		await (globalThis as unknown as { chrome: typeof chrome }).chrome.storage.local.remove(['session']);
		await until(() => extension.badge.history.includes(''), 'the badge cleared after the sign-out');
		releaseColor();
		await settle();

		assert.equal(extension.badge.text, '');
		assert.deepEqual(popup.received.at(-1), { type: 'statusUpdate', payload: null });
		assert.equal(server.sentTo(SLOT_PATH).length, 0, 'no heartbeat for a session signed out');
	});

	it("drops a read made for one person once another person's session is stored", async () => {
		const extension = installFakeExtension({ session: SESSION });
		server = holdRequests();
		const { status } = runningServer();
		await startBackground();
		const popup = extension.connect();

		extension.alarms.onAlarm.emit(REFRESH_ALARM);
		const read = await server.next(STATUS_PATH);
		// Another person's session is stored while the first person's read is out (the background missed the sign-out)
		const other = { ...SESSION, userId: 'user-2', email: 'pierre@example.test', token: 'access-2' };
		await (globalThis as unknown as { chrome: typeof chrome }).chrome.storage.local.set({ session: other });
		await until(() => extension.storageEvents.told > 0, 'the session change told');
		read.answer(200, status());
		await settle();

		assert.notEqual(extension.badge.text, '0:05', "the first person's run is not shown");
		// The popups hear the first person's status cleared, never the answer of the read made for them
		assert.deepEqual(popup.received, [{ type: 'statusUpdate', payload: null }]);
		assert.equal(server.sentTo(SLOT_PATH).length, 0);
		(await server.next(STATUS_PATH)).answer(200, { running: false, duration: 0, lastLog: null });
		(await server.next('/status/worked')).answer(200, []);
		await until(() => popup.received.length > 1, "the second person's status told");
		assert.deepEqual(popup.received.at(-1), {
			type: 'statusUpdate',
			payload: { running: false, duration: 0, lastLog: null }
		});
	});

	it("clears the first person's badge once another person's session is stored, though the new read fails", async () => {
		const extension = installFakeExtension({ session: SESSION });
		server = holdRequests();
		const { status } = runningServer();
		await startBackground();
		const popup = extension.connect();

		extension.runtime.onStartup.emit();
		(await server.next(STATUS_PATH)).answer(200, status());
		await until(() => extension.badge.text === '0:05', "the first person's run shown");

		const other = { ...SESSION, userId: 'user-2', email: 'pierre@example.test', token: 'access-2' };
		await (globalThis as unknown as { chrome: typeof chrome }).chrome.storage.local.set({ session: other });
		await until(() => extension.storageEvents.told > 0, 'the session change told');
		(await server.next(STATUS_PATH)).fail();
		await settle();

		assert.equal(extension.badge.text, '');
		assert.deepEqual(popup.received.at(-1), { type: 'statusUpdate', payload: null });
	});

	it('keeps a read when the session changes for the same person (a renewed token, another team)', async () => {
		const extension = installFakeExtension({ session: SESSION });
		server = holdRequests();
		const { status } = runningServer();
		await startBackground();

		extension.alarms.onAlarm.emit(REFRESH_ALARM);
		const read = await server.next(STATUS_PATH);
		await (globalThis as unknown as { chrome: typeof chrome }).chrome.storage.local.set({
			session: { ...SESSION, token: 'access-2', teamId: 'team-2' }
		});
		await until(() => extension.storageEvents.told > 0, 'the session change told');
		read.answer(200, status());
		await until(() => extension.badge.text === '0:05', 'the run shown');
		assert.equal(server.sentTo(SLOT_PATH).length, 1, 'the alarm still credits its minute');
	});

	it("keeps the badge cleared when the sign-out lands while a popup's report is being shown", async () => {
		const extension = installFakeExtension({ session: SESSION });
		server = holdRequests();
		const { status } = runningServer();
		await startBackground();
		const popup = extension.connect();

		const releaseColor = extension.badge.holdColor();
		popup.onMessage.emit({ type: 'statusRead', payload: status() });
		await settle();
		await (globalThis as unknown as { chrome: typeof chrome }).chrome.storage.local.remove(['session']);
		await until(() => extension.badge.history.includes(''), 'the badge cleared after the sign-out');
		releaseColor();
		await settle();

		assert.equal(extension.badge.text, '');
	});

	it('gives up a read that never ends, so the alarms after it still read the timer', async () => {
		mock.timers.enable({ apis: ['setTimeout'] });
		const extension = installFakeExtension({ session: SESSION });
		server = holdRequests();
		const { status } = runningServer();
		await startBackground();

		extension.alarms.onAlarm.emit(REFRESH_ALARM);
		await server.next(STATUS_PATH);
		extension.alarms.onAlarm.emit(REFRESH_ALARM);
		await settle();
		assert.equal(server.sentTo(STATUS_PATH).length, 1);

		// The first read never answers: past its deadline it is cancelled, and the alarm waiting behind it reads
		mock.timers.tick(60_000);
		await until(() => server!.sentTo(STATUS_PATH).length === 2, 'the read of the alarm that waited');
		assert.equal(server.openTo(STATUS_PATH).length, 1, 'the stalled read was cancelled');
		(await server.next(STATUS_PATH)).answer(200, status());
		await until(() => extension.badge.text === '0:05', 'the badge shows the run');
	});

	it('gives up a renewal still waiting for the session lock at the deadline, so the alarms after it read', async () => {
		mock.timers.enable({ apis: ['setTimeout'] });
		const extension = installFakeExtension({ session: SESSION });
		server = holdRequests();
		const { status } = runningServer();
		await startBackground();
		// Another view holds the session lock (its own renewal) for longer than the read may take
		let releaseLock = () => undefined as void;
		const lockHeld = new Promise<void>((resolve) => {
			releaseLock = resolve;
		});
		void navigator.locks.request('ever-teams-session', () => lockHeld);

		extension.alarms.onAlarm.emit(REFRESH_ALARM);
		(await server.next(STATUS_PATH)).answer(401, { message: 'Unauthorized' });
		extension.alarms.onAlarm.emit(REFRESH_ALARM);
		await settle();
		assert.equal(server.sentTo(STATUS_PATH).length, 1);

		mock.timers.tick(60_000);
		await until(() => server!.sentTo(STATUS_PATH).length === 2, 'the read of the alarm that waited');
		releaseLock();
		await settle();
		(await server.next(STATUS_PATH)).answer(200, status());
		await until(() => extension.badge.text === '0:05', 'the badge shows the run');
		assert.ok(extension.stored.has('session'), 'a renewal given up signs nobody out');
	});

	it('still tells the other popups when the port of one is gone, and posts no more to that one', async () => {
		const extension = installFakeExtension({ session: SESSION });
		server = holdRequests();
		const { status } = runningServer();
		await startBackground();
		const closed = extension.connect({ gone: true });
		const closedPost = mock.method(closed, 'postMessage');
		const open = extension.connect();

		extension.runtime.onStartup.emit();
		(await server.next(STATUS_PATH)).answer(200, status());
		await until(() => open.received.length > 0, 'the open popup told the status');
		extension.runtime.onStartup.emit();
		(await server.next(STATUS_PATH)).answer(200, status());
		await until(() => open.received.length > 1, 'the open popup told the second status');

		assert.equal(open.received.length, 2);
		assert.equal(closedPost.mock.callCount(), 1);
		assert.equal(extension.badge.text, '0:05');
	});

	it('sends one read at a time: alarms during a read make one more read after it, which credits no time twice', async () => {
		const extension = installFakeExtension({ session: SESSION });
		server = holdRequests();
		const remote = runningServer();
		await startBackground();

		extension.alarms.onAlarm.emit(REFRESH_ALARM);
		const first = await server.next(STATUS_PATH);
		extension.alarms.onAlarm.emit(REFRESH_ALARM);
		extension.alarms.onAlarm.emit(REFRESH_ALARM);
		await settle();
		assert.equal(server.openTo(STATUS_PATH).length, 1, 'one read on its way');

		first.answer(200, remote.status());
		const heartbeat = await server.next(SLOT_PATH);
		await settle();
		assert.equal(server.openTo(STATUS_PATH).length, 0, 'no read while the heartbeat is on its way');

		remote.creditSlot();
		heartbeat.answer(200, {});
		(await server.next(STATUS_PATH)).answer(200, remote.status());
		await settle();

		assert.equal(server.sentTo(STATUS_PATH).length, 2);
		const credited = server
			.sentTo(SLOT_PATH)
			.reduce((sum, call) => sum + (call.body as { duration: number }).duration, 0);
		assert.ok(credited >= 59 && credited <= 61, `credited ${credited} seconds for one minute`);
		assert.equal(extension.badge.text, '0:05');
	});

	it('reports a badge that could not be set, and sets it at the next alarm', async () => {
		const extension = installFakeExtension({ session: SESSION });
		server = holdRequests();
		const { status } = runningServer();
		const warn = mock.method(console, 'warn', () => undefined);
		await startBackground();

		extension.badge.failNextText = true;
		extension.runtime.onStartup.emit();
		(await server.next(STATUS_PATH)).answer(200, status());
		await until(() => warn.mock.callCount() > 0, 'the failed badge reported');
		assert.match(String(warn.mock.calls[0].arguments[0]), /badge/i);

		extension.runtime.onStartup.emit();
		(await server.next(STATUS_PATH)).answer(200, status());
		await until(() => extension.badge.text === '0:05', 'the badge set at the next refresh');
	});

	it('reports a failed heartbeat as such, and keeps the badge on the run and the person signed in', async () => {
		const extension = installFakeExtension({ session: SESSION });
		server = holdRequests();
		const { status } = runningServer();
		const warn = mock.method(console, 'warn', () => undefined);
		await startBackground();

		extension.alarms.onAlarm.emit(REFRESH_ALARM);
		(await server.next(STATUS_PATH)).answer(200, status());
		(await server.next(SLOT_PATH)).answer(503, { message: 'Service Unavailable' });
		await until(() => warn.mock.callCount() > 0, 'the failed heartbeat reported');

		assert.match(String(warn.mock.calls[0].arguments[0]), /heartbeat/i);
		assert.match(String(warn.mock.calls[0].arguments[0]), /log-1/);
		assert.match(String(warn.mock.calls[0].arguments[0]), /503/);
		assert.equal(extension.badge.text, '0:05');
		assert.ok(extension.stored.has('session'));
	});
});

describe("the popup's stop, through the background", () => {
	const STOP_PATH = '/api/timesheet/timer/stop';
	const STOP_RUN = { type: 'stopRun', payload: { id: 'log-1', source: 'BROWSER_EXTENSION' } };
	const creditedSeconds = () =>
		server!.sentTo(SLOT_PATH).reduce((sum, call) => sum + (call.body as { duration: number }).duration, 0);

	it("credits a run's last seconds once when Stop is pressed while the alarm's heartbeat is on its way", async () => {
		const extension = installFakeExtension({ session: SESSION });
		server = holdRequests();
		const remote = runningServer();
		await startBackground();
		extension.alarms.onAlarm.emit(REFRESH_ALARM);
		(await server.next(STATUS_PATH)).answer(200, remote.status());
		const heartbeat = await server.next(SLOT_PATH);

		// Stop is pressed now: its last credit waits for the heartbeat, rather than read the same last heartbeat
		const answer = extension.sendMessage(STOP_RUN);
		await settle();
		assert.equal(server.openTo(STATUS_PATH).length, 0, 'no read for the stop while the heartbeat is on its way');
		remote.creditSlot();
		heartbeat.answer(200, {});

		// The stop reads the run afresh: its last heartbeat just landed, so nothing is left to credit
		(await server.next(STATUS_PATH)).answer(200, remote.status());
		(await server.next(STOP_PATH)).answer(200, {});
		assert.deepEqual(await answer, { stopped: true });
		const credited = creditedSeconds();
		assert.ok(credited >= 59 && credited <= 61, `credited ${credited} seconds for one minute`);
		assert.equal(server.sentTo(SLOT_PATH).length, 1);
		assert.deepEqual(server.sentTo(STOP_PATH)[0].body, {
			tenantId: 'tenant-1',
			organizationId: 'organization-1',
			logType: 'TRACKED',
			source: 'BROWSER_EXTENSION',
			timeLogId: 'log-1'
		});
	});

	it('lets an alarm that comes during a stop wait for it: the run stopped gets no heartbeat after its last credit', async () => {
		const extension = installFakeExtension({ session: SESSION });
		server = holdRequests();
		const remote = runningServer();
		await startBackground();

		const answer = extension.sendMessage(STOP_RUN);
		const read = await server.next(STATUS_PATH);
		extension.alarms.onAlarm.emit(REFRESH_ALARM);
		await settle();
		assert.equal(server.openTo(STATUS_PATH).length, 1, "the alarm's read waits for the stop");

		read.answer(200, remote.status());
		remote.creditSlot();
		(await server.next(SLOT_PATH)).answer(200, {});
		(await server.next(STOP_PATH)).answer(200, {});
		assert.deepEqual(await answer, { stopped: true });

		// The alarm reads the run once it is stopped: nothing to credit
		(await server.next(STATUS_PATH)).answer(200, { running: false, duration: 360, lastLog: null });
		(await server.next('/status/worked')).answer(200, []);
		await settle();
		const credited = creditedSeconds();
		assert.ok(credited >= 59 && credited <= 61, `credited ${credited} seconds for one minute`);
		assert.equal(server.sentTo(SLOT_PATH).length, 1);
	});

	it("credits nothing for a run started by another app, and answers the API's refusal of the stop", async () => {
		const extension = installFakeExtension({ session: SESSION });
		server = holdRequests();
		await startBackground();

		const answer = extension.sendMessage({ type: 'stopRun', payload: { id: 'log-1', source: 'TEAMS' } });
		(await server.next(STOP_PATH)).answer(409, { message: 'Another run is going on', code: 'TIMER_CHANGED' });

		assert.deepEqual(await answer, {
			stopped: false,
			failure: { status: 409, message: 'Another run is going on', code: 'TIMER_CHANGED' }
		});
		assert.equal(server.sentTo(STATUS_PATH).length, 0, 'no read for a run whose time another app keeps');
		assert.equal(server.sentTo(SLOT_PATH).length, 0);
		assert.equal((server.sentTo(STOP_PATH)[0].body as { source: string }).source, 'TEAMS');
	});

	it('credits nothing to a run stopped meanwhile from elsewhere, and sends the stop all the same', async () => {
		const extension = installFakeExtension({ session: SESSION });
		server = holdRequests();
		const remote = runningServer();
		await startBackground();

		const answer = extension.sendMessage(STOP_RUN);
		// The run was stopped from another app a minute ago: credited now, it would get the minute since its stop
		const stopped = { ...remote.run, isRunning: false };
		(await server.next(STATUS_PATH)).answer(200, { running: false, duration: 300, lastLog: stopped });
		(await server.next('/status/worked')).answer(200, [{ lastLog: stopped }]);
		(await server.next(STOP_PATH)).answer(200, {});

		assert.deepEqual(await answer, { stopped: true });
		assert.equal(server.sentTo(SLOT_PATH).length, 0);
	});

	it('signs out when the read of the last credit is refused and the renewal cannot cure it, and still sends the stop', async () => {
		const extension = installFakeExtension({ session: SESSION });
		server = holdRequests();
		await startBackground();

		const answer = extension.sendMessage(STOP_RUN);
		(await server.next(STATUS_PATH)).answer(401, { message: 'Unauthorized' });
		(await server.next('/auth/refresh-token')).answer(401, { message: 'Unauthorized' });
		await until(() => !extension.stored.has('session'), 'the session taken out');
		(await server.next(STOP_PATH)).answer(401, { message: 'Unauthorized' });
		await server.answerAll(401, { message: 'Unauthorized' });

		const answered = (await answer) as { stopped: boolean; failure?: { status: number } };
		assert.equal(answered.stopped, false);
		assert.equal(answered.failure?.status, 401);
		assert.equal(server.sentTo(SLOT_PATH).length, 0);
		// The sign-out reaches the background by its storage event too: told before the next test's extension API
		await until(() => extension.storageEvents.told > 0, 'the sign-out told');
		await settle();
	});

	it("stops nothing for a message a web page's script sent, and leaves other messages alone", async () => {
		const extension = installFakeExtension({ session: SESSION });
		server = holdRequests();
		await startBackground();

		assert.equal(await extension.sendMessage(STOP_RUN, { tab: { id: 7 } }), undefined);
		assert.equal(await extension.sendMessage({ type: 'stopRun', payload: {} }), undefined);
		assert.equal(await extension.sendMessage({ type: 'somethingElse' }), undefined);
		await settle();

		assert.equal(server.calls.length, 0);
	});

	it('answers a stop asked for once signed out as an expired session, and sends nothing', async () => {
		const extension = installFakeExtension({});
		server = holdRequests();
		await startBackground();

		const answer = (await extension.sendMessage(STOP_RUN)) as { stopped: boolean; failure?: { status: number } };

		assert.equal(answer.stopped, false);
		assert.equal(answer.failure?.status, 401);
		assert.equal(server.sentTo(STOP_PATH).length, 0);
	});
});
