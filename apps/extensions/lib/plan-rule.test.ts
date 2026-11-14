import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { planRefusalOf } from './plan-rule.ts';

const plan = (date: string, taskIds: string[]) => ({ date, tasks: taskIds.map((id) => ({ id })) });

describe('planRefusalOf', () => {
	it('lets any start through when the team does not require a plan', () => {
		assert.equal(planRefusalOf({ teamRequiresPlan: false, plans: [], taskId: 't1', planDay: '2026-11-14' }), null);
	});

	it("refuses a start without a plan of the day that holds tasks, as the API does for the web's starts", () => {
		const yesterday = [plan('2026-11-13T00:00:00.000Z', ['t1'])];
		const emptyToday = [plan('2026-11-14T00:00:00.000Z', [])];

		assert.equal(
			planRefusalOf({ teamRequiresPlan: true, plans: yesterday, taskId: 't1', planDay: '2026-11-14' }),
			'DAILY_PLAN_REQUIRED'
		);
		assert.equal(
			planRefusalOf({ teamRequiresPlan: true, plans: emptyToday, taskId: 't1', planDay: '2026-11-14' }),
			'DAILY_PLAN_REQUIRED'
		);
	});

	it("refuses a task that is not in the day's plan, and lets a planned one through", () => {
		const today = [plan('2026-11-14T00:00:00.000Z', ['t2'])];

		assert.equal(
			planRefusalOf({ teamRequiresPlan: true, plans: today, taskId: 't1', planDay: '2026-11-14' }),
			'TASK_NOT_PLANNED'
		);
		assert.equal(
			planRefusalOf({ teamRequiresPlan: true, plans: today, taskId: 't2', planDay: '2026-11-14' }),
			null
		);
	});
});
