// timerChangeOf, the rule the kit and timer.watch share: node --test test/*.test.mjs (from packages/api, after
// `rollup -c`). The statuses are GET /timesheet/timer/status answers as Gauzy writes them (timer.service.ts,
// getTimerStatus): lastLog is the running entry while the timer runs, today's last entry otherwise.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { timerChangeOf } from '../dist/index.es.js';

const entry = (fields) => ({
	id: 'log-1',
	startedAt: '2026-11-18T08:00:00.000Z',
	stoppedAt: '2026-11-18T08:00:00.000Z',
	isRunning: true,
	projectId: 'project-1',
	taskId: 'task-1',
	organizationId: 'org-1',
	tenantId: 'tenant-1',
	...fields
});

const running = (fields) => ({ running: true, duration: 600, lastLog: entry(fields) });
const stopped = {
	running: false,
	duration: 3600,
	lastLog: entry({ isRunning: false, stoppedAt: '2026-11-18T09:00:00.000Z' })
};

test('the first read tells the timer as it is, running or not, with initial', () => {
	assert.deepEqual(timerChangeOf(running(), null), {
		running: true,
		startedAt: '2026-11-18T08:00:00.000Z',
		projectId: 'project-1',
		taskId: 'task-1',
		initial: true
	});
	assert.deepEqual(timerChangeOf(stopped, null), {
		running: false,
		startedAt: null,
		projectId: null,
		taskId: null,
		initial: true
	});
});

test('a read that shows the timer as it was tells nothing', () => {
	const first = timerChangeOf(running(), null);

	assert.equal(timerChangeOf(running({ stoppedAt: '2026-11-18T08:10:00.000Z' }), first), null);
	assert.equal(timerChangeOf({ ...running(), duration: 1200 }, first), null);
});

test("a stopped timer tells nothing of today's last entry, so a later read of another stopped entry is no change", () => {
	const first = timerChangeOf(stopped, null);

	assert.equal(timerChangeOf({ running: false, duration: 0, lastLog: null }, first), null);
});

test('a start and a stop are told once each, without initial', () => {
	const first = timerChangeOf(stopped, null);
	const start = timerChangeOf(running(), first);
	const stop = timerChangeOf(stopped, start);

	assert.deepEqual(start, {
		running: true,
		startedAt: '2026-11-18T08:00:00.000Z',
		projectId: 'project-1',
		taskId: 'task-1',
		initial: false
	});
	assert.deepEqual(stop, { running: false, startedAt: null, projectId: null, taskId: null, initial: false });
	assert.equal(timerChangeOf(stopped, stop), null);
});

test('another running entry between two reads is a change: a new start, another project or another task', () => {
	const first = timerChangeOf(running(), null);

	assert.equal(
		timerChangeOf(running({ startedAt: '2026-11-18T08:30:00.000Z' }), first)?.startedAt,
		'2026-11-18T08:30:00.000Z'
	);
	assert.equal(timerChangeOf(running({ projectId: 'project-2' }), first)?.projectId, 'project-2');
	assert.equal(timerChangeOf(running({ taskId: null }), first)?.taskId, null);
});

test('a running break reads as a stopped timer, as the API answers it', () => {
	const first = timerChangeOf(running(), null);
	const onBreak = { running: false, duration: 600, lastLog: entry({ isRunning: true, logType: 'BREAK' }) };

	assert.deepEqual(timerChangeOf(onBreak, first), {
		running: false,
		startedAt: null,
		projectId: null,
		taskId: null,
		initial: false
	});
});
