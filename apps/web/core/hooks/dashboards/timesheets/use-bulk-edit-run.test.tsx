/** @jest-environment jsdom */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import type { BulkEditOutcome, BulkEditSave } from '@/core/lib/utils/dashboards/timesheet-bulk-edit';
import { queryKeys } from '@/core/query/keys';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';

const mockGetTimeLogConflicts = jest.fn();
const mockUpdateTimeLog = jest.fn();
const mockGetTimeLogs = jest.fn();
/** The entries as the API holds them now; a test changes one here to play an edit made in another tab. */
let mockStoredLogs: ITimeLog[] = [];

jest.mock('@/core/services/client/api/timesheets/time-log.service', () => ({
	timeLogService: {
		getTimeLogConflicts: (params: unknown) => mockGetTimeLogConflicts(params),
		getTimeLogs: (params: unknown) => mockGetTimeLogs(params),
		updateTimeLog: (payload: unknown) => mockUpdateTimeLog(payload)
	}
}));
const mockWorkspace = { organizationId: 'organization-a', tenantId: 'tenant-a' };
jest.mock('@/core/lib/helpers/cookies', () => ({
	getOrganizationIdCookie: () => mockWorkspace.organizationId,
	getTenantIdCookie: () => mockWorkspace.tenantId
}));
jest.mock('@/core/lib/helpers/error-message', () => ({ logErrorInDev: jest.fn() }));

import { useBulkEditRun } from './use-bulk-edit-run';

const startedAt = new Date('2026-11-10T09:00:00.000Z');
const stoppedAt = new Date('2026-11-10T10:00:00.000Z');

function saveOf(id: string, overrides: Partial<ITimeLog> = {}): BulkEditSave {
	const log: ITimeLog = {
		id,
		duration: 3600,
		version: '1',
		employeeId: 'member',
		startedAt,
		stoppedAt,
		...overrides
	};
	mockStoredLogs.push({ ...log });
	return { log, fields: { isBillable: true } };
}

interface TimeLogsRead {
	startDate: Date;
	endDate: Date;
	employeeIds: string[];
}

/** The API lists the member's entries that start within the days read: the test reads whole days in UTC. */
function isReadBy({ startDate, endDate, employeeIds }: TimeLogsRead) {
	const from = new Date(startDate).setUTCHours(0, 0, 0, 0);
	const to = new Date(endDate).setUTCHours(23, 59, 59, 999);
	return (log: ITimeLog) => {
		const start = new Date(log.startedAt ?? 0).getTime();
		const isOfMember = employeeIds.includes(log.employeeId ?? '');
		return isOfMember && start >= from && start <= to;
	};
}

function storedLog(id: string): ITimeLog {
	const log = mockStoredLogs.find((candidate) => candidate.id === id);
	if (!log) {
		throw new Error(`No stored entry ${id}`);
	}
	return log;
}

/** Another entry of the member, recorded over the same hour. */
const overlappedLog = {
	id: 'other',
	startedAt: '2026-11-10T09:30:00.000Z',
	stoppedAt: '2026-11-10T10:30:00.000Z',
	isRunning: false
};

function renderRun() {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const invalidate = jest.spyOn(client, 'invalidateQueries');
	const wrapper = ({ children }: PropsWithChildren) => (
		<QueryClientProvider client={client}>{children}</QueryClientProvider>
	);
	const rendered = renderHook(() => useBulkEditRun(), { wrapper });
	return { ...rendered, invalidate };
}

/** A call the test answers when it chooses. */
function pendingCall<Value>() {
	let settle: (value: Value) => void = () => undefined;
	const promise = new Promise<Value>((resolve) => {
		settle = resolve;
	});
	return { promise, settle: (value: Value) => settle(value) };
}

async function flushPromises() {
	await act(async () => {
		await new Promise((resolve) => setTimeout(resolve, 0));
	});
}

describe('useBulkEditRun', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockStoredLogs = [];
		mockGetTimeLogs.mockImplementation(async (params: TimeLogsRead) => mockStoredLogs.filter(isReadBy(params)));
		mockGetTimeLogConflicts.mockResolvedValue([]);
		mockUpdateTimeLog.mockResolvedValue({});
	});

	it('saves an entry with the start and end it has now, not the ones read when the dialog opened', async () => {
		const save = saveOf('a');
		// Another tab shortens the entry to 09:00-09:30 while the dialog is open
		const shortenedEnd = new Date('2026-11-10T09:30:00.000Z');
		storedLog('a').stoppedAt = shortenedEnd;
		const { result } = renderRun();

		let outcomes: BulkEditOutcome[] | null = null;
		await act(async () => {
			outcomes = await result.current.run([save]);
		});

		expect(outcomes).toEqual([{ logId: 'a', status: 'updated' }]);
		expect(mockGetTimeLogs).toHaveBeenCalledWith({
			startDate: startedAt,
			endDate: stoppedAt,
			employeeIds: ['member']
		});
		expect(mockGetTimeLogConflicts).toHaveBeenCalledWith(expect.objectContaining({ endDate: shortenedEnd }));
		expect(mockUpdateTimeLog).toHaveBeenCalledWith({
			timeLogId: 'a',
			startedAt,
			stoppedAt: shortenedEnd,
			employeeId: 'member',
			isBillable: true
		});
	});

	it('saves nothing for an entry that is gone since the dialog read it, and goes on with the next', async () => {
		const removed = saveOf('a');
		const kept = saveOf('b');
		mockStoredLogs = mockStoredLogs.filter((log) => log.id !== 'a');
		const { result } = renderRun();

		let outcomes: BulkEditOutcome[] | null = null;
		await act(async () => {
			outcomes = await result.current.run([removed, kept]);
		});

		expect(outcomes).toEqual([
			{ logId: 'a', status: 'failed' },
			{ logId: 'b', status: 'updated' }
		]);
		expect(mockUpdateTimeLog).toHaveBeenCalledTimes(1);
		expect(mockUpdateTimeLog).toHaveBeenCalledWith(expect.objectContaining({ timeLogId: 'b' }));
	});

	it.each([
		['moved to another project', { projectId: 'project-b' }],
		['moved to another task', { taskId: 'task-b' }],
		['made billable', { isBillable: true }],
		['approved', { timesheet: { status: 'APPROVED' } }],
		['started running', { isRunning: true }]
	])('saves nothing for an entry %s since the dialog planned its fields', async (_changed, change) => {
		const save = saveOf('a');
		Object.assign(storedLog('a'), change);
		const { result } = renderRun();

		let outcomes: BulkEditOutcome[] | null = null;
		await act(async () => {
			outcomes = await result.current.run([save]);
		});

		// The plan sends only what differed from the old values: sent now, it could leave a task on another project
		expect(outcomes).toEqual([{ logId: 'a', status: 'failed' }]);
		expect(mockUpdateTimeLog).not.toHaveBeenCalled();
	});

	it('saves nothing for an entry moved to another day since the dialog read it', async () => {
		const save = saveOf('a');
		storedLog('a').startedAt = new Date('2026-11-12T09:00:00.000Z');
		storedLog('a').stoppedAt = new Date('2026-11-12T10:00:00.000Z');
		const { result } = renderRun();

		let outcomes: BulkEditOutcome[] | null = null;
		await act(async () => {
			outcomes = await result.current.run([save]);
		});

		expect(outcomes).toEqual([{ logId: 'a', status: 'failed' }]);
		expect(mockUpdateTimeLog).not.toHaveBeenCalled();
	});

	it('saves nothing for an entry that cannot be read again', async () => {
		mockGetTimeLogs.mockRejectedValueOnce(new Error('The API is unreachable'));
		const { result } = renderRun();

		let outcomes: BulkEditOutcome[] | null = null;
		await act(async () => {
			outcomes = await result.current.run([saveOf('a')]);
		});

		expect(outcomes).toEqual([{ logId: 'a', status: 'failed' }]);
		expect(mockGetTimeLogConflicts).not.toHaveBeenCalled();
		expect(mockUpdateTimeLog).not.toHaveBeenCalled();
	});

	it('saves each entry with its own interval and member, and the changed fields only', async () => {
		const { result } = renderRun();

		let outcomes: BulkEditOutcome[] | null = null;
		await act(async () => {
			outcomes = await result.current.run([saveOf('a'), saveOf('b', { employeeId: 'other-member' })]);
		});

		expect(outcomes).toEqual([
			{ logId: 'a', status: 'updated' },
			{ logId: 'b', status: 'updated' }
		]);
		expect(mockUpdateTimeLog.mock.calls).toEqual([
			[{ timeLogId: 'a', startedAt, stoppedAt, employeeId: 'member', isBillable: true }],
			[{ timeLogId: 'b', startedAt, stoppedAt, employeeId: 'other-member', isBillable: true }]
		]);
	});

	it('writes nothing more once another tab switched the workspace, and counts what was left as not saved', async () => {
		const lookup = pendingCall<unknown[]>();
		mockGetTimeLogConflicts.mockReturnValueOnce(lookup.promise);
		const { result } = renderRun();

		let running: Promise<BulkEditOutcome[] | null> = Promise.resolve(null);
		act(() => {
			running = result.current.run([
				saveOf('a', { organizationId: 'organization-a', tenantId: 'tenant-a' }),
				saveOf('b', { organizationId: 'organization-a', tenantId: 'tenant-a' })
			]);
		});
		await flushPromises();
		// Another tab picks a team of another organization while the first entry's overlap is being asked
		mockWorkspace.organizationId = 'organization-b';

		let outcomes: BulkEditOutcome[] | null = null;
		await act(async () => {
			lookup.settle([]);
			outcomes = await running;
		});

		mockWorkspace.organizationId = 'organization-a';
		expect(mockUpdateTimeLog).not.toHaveBeenCalled();
		expect(mockGetTimeLogConflicts).toHaveBeenCalledTimes(1);
		expect(outcomes).toEqual([
			{ logId: 'a', status: 'failed' },
			{ logId: 'b', status: 'failed' }
		]);
	});

	it("asks what each entry overlaps before its save, the entry's own time aside", async () => {
		const { result } = renderRun();

		await act(async () => {
			await result.current.run([saveOf('a')]);
		});

		expect(mockGetTimeLogConflicts).toHaveBeenCalledWith({
			employeeId: 'member',
			startDate: startedAt,
			endDate: stoppedAt,
			ignoreId: 'a'
		});
		const lookupOrder = mockGetTimeLogConflicts.mock.invocationCallOrder[0];
		const saveOrder = mockUpdateTimeLog.mock.invocationCallOrder[0];
		expect(lookupOrder).toBeLessThan(saveOrder);
	});

	it('goes through the entries one at a time', async () => {
		const firstSave = pendingCall<unknown>();
		mockUpdateTimeLog.mockReturnValueOnce(firstSave.promise);
		const { result } = renderRun();

		let running: Promise<BulkEditOutcome[] | null> = Promise.resolve(null);
		act(() => {
			running = result.current.run([saveOf('a'), saveOf('b')]);
		});
		await flushPromises();

		expect(mockGetTimeLogConflicts).toHaveBeenCalledTimes(1);
		expect(mockUpdateTimeLog).toHaveBeenCalledTimes(1);
		expect(result.current.progress).toEqual({ done: 0, total: 2 });

		await act(async () => {
			firstSave.settle({});
			await running;
		});

		expect(mockGetTimeLogConflicts).toHaveBeenCalledTimes(2);
		expect(mockUpdateTimeLog).toHaveBeenCalledTimes(2);
		expect(result.current.progress).toEqual({ done: 2, total: 2 });
	});

	it('never saves an entry whose save would remove other recorded time, and goes on with the next', async () => {
		mockGetTimeLogConflicts.mockResolvedValueOnce([overlappedLog]);
		const { result } = renderRun();

		let outcomes: BulkEditOutcome[] | null = null;
		await act(async () => {
			outcomes = await result.current.run([saveOf('a'), saveOf('b')]);
		});

		expect(outcomes).toEqual([
			{ logId: 'a', status: 'overlap' },
			{ logId: 'b', status: 'updated' }
		]);
		expect(mockUpdateTimeLog).toHaveBeenCalledTimes(1);
		expect(mockUpdateTimeLog).toHaveBeenCalledWith(expect.objectContaining({ timeLogId: 'b' }));
	});

	it('saves nothing for an entry whose overlap lookup fails', async () => {
		mockGetTimeLogConflicts.mockRejectedValueOnce(new Error('The API is unreachable'));
		const { result } = renderRun();

		let outcomes: BulkEditOutcome[] | null = null;
		await act(async () => {
			outcomes = await result.current.run([saveOf('a'), saveOf('b')]);
		});

		expect(outcomes).toEqual([
			{ logId: 'a', status: 'checkFailed' },
			{ logId: 'b', status: 'updated' }
		]);
		expect(mockUpdateTimeLog).toHaveBeenCalledTimes(1);
	});

	it('goes on after a save the API refuses, and says why it was refused', async () => {
		const refusal = new Error('Failed to update time-log', { cause: { status: 403 } });
		mockUpdateTimeLog.mockRejectedValueOnce(refusal);
		const { result } = renderRun();

		let outcomes: BulkEditOutcome[] | null = null;
		await act(async () => {
			outcomes = await result.current.run([saveOf('a'), saveOf('b')]);
		});

		expect(outcomes).toEqual([
			{ logId: 'a', status: 'failed', detailKey: 'dashboard.timesheets.SHEET.EDIT.REFUSED' },
			{ logId: 'b', status: 'updated' }
		]);
	});

	it('sends nothing for an entry without an interval to send back', async () => {
		const { result } = renderRun();

		let outcomes: BulkEditOutcome[] | null = null;
		await act(async () => {
			outcomes = await result.current.run([saveOf('a', { stoppedAt: undefined })]);
		});

		expect(outcomes).toEqual([{ logId: 'a', status: 'failed' }]);
		expect(mockGetTimeLogConflicts).not.toHaveBeenCalled();
		expect(mockUpdateTimeLog).not.toHaveBeenCalled();
	});

	it('sends nothing once the page is left while an overlap lookup is pending', async () => {
		const lookup = pendingCall<unknown[]>();
		mockGetTimeLogConflicts.mockReturnValueOnce(lookup.promise);
		const { result, unmount } = renderRun();

		let running: Promise<BulkEditOutcome[] | null> = Promise.resolve(null);
		act(() => {
			running = result.current.run([saveOf('a'), saveOf('b')]);
		});
		await flushPromises();
		unmount();
		let outcomes: BulkEditOutcome[] | null = null;
		await act(async () => {
			lookup.settle([]);
			outcomes = await running;
		});

		expect(mockUpdateTimeLog).not.toHaveBeenCalled();
		expect(outcomes).toEqual([]);
	});

	it('does not start a second run while one is going', async () => {
		const firstSave = pendingCall<unknown>();
		mockUpdateTimeLog.mockReturnValueOnce(firstSave.promise);
		const { result } = renderRun();

		let running: Promise<BulkEditOutcome[] | null> = Promise.resolve(null);
		act(() => {
			running = result.current.run([saveOf('a')]);
		});
		await flushPromises();
		let second: BulkEditOutcome[] | null = [];
		await act(async () => {
			second = await result.current.run([saveOf('a')]);
		});

		expect(second).toBeNull();
		expect(mockUpdateTimeLog).toHaveBeenCalledTimes(1);

		await act(async () => {
			firstSave.settle({});
			await running;
		});
	});

	it('reads the views again once after a run that saved an entry, and not after one that saved none', async () => {
		const saved = renderRun();
		await act(async () => {
			await saved.result.current.run([saveOf('a'), saveOf('b')]);
		});

		const refreshedKeys = saved.invalidate.mock.calls.map(([filters]) => filters?.queryKey);
		expect(refreshedKeys).toEqual([queryKeys.timeLogs.all, queryKeys.activities.all, queryKeys.timesheet.all]);

		mockGetTimeLogConflicts.mockResolvedValue([overlappedLog]);
		const refused = renderRun();
		await act(async () => {
			await refused.result.current.run([saveOf('a')]);
		});

		expect(refused.invalidate).not.toHaveBeenCalled();
	});

	it('reads the views again after a save that failed, since the API may have applied it before the error', async () => {
		mockUpdateTimeLog.mockRejectedValueOnce(new Error('The request timed out'));
		const { result, invalidate } = renderRun();
		await act(async () => {
			await result.current.run([saveOf('a')]);
		});

		const refreshedKeys = invalidate.mock.calls.map(([filters]) => filters?.queryKey);
		expect(refreshedKeys).toEqual([queryKeys.timeLogs.all, queryKeys.activities.all, queryKeys.timesheet.all]);
	});
});
