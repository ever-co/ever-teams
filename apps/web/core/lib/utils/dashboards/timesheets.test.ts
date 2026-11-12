import { describe, expect, it } from '@jest/globals';
import { ETimeLogType } from '@/core/types/generics/enums/timer';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import { logsOfMember } from './timesheets';

function logOf(overrides: Partial<ITimeLog>): ITimeLog {
	return { id: 'log', duration: 0, version: '1', logType: ETimeLogType.TRACKED, ...overrides };
}

describe('logsOfMember', () => {
	const own = logOf({ id: 'own', employeeId: 'member' });
	const ownByRelation = logOf({ id: 'own-relation', employee: { id: 'member' } as ITimeLog['employee'] });
	const other = logOf({ id: 'other', employeeId: 'teammate' });
	const orphan = logOf({ id: 'orphan' });

	it("keeps the member's logs and drops everyone else's", () => {
		const logs = logsOfMember([own, other, ownByRelation, orphan], 'member');

		expect(logs.map((log) => log.id)).toEqual(['own', 'own-relation']);
	});

	it('keeps nothing while the member is unknown', () => {
		expect(logsOfMember([own, other, orphan], null)).toEqual([]);
	});
});
