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
		assert.deepEqual(popup.received.at(-1), { type: 'statusUpdate', payload: null });
		assert.equal(server.sentTo(SLOT_PATH).length, 0, 'no heartbeat for a session signed out');
	});

	it('keeps the badge cleared when the sign-out lands while an older answer is being shown', async () => {
		const extension = installFakeExtension({ session: SESSION });
		server = holdRequests();
		const { status } = runningServer();
		await startBackground();
		const popup = extension.connect();

		extension.alarms.onAlarm.emit(REFRESH_ALARM);
		const read = await server.next(STATUS_PATH);
		// The answer is the latest when it lands, and the badge starts showing it: its color first
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
		assert.equal(popup.received.length, 0);
		assert.equal(server.sentTo(SLOT_PATH).length, 0);
		(await server.next(STATUS_PATH)).answer(200, { running: false, duration: 0, lastLog: null });
		(await server.next('/status/worked')).answer(200, []);
		await until(() => popup.received.length > 0, "the second person's status told");
		assert.deepEqual(popup.received.at(-1), {
			type: 'statusUpdate',
			payload: { running: false, duration: 0, lastLog: null }
		});
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
