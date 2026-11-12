/** @jest-environment jsdom */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import type { BulkEditOutcome, BulkEditSave } from '@/core/lib/utils/dashboards/timesheet-bulk-edit';
import { queryKeys } from '@/core/query/keys';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';

const mockGetTimeLogConflicts = jest.fn();
const mockUpdateTimeLog = jest.fn();

jest.mock('@/core/services/client/api/timesheets/time-log.service', () => ({
	timeLogService: {
		getTimeLogConflicts: (params: unknown) => mockGetTimeLogConflicts(params),
		updateTimeLog: (payload: unknown) => mockUpdateTimeLog(payload)
	}
}));
jest.mock('@/core/lib/helpers/cookies', () => ({
	getOrganizationIdCookie: () => 'organization-a',
	getTenantIdCookie: () => 'tenant-a'
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
	return { log, fields: { isBillable: true } };
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
		mockGetTimeLogConflicts.mockResolvedValue([]);
		mockUpdateTimeLog.mockResolvedValue({});
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
});
