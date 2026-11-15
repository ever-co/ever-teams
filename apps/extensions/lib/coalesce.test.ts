import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createCoalescedRunner } from './coalesce.ts';

/** A work whose runs end when the test says so, recording each run's argument and how many run at once. */
function heldWork() {
	const runs: boolean[] = [];
	const ends: Array<(failure?: Error) => void> = [];
	let active = 0;
	let mostAtOnce = 0;
	const work = (heartbeat: boolean) =>
		new Promise<void>((resolve, reject) => {
			runs.push(heartbeat);
			active += 1;
			mostAtOnce = Math.max(mostAtOnce, active);
			ends.push((failure) => {
				active -= 1;
				if (failure) {
					reject(failure);
					return;
				}
				resolve();
			});
		});
	return { runs, ends, work, mostAtOnce: () => mostAtOnce };
}

const either = (waiting: boolean, next: boolean) => waiting || next;

async function settle(): Promise<void> {
	for (let round = 0; round < 5; round += 1) {
		await new Promise((resolve) => setTimeout(resolve, 0));
	}
}

describe('createCoalescedRunner', () => {
	it('runs at once when nothing runs', async () => {
		const held = heldWork();
		const request = createCoalescedRunner(held.work, either);

		const ended = request(false);
		held.ends[0]();
		await ended;

		assert.deepEqual(held.runs, [false]);
	});

	it('runs the calls asked for during a run as one after it, with their arguments merged', async () => {
		const held = heldWork();
		const request = createCoalescedRunner(held.work, either);

		const first = request(false);
		const second = request(true);
		const third = request(false);
		await settle();
		assert.deepEqual(held.runs, [false]);

		held.ends[0]();
		await first;
		await settle();
		assert.deepEqual(held.runs, [false, true]);

		held.ends[1]();
		await Promise.all([second, third]);
		assert.equal(held.mostAtOnce(), 1);
	});

	it('starts the waiting run after a failed one', async () => {
		const held = heldWork();
		const request = createCoalescedRunner(held.work, either);

		const first = request(false);
		const second = request(true);
		held.ends[0](new Error('offline'));
		await first;
		await settle();
		held.ends[1]();
		await second;

		assert.deepEqual(held.runs, [false, true]);
	});

	it('runs at once again once nothing runs nor waits', async () => {
		const held = heldWork();
		const request = createCoalescedRunner(held.work, either);

		const first = request(false);
		held.ends[0]();
		await first;
		const second = request(true);
		held.ends[1]();
		await second;

		assert.deepEqual(held.runs, [false, true]);
		assert.equal(held.mostAtOnce(), 1);
	});
});
