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

/** Every request waits until the test answers it, as a slow network would. */
function holdRequests() {
	const open: HeldCall[] = [];
	const calls = installFakeFetch(
		(url, init) =>
			new Promise((resolve) => {
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

/** Lets every timer and promise the background started run. */
async function settle(): Promise<void> {
	for (let round = 0; round < 5; round += 1) {
		await new Promise((resolve) => setTimeout(resolve, 0));
	}
}

async function until(condition: () => boolean, what: string): Promise<void> {
	for (let round = 0; round < 100; round += 1) {
		if (condition()) {
			return;
		}
		await new Promise((resolve) => setTimeout(resolve, 0));
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
