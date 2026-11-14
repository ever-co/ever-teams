import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { planRefusalOf } from './plan-rule.ts';

// West of UTC, so that a plan stored at the instant it was made has another day here than in UTC. Run in UTC, the
// test of that case could not tell the person's day from the UTC one.
process.env.TZ = 'America/New_York';

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

describe('planRefusalOf, the day of a plan', () => {
	it('reads a plan stored at UTC midnight as that day, wherever the person is', () => {
		const plans = [{ date: '2026-11-14T00:00:00.000Z', tasks: [{ id: 't1' }] }];
		assert.equal(planRefusalOf({ teamRequiresPlan: true, plans, taskId: 't1', planDay: '2026-11-14' }), null);
	});

	it("reads an older plan, stored at the instant it was made, in the person's own day, as the web does", () => {
		// 01:00 UTC on November 15 is 20:00 on November 14 in New York
		const plans = [{ date: '2026-11-15T01:00:00.000Z', tasks: [{ id: 't1' }] }];
		assert.equal(new Date(plans[0].date).getTimezoneOffset(), 300);
		assert.equal(planRefusalOf({ teamRequiresPlan: true, plans, taskId: 't1', planDay: '2026-11-14' }), null);
		assert.equal(
			planRefusalOf({ teamRequiresPlan: true, plans, taskId: 't1', planDay: '2026-11-15' }),
			'DAILY_PLAN_REQUIRED'
		);
	});
});
