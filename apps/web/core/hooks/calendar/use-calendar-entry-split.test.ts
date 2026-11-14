/** @jest-environment node */
import { ETimeLogSource, ETimeLogType } from '@/core/types/generics/enums/timer';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';

const calls: string[] = [];
const mockUpdateTimeLog = jest.fn(async (payload: { startedAt?: Date; stoppedAt?: Date }) => {
	calls.push(`update ${payload.startedAt?.getHours()}-${payload.stoppedAt?.getHours()}`);
	return {};
});
const mockGetTimeLogConflicts = jest.fn<Promise<unknown[]>, [unknown]>(async () => []);
// The entry as the server holds it now, read before any write
const mockGetTimeLogs = jest.fn<Promise<unknown[]>, [unknown]>(async () => []);
const mockAddManualTime = jest.fn(async (request: { startedAt: Date; stoppedAt: Date }) => {
	calls.push(`add ${request.startedAt.getHours()}-${request.stoppedAt.getHours()}`);
	return {};
});

jest.mock('@/core/services/client/api/timesheets/time-log.service', () => ({
	timeLogService: {
		updateTimeLog: (payload: never) => mockUpdateTimeLog(payload),
		addManualTime: (request: never) => mockAddManualTime(request),
		getTimeLogConflicts: (query: never) => mockGetTimeLogConflicts(query),
		getTimeLogs: (query: never) => mockGetTimeLogs(query)
	}
}));

import { ZodValidationError } from '@/core/types/schemas';
import { CalendarSplitError, splitCalendarEntry } from './use-calendar-entry-split';

function at(hour: number) {
	return new Date(2026, 10, 9, hour);
}

const LOG = {
	id: 'log-1',
	employeeId: 'employee-1',
	logType: ETimeLogType.MANUAL,
	isRunning: false,
	startedAt: at(9),
	stoppedAt: at(13),
	projectId: 'project-1',
	taskId: 'task-1',
	organizationContactId: 'client-1',
	organizationTeamId: 'team-1',
	description: 'Login page',
	reason: 'Forgot to start timer',
	isBillable: true
} as unknown as ITimeLog;

beforeEach(() => {
	calls.length = 0;
	mockUpdateTimeLog.mockClear();
	mockAddManualTime.mockClear();
	mockGetTimeLogConflicts.mockReset();
	mockGetTimeLogConflicts.mockResolvedValue([]);
	mockGetTimeLogs.mockReset();
	mockGetTimeLogs.mockResolvedValue([LOG]);
});

const OTHER_ENTRY = {
	id: 'log-2',
	logType: ETimeLogType.MANUAL,
	isRunning: false,
	startedAt: at(11),
	stoppedAt: at(12)
};

describe('splitCalendarEntry, the entry read again before any write', () => {
	it.each([
		['is gone', []],
		['was moved', [{ ...LOG, startedAt: at(10) }]],
		['was shortened', [{ ...LOG, stoppedAt: at(12) }]],
		['has another task', [{ ...LOG, taskId: 'task-9' }]],
		['has another project', [{ ...LOG, projectId: 'project-9' }]],
		['runs', [{ ...LOG, isRunning: true }]],
		['was approved', [{ ...LOG, timesheet: { status: 'APPROVED' } }]]
	])('writes nothing when the entry %s since the calendar read it', async (_case, onServer) => {
		mockGetTimeLogs.mockResolvedValueOnce(onServer);

		const split = splitCalendarEntry({ log: LOG, splitAt: at(11), secondTask: null, tenantId: 'tenant-1' });

		await expect(split).rejects.toEqual(expect.objectContaining({ failure: 'changed' }));
		expect(mockUpdateTimeLog).not.toHaveBeenCalled();
		expect(mockAddManualTime).not.toHaveBeenCalled();
	});
});

describe('splitCalendarEntry', () => {
	it('shortens the entry first, then adds the rest, since the API deletes whatever new manual time overlaps', async () => {
		await splitCalendarEntry({ log: LOG, splitAt: at(11), secondTask: null, tenantId: 'tenant-1' });

		expect(calls).toEqual(['update 9-11', 'add 11-13']);
	});

	it('gives the new part the fields of the entry, and the task picked for it with its project', async () => {
		const secondTask = { id: 'task-2', projectId: 'project-2' };

		await splitCalendarEntry({ log: LOG, splitAt: at(11), secondTask, tenantId: 'tenant-1' });

		expect(mockAddManualTime).toHaveBeenCalledWith(
			expect.objectContaining({
				tenantId: 'tenant-1',
				employeeId: 'employee-1',
				projectId: 'project-2',
				taskId: 'task-2',
				organizationContactId: 'client-1',
				organizationTeamId: 'team-1',
				description: 'Login page',
				reason: 'Forgot to start timer',
				isBillable: true,
				logType: ETimeLogType.MANUAL,
				source: ETimeLogSource.BROWSER
			})
		);
	});

	it('keeps the project of the entry for a picked task without one', async () => {
		const secondTask = { id: 'task-3', projectId: null };

		await splitCalendarEntry({ log: LOG, splitAt: at(11), secondTask, tenantId: 'tenant-1' });

		expect(mockAddManualTime).toHaveBeenCalledWith(
			expect.objectContaining({ taskId: 'task-3', projectId: 'project-1' })
		);
	});

	it('puts the entry back as it was when the new part cannot be added', async () => {
		mockAddManualTime.mockRejectedValueOnce(new Error('refused'));

		const split = splitCalendarEntry({ log: LOG, splitAt: at(11), secondTask: null, tenantId: 'tenant-1' });

		await expect(split).rejects.toEqual(expect.objectContaining({ failure: 'restored' }));
		expect(calls).toEqual(['update 9-11', 'update 9-13']);
	});

	it('says the outcome is not known when the entry cannot be put back either, since that write may have landed', async () => {
		mockAddManualTime.mockRejectedValueOnce(new Error('refused'));
		mockUpdateTimeLog.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('offline'));

		const split = splitCalendarEntry({ log: LOG, splitAt: at(11), secondTask: null, tenantId: 'tenant-1' });

		await expect(split).rejects.toBeInstanceOf(CalendarSplitError);
		await expect(split).rejects.toEqual(expect.objectContaining({ failure: 'unknown' }));
	});

	it('says the outcome is not known when an entry on the second part has a time that does not read', async () => {
		// It may be the part itself: offering to add the part by hand could add it twice
		const unreadable = { id: 'log-4', startedAt: 'not a date', stoppedAt: 'not a date', taskId: 'task-1' };
		mockAddManualTime.mockRejectedValueOnce(new Error('timeout'));
		mockGetTimeLogConflicts.mockResolvedValueOnce([]).mockResolvedValueOnce([unreadable]);

		const split = splitCalendarEntry({ log: LOG, splitAt: at(11), secondTask: null, tenantId: 'tenant-1' });

		await expect(split).rejects.toEqual(expect.objectContaining({ failure: 'unknown' }));
		expect(calls).toEqual(['update 9-11']);
	});

	it('adds nothing when the entry cannot be shortened, and sets it back in case the answer was only lost', async () => {
		mockUpdateTimeLog.mockRejectedValueOnce(new Error('timeout'));

		const split = splitCalendarEntry({ log: LOG, splitAt: at(11), secondTask: null, tenantId: 'tenant-1' });

		await expect(split).rejects.toEqual(expect.objectContaining({ failure: 'restored' }));
		expect(calls).toEqual(['update 9-13']);
		expect(mockAddManualTime).not.toHaveBeenCalled();
	});

	it('says the outcome is not known when the entry can be neither shortened nor set back', async () => {
		mockUpdateTimeLog.mockRejectedValueOnce(new Error('timeout')).mockRejectedValueOnce(new Error('offline'));

		const split = splitCalendarEntry({ log: LOG, splitAt: at(11), secondTask: null, tenantId: 'tenant-1' });

		await expect(split).rejects.toEqual(expect.objectContaining({ failure: 'unknown' }));
		expect(mockAddManualTime).not.toHaveBeenCalled();
	});
	it('changes nothing when the server holds another entry on the time, since the API would delete it', async () => {
		mockGetTimeLogConflicts.mockResolvedValueOnce([OTHER_ENTRY]);

		const split = splitCalendarEntry({ log: LOG, splitAt: at(11), secondTask: null, tenantId: 'tenant-1' });

		await expect(split).rejects.toEqual(expect.objectContaining({ failure: 'overlap' }));
		expect(calls).toEqual([]);
	});

	it('keeps both parts when the API saved the second one but answered in another shape', async () => {
		mockAddManualTime.mockRejectedValueOnce(new ZodValidationError('unexpected answer', []));

		await splitCalendarEntry({ log: LOG, splitAt: at(11), secondTask: null, tenantId: 'tenant-1' });

		expect(calls).toEqual(['update 9-11']);
	});

	it('counts the split as done when the server holds the very part a lost answer was about', async () => {
		const savedPart = {
			id: 'log-3',
			startedAt: at(11).toISOString(),
			stoppedAt: at(13).toISOString(),
			taskId: 'task-1'
		};
		mockAddManualTime.mockRejectedValueOnce(new Error('timeout'));
		mockGetTimeLogConflicts.mockResolvedValueOnce([]).mockResolvedValueOnce([savedPart]);

		await splitCalendarEntry({ log: LOG, splitAt: at(11), secondTask: null, tenantId: 'tenant-1' });

		expect(calls).toEqual(['update 9-11']);
	});

	it('never stretches the entry over another entry found on the second part, and keeps the first part', async () => {
		mockAddManualTime.mockRejectedValueOnce(new Error('timeout'));
		mockGetTimeLogConflicts.mockResolvedValueOnce([]).mockResolvedValueOnce([OTHER_ENTRY]);

		const split = splitCalendarEntry({ log: LOG, splitAt: at(11), secondTask: null, tenantId: 'tenant-1' });

		await expect(split).rejects.toEqual(expect.objectContaining({ failure: 'first-part-kept' }));
		expect(calls).toEqual(['update 9-11']);
	});

	it('says the outcome is not known when the server cannot say whether the second part was saved', async () => {
		mockAddManualTime.mockRejectedValueOnce(new Error('timeout'));
		mockGetTimeLogConflicts.mockResolvedValueOnce([]).mockRejectedValueOnce(new Error('offline'));

		const split = splitCalendarEntry({ log: LOG, splitAt: at(11), secondTask: null, tenantId: 'tenant-1' });

		await expect(split).rejects.toEqual(expect.objectContaining({ failure: 'unknown' }));
		expect(calls).toEqual(['update 9-11']);
	});
});
