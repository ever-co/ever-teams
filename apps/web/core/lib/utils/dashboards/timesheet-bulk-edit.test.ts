import { describe, expect, it } from '@jest/globals';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import {
	type BulkEditChoice,
	type BulkEditOutcome,
	type BulkEditScope,
	bulkEditPayloadOf,
	bulkEditPlanOf,
	bulkEditResultOf,
	hasBulkEditChoice,
	leftOutLinesOf,
	taskChoicesUnderProject
} from './timesheet-bulk-edit';

const KEEP: BulkEditChoice = { projectId: null, task: null, isBillable: null };

const taskOfSite = { id: 'task-site', projectId: 'project-site' };
const taskOfMobile = { id: 'task-mobile', projectId: 'project-mobile' };
const taskWithoutProject = { id: 'task-free', projectId: null };

function logOf(overrides: Partial<ITimeLog>): ITimeLog {
	return {
		id: 'log',
		duration: 3600,
		version: '1',
		employeeId: 'member',
		organizationTeamId: 'team',
		taskId: 'task-site',
		projectId: 'project-site',
		isBillable: false,
		description: 'Notes of the entry',
		startedAt: new Date('2026-11-10T09:00:00.000Z'),
		stoppedAt: new Date('2026-11-10T10:00:00.000Z'),
		...overrides
	};
}

function scopeOf(overrides: Partial<BulkEditScope> = {}): BulkEditScope {
	return { listedTeamId: 'team', canEdit: () => true, ...overrides };
}

function savedFieldsOf(logs: ITimeLog[], choice: BulkEditChoice, scope = scopeOf()) {
	const plan = bulkEditPlanOf(logs, choice, scope);
	return plan.saves.map((save) => save.fields);
}

function leftOutReasonsOf(logs: ITimeLog[], choice: BulkEditChoice, scope = scopeOf()) {
	const plan = bulkEditPlanOf(logs, choice, scope);
	return plan.leftOut.map((entry) => entry.reason);
}

describe('choice of a bulk edit', () => {
	it('asks for nothing while every field is on Keep as is', () => {
		expect(hasBulkEditChoice(KEEP)).toBe(false);
		expect(hasBulkEditChoice({ ...KEEP, isBillable: false })).toBe(true);
		expect(hasBulkEditChoice({ ...KEEP, task: taskOfSite })).toBe(true);
		expect(hasBulkEditChoice({ ...KEEP, projectId: 'project-site' })).toBe(true);
	});

	it('offers the tasks of the project picked by hand and the tasks without a project', () => {
		const tasks = [taskOfSite, taskOfMobile, taskWithoutProject];

		expect(taskChoicesUnderProject(tasks, null)).toEqual(tasks);
		expect(taskChoicesUnderProject(tasks, 'project-mobile')).toEqual([taskOfMobile, taskWithoutProject]);
	});
});

describe('plan of a bulk edit', () => {
	it('changes only Billable on every entry when only Billable was picked', () => {
		const logs = [logOf({ id: 'a' }), logOf({ id: 'b', projectId: 'project-mobile' }), logOf({ id: 'c' })];

		expect(savedFieldsOf(logs, { ...KEEP, isBillable: true })).toEqual([
			{ isBillable: true },
			{ isBillable: true },
			{ isBillable: true }
		]);
	});

	it('saves nothing while every field is on Keep as is', () => {
		const logs = [logOf({ id: 'a' }), logOf({ id: 'b', isBillable: true })];
		const plan = bulkEditPlanOf(logs, KEEP, scopeOf());

		expect(plan.saves).toEqual([]);
		expect(leftOutReasonsOf(logs, KEEP)).toEqual(['unchanged', 'unchanged']);
	});

	it('leaves out an entry that already has the values picked', () => {
		const logs = [logOf({ id: 'billable', isBillable: true }), logOf({ id: 'not-billable' })];
		const plan = bulkEditPlanOf(logs, { ...KEEP, isBillable: true }, scopeOf());

		expect(plan.saves.map((save) => save.log.id)).toEqual(['not-billable']);
		expect(plan.leftOut).toEqual([{ log: logs[0], reason: 'unchanged' }]);
	});

	it("files an entry under the picked task and the task's own project", () => {
		const logs = [logOf({ id: 'a' })];
		const choice = { ...KEEP, task: taskOfMobile };

		expect(savedFieldsOf(logs, choice)).toEqual([{ taskId: 'task-mobile', projectId: 'project-mobile' }]);
	});

	it("keeps the task's own project over a project picked by hand", () => {
		const logs = [logOf({ id: 'a' })];
		const choice = { ...KEEP, task: taskOfMobile, projectId: 'project-other' };

		expect(savedFieldsOf(logs, choice)).toEqual([{ taskId: 'task-mobile', projectId: 'project-mobile' }]);
	});

	it('keeps the project of an entry that moves to a task without a project', () => {
		const logs = [logOf({ id: 'a' }), logOf({ id: 'b', projectId: undefined })];
		const choice = { ...KEEP, task: taskWithoutProject };

		expect(savedFieldsOf(logs, choice)).toEqual([{ taskId: 'task-free' }, { taskId: 'task-free' }]);
	});

	it('files an entry under the project picked by hand when its new task has none', () => {
		const logs = [logOf({ id: 'a' })];
		const choice = { ...KEEP, task: taskWithoutProject, projectId: 'project-mobile' };

		expect(savedFieldsOf(logs, choice)).toEqual([{ taskId: 'task-free', projectId: 'project-mobile' }]);
	});

	it('does not move an entry that is already on the picked task', () => {
		const onTheTask = logOf({ id: 'a', taskId: 'task-mobile', projectId: 'project-other' });
		const choice = { ...KEEP, task: taskOfMobile };

		expect(leftOutReasonsOf([onTheTask], choice)).toEqual(['unchanged']);
	});

	it('moves to the project picked by hand only the entries filed elsewhere', () => {
		const logs = [logOf({ id: 'site' }), logOf({ id: 'mobile', projectId: 'project-mobile' })];
		const plan = bulkEditPlanOf(logs, { ...KEEP, projectId: 'project-mobile' }, scopeOf());

		expect(plan.saves).toEqual([{ log: logs[0], fields: { projectId: 'project-mobile' } }]);
		expect(plan.leftOut).toEqual([{ log: logs[1], reason: 'unchanged' }]);
	});

	it('reads the task and the project of an entry from its relations when the ids are missing', () => {
		const log = logOf({
			id: 'a',
			taskId: undefined,
			projectId: undefined,
			task: { id: 'task-mobile' } as ITimeLog['task'],
			project: { id: 'project-mobile' } as ITimeLog['project']
		});
		const choice = { ...KEEP, task: taskOfMobile, isBillable: false };

		expect(leftOutReasonsOf([log], choice)).toEqual(['unchanged']);
	});

	it('leaves out an entry the viewer may not edit, before anything else is looked at', () => {
		const logs = [logOf({ id: 'own' }), logOf({ id: 'other', employeeId: 'someone-else', isRunning: true })];
		const scope = scopeOf({ canEdit: (log) => log.employeeId === 'member' });
		const plan = bulkEditPlanOf(logs, { ...KEEP, isBillable: true }, scope);

		expect(plan.saves.map((save) => save.log.id)).toEqual(['own']);
		expect(plan.leftOut).toEqual([{ log: logs[1], reason: 'notAllowed' }]);
	});

	it('leaves out the entry of a running timer', () => {
		const logs = [logOf({ id: 'running', isRunning: true })];

		expect(leftOutReasonsOf(logs, { ...KEEP, isBillable: true })).toEqual(['running']);
	});

	it('leaves out an entry of another team when its task would change', () => {
		const logs = [logOf({ id: 'other-team', organizationTeamId: 'team-b' })];

		expect(leftOutReasonsOf(logs, { ...KEEP, task: taskOfMobile })).toEqual(['otherTeam']);
	});

	it('still changes the project or Billable of an entry of another team', () => {
		const logs = [logOf({ id: 'other-team', organizationTeamId: 'team-b' })];
		const choice = { ...KEEP, projectId: 'project-mobile', isBillable: true };

		expect(savedFieldsOf(logs, choice)).toEqual([{ projectId: 'project-mobile', isBillable: true }]);
	});
});

describe('update sent for an entry', () => {
	it("sends the entry's own interval and member with the changed fields only", () => {
		const log = logOf({ id: 'a' });
		const payload = bulkEditPayloadOf({ log, fields: { isBillable: true } });

		expect(payload).toStrictEqual({
			timeLogId: 'a',
			startedAt: new Date('2026-11-10T09:00:00.000Z'),
			stoppedAt: new Date('2026-11-10T10:00:00.000Z'),
			employeeId: 'member',
			isBillable: true
		});
	});

	it('reads an interval the API returned as text', () => {
		const startedAt = '2026-11-10T09:00:00.000Z' as unknown as Date;
		const stoppedAt = '2026-11-10T10:00:00.000Z' as unknown as Date;
		const payload = bulkEditPayloadOf({ log: logOf({ startedAt, stoppedAt }), fields: {} });

		expect(payload?.startedAt).toEqual(new Date('2026-11-10T09:00:00.000Z'));
		expect(payload?.stoppedAt).toEqual(new Date('2026-11-10T10:00:00.000Z'));
	});

	it('sends nothing for an entry without an interval or without a member', () => {
		const withoutEnd = logOf({ stoppedAt: undefined });
		const withoutMember = logOf({ employeeId: undefined });

		expect(bulkEditPayloadOf({ log: withoutEnd, fields: { isBillable: true } })).toBeNull();
		expect(bulkEditPayloadOf({ log: withoutMember, fields: { isBillable: true } })).toBeNull();
	});
});

describe('report of a bulk edit', () => {
	const allowed = logOf({ id: 'allowed' });
	const second = logOf({ id: 'second' });
	const third = logOf({ id: 'third' });
	const alreadyBillable = logOf({ id: 'already', isBillable: true });
	const foreign = logOf({ id: 'foreign', employeeId: 'someone-else' });
	const running = logOf({ id: 'running', isRunning: true });
	const logs = [allowed, second, third, alreadyBillable, foreign, running];
	const scope = scopeOf({ canEdit: (log) => log.employeeId === 'member' });
	const plan = bulkEditPlanOf(logs, { ...KEEP, isBillable: true }, scope);

	it('counts the entries left out before the save, one line per reason', () => {
		expect(leftOutLinesOf(plan.leftOut)).toEqual([
			{ reason: 'notAllowed', count: 1, detailKey: undefined },
			{ reason: 'running', count: 1, detailKey: undefined },
			{ reason: 'unchanged', count: 1, detailKey: undefined }
		]);
	});

	it('counts every ticked entry as updated when each one was saved', () => {
		const everyLog = [allowed, second, third];
		const fullPlan = bulkEditPlanOf(everyLog, { ...KEEP, isBillable: true }, scopeOf());
		const outcomes: BulkEditOutcome[] = everyLog.map((log) => ({ logId: log.id, status: 'updated' }));

		expect(bulkEditResultOf(fullPlan, outcomes)).toEqual({
			updatedCount: 3,
			notUpdatedCount: 0,
			reasons: [],
			releasedLogIds: ['allowed', 'second', 'third']
		});
	});

	it('states both counts and groups the reasons when some entries were not updated', () => {
		const outcomes: BulkEditOutcome[] = [
			{ logId: 'allowed', status: 'updated' },
			{ logId: 'second', status: 'overlap' },
			{ logId: 'third', status: 'failed', detailKey: 'toasts.REASONS.SERVER' }
		];
		const result = bulkEditResultOf(plan, outcomes);

		expect(result.updatedCount).toBe(1);
		expect(result.notUpdatedCount).toBe(4);
		expect(result.reasons).toEqual([
			{ reason: 'notAllowed', count: 1, detailKey: undefined },
			{ reason: 'running', count: 1, detailKey: undefined },
			{ reason: 'overlap', count: 1, detailKey: undefined },
			{ reason: 'failed', count: 1, detailKey: 'toasts.REASONS.SERVER' }
		]);
	});

	it('releases the entries saved and the ones already as chosen, and keeps the others ticked', () => {
		const outcomes: BulkEditOutcome[] = [
			{ logId: 'allowed', status: 'updated' },
			{ logId: 'second', status: 'checkFailed' },
			{ logId: 'third', status: 'failed', detailKey: 'toasts.REASONS.SERVER' }
		];

		expect(bulkEditResultOf(plan, outcomes).releasedLogIds).toEqual(['allowed', 'already']);
	});

	it('gives failed saves one line per cause', () => {
		const outcomes: BulkEditOutcome[] = [
			{ logId: 'allowed', status: 'failed', detailKey: 'toasts.REASONS.SERVER' },
			{ logId: 'second', status: 'failed', detailKey: 'toasts.REASONS.SERVER' },
			{ logId: 'third', status: 'failed', detailKey: 'toasts.REASONS.OFFLINE' }
		];
		const failedLines = bulkEditResultOf(plan, outcomes).reasons.filter((line) => line.reason === 'failed');

		expect(failedLines).toEqual([
			{ reason: 'failed', count: 2, detailKey: 'toasts.REASONS.SERVER' },
			{ reason: 'failed', count: 1, detailKey: 'toasts.REASONS.OFFLINE' }
		]);
	});
});
