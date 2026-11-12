/** @jest-environment jsdom */

import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { localDayKeyOf } from '@/core/lib/utils/dashboard-export';
import { rowIdentityOfLog, type SheetDay } from '@/core/lib/utils/dashboards/timesheets';
import { queryKeys } from '@/core/query/keys';
import { ETimeLogType } from '@/core/types/generics/enums/timer';
import { ETimesheetStatus } from '@/core/types/generics/enums/timesheet';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';

const mockCreateTimesheetFrom = jest.fn();
const mockToastError = jest.fn();
const mockToastWarning = jest.fn();

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('sonner', () => ({
	toast: {
		error: (...args: unknown[]) => mockToastError(...args),
		warning: (...args: unknown[]) => mockToastWarning(...args)
	}
}));
jest.mock('@/core/services/client/api/timesheets/time-log.service', () => ({
	timeLogService: {
		createTimesheetFrom: (...args: unknown[]) => mockCreateTimesheetFrom(...args),
		deleteTaskTimesheetLogs: jest.fn(),
		updateTimeLog: jest.fn()
	}
}));

import {
	type CellCommitOutcome,
	type CopyRunResult,
	type SheetWriteScope,
	useSheetCellWrites
} from './use-sheet-cell-writes';

const HOUR = 3600;

/** A day long past, so "now" never limits where time can go. */
function at(hours: number, minutes = 0) {
	return new Date(2024, 0, 8, hours, minutes);
}

function logOf(overrides: Partial<ITimeLog>): ITimeLog {
	return {
		id: 'log',
		duration: 0,
		version: '1',
		logType: ETimeLogType.TRACKED,
		employeeId: 'member',
		...overrides
	};
}

const day: SheetDay = { key: localDayKeyOf(at(0)), date: at(0), isToday: false, isWeekend: false };
const identity = rowIdentityOfLog(logOf({ projectId: 'project', taskId: 'task' }));

/** A log of another row whose timesheet, approved, covers the week of `day`. */
const approvedElsewhere = logOf({
	id: 'approved',
	projectId: 'other',
	startedAt: at(9),
	stoppedAt: at(10),
	timesheet: {
		id: 'sheet',
		status: ETimesheetStatus.APPROVED,
		startedAt: new Date(2024, 0, 8),
		stoppedAt: new Date(2024, 0, 14)
	} as ITimeLog['timesheet']
});

function scopeOf(overrides: Partial<SheetWriteScope>): SheetWriteScope {
	return {
		memberId: 'member',
		defaultTeamId: 'team',
		allowsFutureDates: false,
		readMemberLogs: () => [],
		readSavedMemberLogs: async () => [],
		...overrides
	};
}

function renderWrites(scope: SheetWriteScope) {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const wrapper = ({ children }: PropsWithChildren) => (
		<QueryClientProvider client={client}>{children}</QueryClientProvider>
	);
	return renderHook(() => useSheetCellWrites(scope), { wrapper });
}

describe('useSheetCellWrites', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockCreateTimesheetFrom.mockResolvedValue(undefined);
	});

	it('places typed time around an entry saved since the page was read', async () => {
		const savedElsewhere = logOf({ id: 'tracked', projectId: 'other', startedAt: at(9), stoppedAt: at(10) });
		const scope = scopeOf({ readSavedMemberLogs: async () => [savedElsewhere] });
		const { result } = renderWrites(scope);

		let outcome: CellCommitOutcome | undefined;
		await act(async () => {
			outcome = await result.current.commitCell(identity, day, 2 * HOUR);
		});

		expect(outcome).toBe('saved');
		expect(mockCreateTimesheetFrom).toHaveBeenCalledTimes(1);
		expect(mockCreateTimesheetFrom).toHaveBeenCalledWith(
			expect.objectContaining({ startedAt: at(10), stoppedAt: at(12), employeeId: 'member' })
		);
	});

	it('saves nothing when the read before the write fails', async () => {
		const failingRead = async (): Promise<ReadonlyArray<ITimeLog>> => {
			throw new Error('offline');
		};
		const scope = scopeOf({ readSavedMemberLogs: failingRead });
		const { result } = renderWrites(scope);

		let outcome: CellCommitOutcome | undefined;
		await act(async () => {
			outcome = await result.current.commitCell(identity, day, 2 * HOUR);
		});

		expect(outcome).toBe('refused');
		expect(mockCreateTimesheetFrom).not.toHaveBeenCalled();
		expect(mockToastError).toHaveBeenCalledWith('dashboard.timesheets.SHEET.EDIT.SAVE_FAILED', expect.anything());
	});

	it('refuses a cell of a day approved since the page was read', async () => {
		const scope = scopeOf({ readSavedMemberLogs: async () => [approvedElsewhere] });
		const { result } = renderWrites(scope);

		let outcome: CellCommitOutcome | undefined;
		await act(async () => {
			outcome = await result.current.commitCell(identity, day, 2 * HOUR);
		});

		expect(outcome).toBe('refused');
		expect(mockCreateTimesheetFrom).not.toHaveBeenCalled();
		expect(mockToastError).toHaveBeenCalledWith('dashboard.timesheets.SHEET.EDIT.SAVE_FAILED', {
			description: 'dashboard.timesheets.SHEET.EDIT.LOCK_APPROVED'
		});
	});

	it('says so when the sheet cannot be read again after a save', async () => {
		const readSheet = jest.fn<Promise<ITimeLog[]>, []>();
		readSheet.mockResolvedValueOnce([]);
		readSheet.mockRejectedValue(new Error('offline'));
		const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
		const wrapper = ({ children }: PropsWithChildren) => (
			<QueryClientProvider client={client}>{children}</QueryClientProvider>
		);
		const { result } = renderHook(
			() => {
				useQuery({ queryKey: [...queryKeys.timesheet.all, 'shown-sheet'], queryFn: readSheet });
				return useSheetCellWrites(scopeOf({}));
			},
			{ wrapper }
		);
		await waitFor(() => expect(readSheet).toHaveBeenCalledTimes(1));

		let outcome: CellCommitOutcome | undefined;
		await act(async () => {
			outcome = await result.current.commitCell(identity, day, HOUR);
		});

		expect(outcome).toBe('saved');
		expect(mockToastWarning).toHaveBeenCalledWith('dashboard.timesheets.SHEET.EDIT.STALE_TITLE', {
			description: 'dashboard.timesheets.SHEET.EDIT.STALE'
		});
	});

	it('leaves alone a day approved since the copy was prepared', async () => {
		const scope = scopeOf({ readSavedMemberLogs: async () => [approvedElsewhere] });
		const { result } = renderWrites(scope);

		let run: CopyRunResult | undefined;
		await act(async () => {
			run = await result.current.applyCopyPlan([{ identity, day, seconds: HOUR }]);
		});

		expect(run).toEqual({
			savedCount: 0,
			savedSeconds: 0,
			skippedCount: 1,
			notCopiedCount: 0,
			isStopped: false
		});
		expect(mockCreateTimesheetFrom).not.toHaveBeenCalled();
	});

	it('copies into the cells still empty and leaves alone one filled since the copy was prepared', async () => {
		const filledSince = logOf({
			id: 'typed',
			projectId: 'project',
			taskId: 'task',
			logType: ETimeLogType.MANUAL,
			startedAt: at(9),
			stoppedAt: at(10)
		});
		const emptyRow = rowIdentityOfLog(logOf({ projectId: 'project', taskId: 'other-task' }));
		const scope = scopeOf({ readSavedMemberLogs: async () => [filledSince] });
		const { result } = renderWrites(scope);
		const plans = [
			{ identity, day, seconds: 2 * HOUR },
			{ identity: emptyRow, day, seconds: 2 * HOUR }
		];

		let run: CopyRunResult | undefined;
		await act(async () => {
			run = await result.current.applyCopyPlan(plans);
		});

		expect(run).toEqual({
			savedCount: 1,
			savedSeconds: 2 * HOUR,
			skippedCount: 1,
			notCopiedCount: 0,
			isStopped: false
		});
		expect(mockCreateTimesheetFrom).toHaveBeenCalledTimes(1);
		expect(mockCreateTimesheetFrom).toHaveBeenCalledWith(
			expect.objectContaining({ taskId: 'other-task', startedAt: at(10), stoppedAt: at(12) })
		);
	});

	it('counts the cells a copy stopped by an error did not copy', async () => {
		mockCreateTimesheetFrom.mockResolvedValueOnce(undefined);
		mockCreateTimesheetFrom.mockRejectedValue(new Error('offline'));
		const secondRow = rowIdentityOfLog(logOf({ projectId: 'project', taskId: 'second-task' }));
		const thirdRow = rowIdentityOfLog(logOf({ projectId: 'project', taskId: 'third-task' }));
		const { result } = renderWrites(scopeOf({}));
		const plans = [
			{ identity, day, seconds: HOUR },
			{ identity: secondRow, day, seconds: HOUR },
			{ identity: thirdRow, day, seconds: HOUR }
		];

		let run: CopyRunResult | undefined;
		await act(async () => {
			run = await result.current.applyCopyPlan(plans);
		});

		expect(run).toEqual({
			savedCount: 1,
			savedSeconds: HOUR,
			skippedCount: 0,
			notCopiedCount: 2,
			isStopped: true
		});
	});
});
