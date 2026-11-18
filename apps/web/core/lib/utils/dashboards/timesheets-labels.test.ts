import { describe, expect, it } from '@jest/globals';
import { ETimeLogType } from '@/core/types/generics/enums/timer';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import { sheetRowKeyFor, sheetRowKeyOf, weekSheetOf } from './timesheets';

const meeting = { id: 'meeting', name: 'meeting', color: '#2563eb' };
const support = { id: 'support', name: 'support', color: '#16a34a' };

function logOf(id: string, startedAt: string, tags?: Array<typeof meeting>): ITimeLog {
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
		startedAt: start,
		stoppedAt: stop,
		...(tags ? { tags } : {})
	} as unknown as ITimeLog;
}

describe('the week sheet rows and the labels of entries (#5368)', () => {
	it('keeps the key a row always had when its entries carry no label', () => {
		expect(sheetRowKeyOf(logOf('plain', '2026-11-03T09:00:00.000Z'))).toBe('portal:q4-support');
		expect(sheetRowKeyFor('portal', 'q4-support')).toBe('portal:q4-support');
	});

	it('gives the same task under other labels a row of its own, whatever the order of the labels', () => {
		const sheet = weekSheetOf([
			logOf('meeting', '2026-11-03T09:00:00.000Z', [meeting]),
			logOf('support-and-meeting', '2026-11-03T11:00:00.000Z', [support, meeting]),
			logOf('meeting-and-support', '2026-11-04T11:00:00.000Z', [meeting, support]),
			logOf('plain', '2026-11-04T14:00:00.000Z')
		]);

		const rows = sheet.rows.map((row) => [row.key, row.logs.map((log) => log.id).sort()]);
		expect(rows).toEqual(
			expect.arrayContaining([
				['portal:q4-support:labels=meeting', ['meeting']],
				['portal:q4-support:labels=meeting,support', ['meeting-and-support', 'support-and-meeting']],
				['portal:q4-support', ['plain']]
			])
		);
		expect(sheet.rows).toHaveLength(3);
	});

	it("names a row's labels, which time typed in it takes", () => {
		const sheet = weekSheetOf([logOf('meeting', '2026-11-03T09:00:00.000Z', [meeting])]);

		expect(sheet.rows[0].identity.labels).toEqual([meeting]);
		expect(sheet.rows[0].identity.key).toBe(sheet.rows[0].key);
	});
});
