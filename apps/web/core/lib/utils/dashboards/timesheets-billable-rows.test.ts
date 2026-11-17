import { describe, expect, it } from '@jest/globals';
import { ETimeLogType } from '@/core/types/generics/enums/timer';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import type { TOrganizationProject } from '@/core/types/schemas/organization/organization-project.schema';
import type { TTask } from '@/core/types/schemas/task/task.schema';
import { rowIdentityOfTask } from './timesheet-sheet-edit';
import { sheetRowKeyFor, sheetRowKeyOf, weekSheetOf } from './timesheets';

const meeting = { id: 'meeting', name: 'meeting', color: '#2563eb' };

function logOf(id: string, startedAt: string, isBillable: boolean, tags?: Array<typeof meeting>): ITimeLog {
	const start = new Date(startedAt);
	const stop = new Date(start.getTime() + 3600 * 1000);
	return {
		id,
		duration: 3600,
		version: '1',
		logType: ETimeLogType.MANUAL,
		employeeId: 'marie',
		projectId: 'portal',
		taskId: 'q4-support',
		isBillable,
		startedAt: start,
		stoppedAt: stop,
		...(tags ? { tags } : {})
	} as unknown as ITimeLog;
}

describe('the week sheet rows and the Billable state of entries (#5368)', () => {
	it('gives the billable and the not billable time of one task a row each', () => {
		const sheet = weekSheetOf([
			logOf('billable', '2026-11-03T09:00:00.000Z', true),
			logOf('not-billable', '2026-11-03T11:00:00.000Z', false),
			logOf('billable-again', '2026-11-04T09:00:00.000Z', true)
		]);

		const rows = sheet.rows.map((row) => [row.identity.isBillable, row.logs.map((log) => log.id).sort()]);
		expect(rows).toEqual(
			expect.arrayContaining([
				[true, ['billable', 'billable-again']],
				[false, ['not-billable']]
			])
		);
		expect(sheet.rows).toHaveLength(2);
	});

	it('keeps the key a not billable row always had, and tells a billable row apart', () => {
		expect(sheetRowKeyOf(logOf('plain', '2026-11-03T09:00:00.000Z', false))).toBe('portal:q4-support');
		expect(sheetRowKeyOf(logOf('billable', '2026-11-03T09:00:00.000Z', true))).not.toBe('portal:q4-support');
		expect(sheetRowKeyFor('portal', 'q4-support', [], true)).toBe(
			sheetRowKeyOf(logOf('billable', '2026-11-03T09:00:00.000Z', true))
		);
	});

	it('keys a row by its labels and its Billable state together', () => {
		const sheet = weekSheetOf([
			logOf('billable-meeting', '2026-11-03T09:00:00.000Z', true, [meeting]),
			logOf('meeting', '2026-11-03T11:00:00.000Z', false, [meeting]),
			logOf('billable', '2026-11-04T09:00:00.000Z', true)
		]);

		expect(sheet.rows).toHaveLength(3);
		for (const row of sheet.rows) {
			expect(row.identity.key).toBe(row.key);
		}
	});

	it('puts a row added from a task of a billable project on the billable row of that task', () => {
		const task = { id: 'q4-support', projectId: 'portal', title: 'Q4 support' } as unknown as TTask;
		const project = { id: 'portal', name: 'Client Portal', billable: true } as unknown as TOrganizationProject;

		const identity = rowIdentityOfTask(task, project, 'team');

		expect(identity.isBillable).toBe(true);
		expect(identity.key).toBe(sheetRowKeyOf(logOf('billable', '2026-11-03T09:00:00.000Z', true)));
	});
});
