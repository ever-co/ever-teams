/** @jest-environment node */
import { ETimeLogSource, ETimeLogType } from '@/core/types/generics/enums/timer';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';

const calls: string[] = [];
const mockUpdateTimeLog = jest.fn(async (payload: { startedAt?: Date; stoppedAt?: Date }) => {
	calls.push(`update ${payload.startedAt?.getHours()}-${payload.stoppedAt?.getHours()}`);
	return {};
});
const mockAddManualTime = jest.fn(async (request: { startedAt: Date; stoppedAt: Date }) => {
	calls.push(`add ${request.startedAt.getHours()}-${request.stoppedAt.getHours()}`);
	return {};
});

jest.mock('@/core/services/client/api/timesheets/time-log.service', () => ({
	timeLogService: {
		updateTimeLog: (payload: never) => mockUpdateTimeLog(payload),
		addManualTime: (request: never) => mockAddManualTime(request)
	}
}));

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

	it('says the first part was kept when the entry cannot be put back either', async () => {
		mockAddManualTime.mockRejectedValueOnce(new Error('refused'));
		mockUpdateTimeLog.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('offline'));

		const split = splitCalendarEntry({ log: LOG, splitAt: at(11), secondTask: null, tenantId: 'tenant-1' });

		await expect(split).rejects.toBeInstanceOf(CalendarSplitError);
		await expect(split).rejects.toEqual(expect.objectContaining({ failure: 'first-part-kept' }));
	});

	it('adds nothing when the entry cannot be shortened', async () => {
		mockUpdateTimeLog.mockRejectedValueOnce(new Error('refused'));

		await expect(
			splitCalendarEntry({ log: LOG, splitAt: at(11), secondTask: null, tenantId: 'tenant-1' })
		).rejects.toThrow('refused');
		expect(mockAddManualTime).not.toHaveBeenCalled();
	});
});
