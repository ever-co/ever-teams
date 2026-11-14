import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { EXTENSION_SOURCE, heartbeatSecondsOf, sendsHeartbeat } from './run-policy.ts';

const startedAt = '2026-11-14T09:00:00.000Z';
const at = (iso: string) => new Date(iso).getTime();

describe('sendsHeartbeat', () => {
	it('keeps the time of a run started here', () => {
		assert.equal(sendsHeartbeat({ source: EXTENSION_SOURCE }), true);
	});

	it('leaves a run started by another app to that app', () => {
		assert.equal(sendsHeartbeat({ source: 'TEAMS' }), false);
		assert.equal(sendsHeartbeat({ source: 'DESKTOP' }), false);
		assert.equal(sendsHeartbeat({ source: null }), false);
	});
});

describe('heartbeatSecondsOf', () => {
	it('credits the seconds since the run started when nothing was credited yet', () => {
		const run = { startedAt, stoppedAt: startedAt };
		assert.equal(heartbeatSecondsOf(run, at('2026-11-14T09:01:00.000Z')), 60);
	});

	it('credits only the seconds since the last heartbeat, whoever sent it', () => {
		const run = { startedAt, stoppedAt: '2026-11-14T09:04:40.000Z' };
		assert.equal(heartbeatSecondsOf(run, at('2026-11-14T09:05:00.000Z')), 20);
	});

	it('credits at most one time slot of ten minutes, like the web', () => {
		const run = { startedAt, stoppedAt: startedAt };
		assert.equal(heartbeatSecondsOf(run, at('2026-11-14T11:00:00.000Z')), 600);
	});

	it('credits nothing for a heartbeat in the future or a broken date', () => {
		assert.equal(heartbeatSecondsOf({ startedAt, stoppedAt: '2026-11-14T10:00:00.000Z' }, at(startedAt)), 0);
		assert.equal(heartbeatSecondsOf({ startedAt: 'not a date', stoppedAt: null }, at(startedAt)), 0);
	});
});
