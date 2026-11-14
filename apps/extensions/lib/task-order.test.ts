import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { orderTasks, rememberRecent } from './task-order.ts';

const task = (id: string, title: string, updatedAt: string, taskNumber?: string) => ({
	id,
	title,
	updatedAt,
	taskNumber
});

const tasks = [
	task('a', 'Write the release notes', '2026-11-10T10:00:00Z', '12'),
	task('b', 'Fix the login page', '2026-11-12T10:00:00Z', '7'),
	task('c', 'Review the invoice export', '2026-11-11T10:00:00Z', '30'),
	task('d', 'Plan the sprint', '2026-11-13T10:00:00Z')
];

describe('orderTasks', () => {
	it('puts the recent tasks first, in the order they were used, then the most recently updated', () => {
		const ids = orderTasks(tasks, ['c', 'a'], '').map((t) => t.id);

		assert.deepEqual(ids, ['c', 'a', 'd', 'b']);
	});

	it('ignores a recent id that is no longer among the tasks', () => {
		const ids = orderTasks(tasks, ['gone', 'b'], '').map((t) => t.id);

		assert.deepEqual(ids, ['b', 'd', 'c', 'a']);
	});

	it('keeps the tasks whose title or number matches the search, without regard to case', () => {
		assert.deepEqual(
			orderTasks(tasks, [], 'THE L').map((t) => t.id),
			['b']
		);
		assert.deepEqual(
			orderTasks(tasks, [], '#30').map((t) => t.id),
			['c']
		);
		assert.deepEqual(
			orderTasks(tasks, [], '  ').map((t) => t.id),
			['d', 'b', 'c', 'a']
		);
	});

	it('sorts a task without an update date after the dated ones', () => {
		const ids = orderTasks([task('x', 'No date', ''), ...tasks], [], '').map((t) => t.id);

		assert.equal(ids[ids.length - 1], 'x');
	});
});

describe('rememberRecent', () => {
	it('moves the started task to the front, once, and keeps at most the limit', () => {
		assert.deepEqual(rememberRecent(['a', 'b', 'c'], 'b'), ['b', 'a', 'c']);
		assert.deepEqual(rememberRecent(['a', 'b', 'c'], 'z', 3), ['z', 'a', 'b']);
	});
});
