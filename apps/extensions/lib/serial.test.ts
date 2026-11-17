import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createSerialQueue } from './serial.ts';

/** A piece of work that ends when the test says so. */
function heldWork<T>(value: T, events: string[], name: string) {
	let end: () => void = () => undefined;
	const ended = new Promise<void>((resolve) => {
		end = resolve;
	});
	return {
		work: async () => {
			events.push(`${name} starts`);
			await ended;
			events.push(`${name} ends`);
			return value;
		},
		end
	};
}

const turn = () => new Promise((resolve) => setImmediate(resolve));

describe('createSerialQueue', () => {
	it('starts each piece of work once the one before has ended, and answers its own value', async () => {
		const inTurn = createSerialQueue();
		const events: string[] = [];
		const first = heldWork('first', events, 'first');
		const second = heldWork(2, events, 'second');

		const firstDone = inTurn(first.work);
		const secondDone = inTurn(second.work);
		await turn();
		assert.deepEqual(events, ['first starts']);

		first.end();
		assert.equal(await firstDone, 'first');
		await turn();
		assert.deepEqual(events, ['first starts', 'first ends', 'second starts']);
		second.end();
		assert.equal(await secondDone, 2);
	});

	it('starts the next piece after one that failed, and gives that failure to its own caller only', async () => {
		const inTurn = createSerialQueue();

		const failed = inTurn(async () => Promise.reject(new Error('Network Error')));
		const next = inTurn(async () => 'next');

		await assert.rejects(failed, /Network Error/);
		assert.equal(await next, 'next');
	});
});
