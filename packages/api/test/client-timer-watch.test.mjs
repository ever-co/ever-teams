// timer.watch of createClient, against the built package: node --test test/*.test.mjs (from packages/api, after
// `rollup -c`). node:test's fake timers drive the interval; a stand-in API answers the status the test sets, and a
// stand-in document and window give a page's visibility and network events where a test needs them.
import { test, mock, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createClient, EverTeamsError, EverTeamsServerError } from '../dist/index.es.js';
import { API_URL, json, standInApi } from './support/stand-in-api.mjs';

const STARTED_AT = '2026-11-18T09:00:00.000Z';

const RUNNING = {
	duration: 60,
	running: true,
	lastLog: {
		id: 'log-1',
		startedAt: STARTED_AT,
		stoppedAt: STARTED_AT,
		isRunning: true,
		projectId: 'project-1',
		taskId: null,
		organizationId: 'org-1',
		tenantId: 'tenant-1'
	}
};

const STOPPED = { duration: 3600, running: false, lastLog: { ...RUNNING.lastLog, isRunning: false } };

// The API's status, as the test sets it: the person starts or stops the timer elsewhere between two reads.
function timerElsewhere(first) {
	const timer = { status: first, held: null };
	const api = standInApi({
		'GET /timesheet/timer/status': () => {
			if (timer.held) {
				return timer.held.then(() => json(200, timer.status));
			}
			return json(200, timer.status);
		}
	});
	timer.reads = () => api.requests.length;
	timer.teams = createClient({
		apiUrl: API_URL,
		token: 'access-1',
		tenantId: 'tenant-1',
		organizationId: 'org-1',
		fetch: api.fetch
	});
	return timer;
}

// Lets the reads the interval or an event started reach the listener.
async function settle() {
	for (let turn = 0; turn < 10; turn += 1) {
		await new Promise((resolve) => setImmediate(resolve));
	}
}

function recorder() {
	const changes = [];
	const listener = (change) => changes.push(change);
	return { changes, listener };
}

const stops = [];
function watch(timer, listener, options) {
	const stop = timer.teams.timer.watch(listener, options);
	stops.push(stop);
	return stop;
}

afterEach(() => {
	for (const stop of stops.splice(0)) {
		stop();
	}
	mock.timers.reset();
	delete globalThis.document;
	delete globalThis.addEventListener;
	delete globalThis.removeEventListener;
});

// A page's document and window, for the visibility and network events.
function page(visibility) {
	const document = new EventTarget();
	const window = new EventTarget();
	const state = { visibility };
	Object.defineProperty(document, 'visibilityState', { get: () => state.visibility });
	globalThis.document = document;
	globalThis.addEventListener = window.addEventListener.bind(window);
	globalThis.removeEventListener = window.removeEventListener.bind(window);
	state.show = () => {
		state.visibility = 'visible';
		document.dispatchEvent(new Event('visibilitychange'));
	};
	state.hide = () => {
		state.visibility = 'hidden';
		document.dispatchEvent(new Event('visibilitychange'));
	};
	state.online = () => window.dispatchEvent(new Event('online'));
	return state;
}

test('the first read tells the timer as it is, with initial, and reads no more until the next turn', async () => {
	mock.timers.enable({ apis: ['setInterval'] });
	const timer = timerElsewhere(RUNNING);
	const { changes, listener } = recorder();

	watch(timer, listener);
	await settle();

	assert.equal(timer.reads(), 1);
	assert.deepEqual(changes, [
		{ running: true, startedAt: STARTED_AT, projectId: 'project-1', taskId: null, initial: true }
	]);
});

test('a stop and a start made elsewhere are told once each, at the reads of the next turns', async () => {
	mock.timers.enable({ apis: ['setInterval'] });
	const timer = timerElsewhere(STOPPED);
	const { changes, listener } = recorder();
	watch(timer, listener);
	await settle();

	mock.timers.tick(60_000);
	await settle();
	timer.status = RUNNING;
	mock.timers.tick(60_000);
	await settle();
	mock.timers.tick(60_000);
	await settle();
	timer.status = STOPPED;
	mock.timers.tick(60_000);
	await settle();

	assert.equal(timer.reads(), 5);
	assert.deepEqual(
		changes.map(({ running, initial }) => ({ running, initial })),
		[
			{ running: false, initial: true },
			{ running: true, initial: false },
			{ running: false, initial: false }
		]
	);
});

test('the reads come every minute by default, and every 15 seconds at the most often', async () => {
	mock.timers.enable({ apis: ['setInterval'] });
	const byDefault = timerElsewhere(STOPPED);
	const asked = timerElsewhere(STOPPED);
	const tooOften = timerElsewhere(STOPPED);
	watch(byDefault, () => {});
	watch(asked, () => {}, { every: 30_000 });
	watch(tooOften, () => {}, { every: 1_000 });
	await settle();

	mock.timers.tick(14_999);
	await settle();
	assert.deepEqual([byDefault.reads(), asked.reads(), tooOften.reads()], [1, 1, 1]);
	mock.timers.tick(1);
	await settle();
	assert.deepEqual([byDefault.reads(), asked.reads(), tooOften.reads()], [1, 1, 2]);
	for (let turn = 0; turn < 3; turn += 1) {
		mock.timers.tick(15_000);
		await settle();
	}
	assert.deepEqual([byDefault.reads(), asked.reads(), tooOften.reads()], [2, 3, 5]);
});

test('a listener that is not a function or an every that is not a number is refused before any read', () => {
	const timer = timerElsewhere(STOPPED);

	assert.throws(
		() => timer.teams.timer.watch(undefined),
		(error) => error instanceof EverTeamsError && error.code === 'CLIENT_OPTIONS' && error.status === 0
	);
	assert.throws(
		() => timer.teams.timer.watch(() => {}, { every: '60000' }),
		(error) => error instanceof EverTeamsError && error.code === 'CLIENT_OPTIONS' && /every/.test(error.nextStep)
	);
	assert.throws(() => timer.teams.timer.watch(() => {}, { every: Number.NaN }), { code: 'CLIENT_OPTIONS' });
	assert.equal(timer.reads(), 0);
});

test('a failed read goes to onError with its next step, and the watch reads again at the next turn', async () => {
	mock.timers.enable({ apis: ['setInterval'] });
	let down = true;
	const api = standInApi({
		'GET /timesheet/timer/status': () => {
			if (down) {
				return json(503, { statusCode: 503, message: 'Service Unavailable' });
			}
			return json(200, RUNNING);
		}
	});
	const teams = createClient({
		apiUrl: API_URL,
		token: 't',
		tenantId: 'tenant-1',
		organizationId: 'org-1',
		fetch: api.fetch
	});
	const errors = [];
	const { changes, listener } = recorder();
	stops.push(teams.timer.watch(listener, { onError: (error) => errors.push(error) }));
	await settle();

	down = false;
	mock.timers.tick(60_000);
	await settle();

	assert.equal(errors.length, 1);
	assert.ok(errors[0] instanceof EverTeamsServerError);
	assert.ok(errors[0].nextStep);
	assert.deepEqual(
		changes.map(({ running, initial }) => ({ running, initial })),
		[{ running: true, initial: true }]
	);
});

test('without onError a failed read is dropped and the watch goes on', async () => {
	mock.timers.enable({ apis: ['setInterval'] });
	let calls = 0;
	const api = standInApi({
		'GET /timesheet/timer/status': () => {
			calls += 1;
			if (calls === 1) {
				return json(500, { statusCode: 500, message: 'Internal Server Error' });
			}
			return json(200, STOPPED);
		}
	});
	const teams = createClient({
		apiUrl: API_URL,
		token: 't',
		tenantId: 'tenant-1',
		organizationId: 'org-1',
		fetch: api.fetch
	});
	const { changes, listener } = recorder();
	stops.push(teams.timer.watch(listener));
	await settle();
	mock.timers.tick(60_000);
	await settle();

	assert.equal(calls, 2);
	assert.equal(changes.length, 1);
});

test('a read still pending at the next turn is the only one: no second request piles up', async () => {
	mock.timers.enable({ apis: ['setInterval'] });
	const timer = timerElsewhere(RUNNING);
	let release;
	timer.held = new Promise((resolve) => (release = resolve));
	const { changes, listener } = recorder();
	watch(timer, listener);
	await settle();

	mock.timers.tick(60_000);
	mock.timers.tick(60_000);
	await settle();
	assert.equal(timer.reads(), 1);

	timer.held = null;
	release();
	await settle();
	mock.timers.tick(60_000);
	await settle();
	assert.equal(timer.reads(), 2);
	assert.equal(changes.length, 1);
});

test('the stop ends the reads, and the answer of a read pending at the stop tells nothing', async () => {
	mock.timers.enable({ apis: ['setInterval'] });
	const timer = timerElsewhere(RUNNING);
	let release;
	timer.held = new Promise((resolve) => (release = resolve));
	const { changes, listener } = recorder();
	const stop = watch(timer, listener);
	await settle();

	stop();
	stop();
	release();
	await settle();
	mock.timers.tick(180_000);
	await settle();

	assert.equal(timer.reads(), 1);
	assert.deepEqual(changes, []);
});

test('in a hidden page nothing is read, at start, at a turn or when the network comes back', async () => {
	mock.timers.enable({ apis: ['setInterval'] });
	const tab = page('hidden');
	const timer = timerElsewhere(RUNNING);
	watch(timer, () => {});
	await settle();

	mock.timers.tick(180_000);
	tab.online();
	await settle();

	assert.equal(timer.reads(), 0);
});

test('a page read once when it becomes visible again and when the network comes back while it is visible', async () => {
	mock.timers.enable({ apis: ['setInterval'] });
	const tab = page('hidden');
	const timer = timerElsewhere(RUNNING);
	const { changes, listener } = recorder();
	watch(timer, listener);

	tab.show();
	await settle();
	assert.equal(timer.reads(), 1);
	assert.equal(changes[0]?.initial, true);

	tab.online();
	await settle();
	assert.equal(timer.reads(), 2);

	tab.hide();
	await settle();
	assert.equal(timer.reads(), 2, 'hiding the page reads nothing');
});

test('once stopped, a page that becomes visible or comes back online reads nothing', async () => {
	const tab = page('visible');
	const timer = timerElsewhere(RUNNING);
	const stop = watch(timer, () => {});
	await settle();

	stop();
	tab.hide();
	tab.show();
	tab.online();
	await settle();

	assert.equal(timer.reads(), 1);
});

// Records the rejections no one handled while a test runs: a watch must leave none.
async function withoutUnhandledRejections(run) {
	const unhandled = [];
	const record = (reason) => unhandled.push(reason);
	process.on('unhandledRejection', record);
	try {
		await run();
		await settle();
	} finally {
		process.off('unhandledRejection', record);
	}
	assert.deepEqual(unhandled, []);
}

test('a listener that throws goes to onError, and the watch goes on telling the next changes', async () => {
	await withoutUnhandledRejections(async () => {
		mock.timers.enable({ apis: ['setInterval'] });
		const timer = timerElsewhere(STOPPED);
		const heard = [];
		const errors = [];
		const listener = (change) => {
			heard.push(change);
			throw new Error('listener bug');
		};
		watch(timer, listener, { onError: (error) => errors.push(error) });
		await settle();
		timer.status = RUNNING;
		mock.timers.tick(60_000);
		await settle();

		assert.deepEqual(
			heard.map(({ running }) => running),
			[false, true]
		);
		assert.deepEqual(
			errors.map((error) => error.message),
			['listener bug', 'listener bug']
		);
	});
});

// The tasks the watch puts on setTimeout, which the test runs itself: node's fake timers keep a callback that threw.
async function withFreshTasks(run) {
	const tasks = [];
	const realSetTimeout = globalThis.setTimeout;
	globalThis.setTimeout = (callback) => {
		tasks.push(callback);
		return 0;
	};
	try {
		await run(tasks);
	} finally {
		globalThis.setTimeout = realSetTimeout;
	}
}

test('without onError, what the listener throws is thrown again on a fresh task, and the watch goes on', async () => {
	await withoutUnhandledRejections(() =>
		withFreshTasks(async (tasks) => {
			mock.timers.enable({ apis: ['setInterval'] });
			const timer = timerElsewhere(STOPPED);
			const heard = [];
			const listener = (change) => {
				heard.push(change);
				throw new Error('listener bug');
			};
			watch(timer, listener);
			await settle();
			timer.status = RUNNING;
			mock.timers.tick(60_000);
			await settle();

			assert.equal(heard.length, 2);
			assert.equal(tasks.length, 2);
			for (const task of tasks) {
				assert.throws(task, /listener bug/);
			}
		})
	);
});

test('an onError that throws is thrown again on a fresh task, and the watch goes on', async () => {
	await withoutUnhandledRejections(() =>
		withFreshTasks(async (tasks) => {
			mock.timers.enable({ apis: ['setInterval'] });
			let down = true;
			const api = standInApi({
				'GET /timesheet/timer/status': () => {
					if (down) {
						return json(503, { statusCode: 503, message: 'Service Unavailable' });
					}
					return json(200, RUNNING);
				}
			});
			const teams = createClient({
				apiUrl: API_URL,
				token: 't',
				tenantId: 'tenant-1',
				organizationId: 'org-1',
				fetch: api.fetch
			});
			const { changes, listener } = recorder();
			const onError = () => {
				throw new Error('onError bug');
			};
			stops.push(teams.timer.watch(listener, { onError }));
			await settle();
			down = false;
			mock.timers.tick(60_000);
			await settle();

			assert.equal(tasks.length, 1);
			assert.throws(tasks[0], /onError bug/);
			assert.equal(changes.length, 1);
		})
	);
});

test('an answer with no status goes to onError as UNEXPECTED_ANSWER, never as an unhandled rejection', async () => {
	await withoutUnhandledRejections(async () => {
		mock.timers.enable({ apis: ['setInterval'] });
		const timer = timerElsewhere(null);
		const errors = [];
		const { changes, listener } = recorder();
		watch(timer, listener, { onError: (error) => errors.push(error) });
		await settle();
		timer.status = RUNNING;
		mock.timers.tick(60_000);
		await settle();

		assert.equal(errors.length, 1);
		assert.ok(errors[0] instanceof EverTeamsError);
		assert.equal(errors[0].code, 'UNEXPECTED_ANSWER');
		assert.ok(errors[0].nextStep);
		assert.deepEqual(
			changes.map(({ running, initial }) => ({ running, initial })),
			[{ running: true, initial: true }]
		);
	});
});

test('a listener that changes the change it receives is not told again while the timer stays as it was', async () => {
	mock.timers.enable({ apis: ['setInterval'] });
	const timer = timerElsewhere(RUNNING);
	const heard = [];
	const listener = (change) => {
		heard.push({ ...change });
		// A host that shows "no project" in place of null, on the object it received.
		change.projectId = 'shown';
		change.startedAt = 'shown';
	};
	watch(timer, listener);
	await settle();
	mock.timers.tick(60_000);
	await settle();

	assert.equal(timer.reads(), 2);
	assert.deepEqual(
		heard.map(({ projectId, initial }) => ({ projectId, initial })),
		[{ projectId: 'project-1', initial: true }]
	);
});

test('the network coming back or the page becoming visible during a read brings one more read after it', async () => {
	mock.timers.enable({ apis: ['setInterval'] });
	const tab = page('visible');
	// Each read answers the status as it was when the API got the request.
	const timer = { status: STOPPED, held: null };
	const api = standInApi({
		'GET /timesheet/timer/status': () => {
			const answer = json(200, timer.status);
			if (timer.held) {
				return timer.held.then(() => answer);
			}
			return answer;
		}
	});
	const teams = createClient({
		apiUrl: API_URL,
		token: 't',
		tenantId: 'tenant-1',
		organizationId: 'org-1',
		fetch: api.fetch
	});
	let release;
	timer.held = new Promise((resolve) => (release = resolve));
	const { changes, listener } = recorder();
	stops.push(teams.timer.watch(listener));
	await settle();

	// The person starts the timer elsewhere while the first read, sent before, is still pending.
	timer.status = RUNNING;
	tab.online();
	tab.hide();
	tab.show();
	await settle();
	assert.equal(api.requests.length, 1, 'one read at a time');

	timer.held = null;
	release();
	await settle();

	assert.equal(api.requests.length, 2, 'one more read, not one per event');
	assert.deepEqual(
		changes.map(({ running, initial }) => ({ running, initial })),
		[
			{ running: false, initial: true },
			{ running: true, initial: false }
		]
	);
});

test('an answer without a boolean running after a running read is a failed read: no stop, then no restart', async () => {
	mock.timers.enable({ apis: ['setInterval'] });
	const timer = timerElsewhere(RUNNING);
	const errors = [];
	const { changes, listener } = recorder();
	watch(timer, listener, { onError: (error) => errors.push(error) });
	await settle();

	timer.status = {};
	mock.timers.tick(60_000);
	await settle();
	timer.status = RUNNING;
	mock.timers.tick(60_000);
	await settle();

	assert.equal(timer.reads(), 3);
	assert.deepEqual(
		errors.map((error) => error.code),
		['UNEXPECTED_ANSWER']
	);
	assert.deepEqual(
		changes.map(({ running, initial }) => ({ running, initial })),
		[{ running: true, initial: true }]
	);
});

test('a last log whose start, project or task is not text is a failed read: the listener never gets such values', async () => {
	mock.timers.enable({ apis: ['setInterval'] });
	const timer = timerElsewhere(RUNNING);
	const errors = [];
	const { changes, listener } = recorder();
	watch(timer, listener, { onError: (error) => errors.push(error) });
	await settle();

	timer.status = { running: true, duration: 60, lastLog: { startedAt: 42, projectId: [], taskId: false } };
	mock.timers.tick(60_000);
	await settle();
	timer.status = { running: true, duration: 60, lastLog: { startedAt: STARTED_AT, projectId: null } };
	mock.timers.tick(60_000);
	await settle();

	assert.deepEqual(
		errors.map((error) => error.code),
		['UNEXPECTED_ANSWER']
	);
	assert.deepEqual(
		changes.map(({ projectId, taskId, initial }) => ({ projectId, taskId, initial })),
		[
			{ projectId: 'project-1', taskId: null, initial: true },
			{ projectId: null, taskId: null, initial: false }
		]
	);
});
