import type { TDailyPlan } from '@/core/types/schemas';
import { OUTSTANDING_NO_PLAN_ID, outstandingNoticeTasksOf } from './outstanding-notice';

function planOf(id: string, taskIds: string[]): TDailyPlan {
	return { id, date: '2026-11-20', tasks: taskIds.map((taskId) => ({ id: taskId })) } as unknown as TDailyPlan;
}

/**
 * The home said "5 tasks from past plans are still open" and Review plans listed 2 (#5715): the count held three
 * tasks assigned to the person, with an estimate, that were in no plan at all.
 */
describe('the tasks the open-work notice counts', () => {
	it('counts the unfinished task of a past plan and leaves out an estimated task that is in no plan', () => {
		const pastPlan = planOf('plan-friday', ['task-3']);
		const neverPlanned = planOf(OUTSTANDING_NO_PLAN_ID, ['task-15']);

		const notice = outstandingNoticeTasksOf([pastPlan, neverPlanned]);

		expect(notice.count).toBe(1);
		expect(notice.tasks.map((task) => task.id)).toEqual(['task-3']);
	});

	it('counts the tasks of every past plan', () => {
		const notice = outstandingNoticeTasksOf([planOf('plan-friday', ['task-3']), planOf('plan-monday', ['task-4'])]);

		expect(notice.count).toBe(2);
	});

	it('counts a task carried by two past plans once', () => {
		const notice = outstandingNoticeTasksOf([planOf('plan-friday', ['task-3']), planOf('plan-monday', ['task-3'])]);

		expect(notice.count).toBe(1);
	});

	it('counts nothing for a person whose only open tasks were never planned', () => {
		const notice = outstandingNoticeTasksOf([planOf(OUTSTANDING_NO_PLAN_ID, ['task-15', 'task-16'])]);

		expect(notice.count).toBe(0);
		expect(notice.tasks).toEqual([]);
	});

	it('counts nothing without plans', () => {
		expect(outstandingNoticeTasksOf([]).count).toBe(0);
	});
});
