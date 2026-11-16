import assert from 'node:assert/strict';
import { afterEach, describe, it, mock } from 'node:test';

import { withDeadline } from './deadline.ts';

describe('withDeadline', () => {
	afterEach(() => mock.timers.reset());

	it('cancels a call that has not ended by its deadline', async () => {
		mock.timers.enable({ apis: ['setTimeout'] });
		const ended = withDeadline(
			30_000,
			(signal) =>
				new Promise((_resolve, reject) => {
					signal.addEventListener('abort', () => reject(signal.reason));
				})
		);

		mock.timers.tick(30_000);

		await assert.rejects(ended, { name: 'TimeoutError' });
	});

	it('rejects with no HTTP status, so a timeout never passes for a 401 refusal', async () => {
		mock.timers.enable({ apis: ['setTimeout'] });
		const ended = withDeadline(
			30_000,
			(signal) =>
				new Promise((_resolve, reject) => {
					signal.addEventListener('abort', () => reject(signal.reason));
				})
		);

		mock.timers.tick(30_000);

		await assert.rejects(ended, (error: unknown) => {
			assert.ok(error instanceof DOMException);
			assert.equal((error as { status?: unknown }).status, undefined);
			return true;
		});
	});

	it('answers what the call answered, and cancels nothing after it ended', async () => {
		mock.timers.enable({ apis: ['setTimeout'] });
		let seen: AbortSignal | undefined;

		const answer = await withDeadline(30_000, async (signal) => {
			seen = signal;
			return 'answered';
		});
		mock.timers.tick(60_000);

		assert.equal(answer, 'answered');
		assert.equal(seen?.aborted, false);
	});
});
