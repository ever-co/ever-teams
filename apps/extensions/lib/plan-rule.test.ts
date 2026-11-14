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

describe('planRefusalOf, the day of a plan', () => {
	it('reads a plan stored at UTC midnight as that day, wherever the person is', () => {
		const plans = [{ date: '2026-11-14T00:00:00.000Z', tasks: [{ id: 't1' }] }];
		assert.equal(planRefusalOf({ teamRequiresPlan: true, plans, taskId: 't1', planDay: '2026-11-14' }), null);
	});

	it("reads an older plan, stored at the instant it was made, in the person's own day, as the web does", () => {
		// An instant whose day here differs from its UTC day: just after UTC midnight west of UTC, just before east of it
		const isWestOfUtc = new Date('2026-11-14T12:00:00.000Z').getTimezoneOffset() > 0;
		const madeAt = isWestOfUtc ? '2026-11-15T01:00:00.000Z' : '2026-11-14T23:30:00.000Z';
		const localDay = new Date(madeAt).toLocaleDateString('en-CA');
		const plans = [{ date: madeAt, tasks: [{ id: 't1' }] }];
		assert.equal(planRefusalOf({ teamRequiresPlan: true, plans, taskId: 't1', planDay: localDay }), null);
	});
});
