/** @jest-environment jsdom */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { localDayKeyOf } from '@/core/lib/utils/dashboard-export';
import { rowIdentityOfLog, type SheetDay } from '@/core/lib/utils/dashboards/timesheets';
import { ETimeLogType } from '@/core/types/generics/enums/timer';
import { ETimesheetStatus } from '@/core/types/generics/enums/timesheet';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';

const mockCreateTimesheetFrom = jest.fn();
const mockDeleteTaskTimesheetLogs = jest.fn();
const mockUpdateTimeLog = jest.fn();
const mockToastError = jest.fn();

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('sonner', () => ({ toast: { error: (...args: unknown[]) => mockToastError(...args) } }));
jest.mock('@/core/services/client/api/timesheets/time-log.service', () => ({
	timeLogService: {
		createTimesheetFrom: (...args: unknown[]) => mockCreateTimesheetFrom(...args),
		deleteTaskTimesheetLogs: (...args: unknown[]) => mockDeleteTaskTimesheetLogs(...args),
		updateTimeLog: (...args: unknown[]) => mockUpdateTimeLog(...args)
	}
}));

import {
	type CellCommitOutcome,
	type CopyRunResult,
	type SheetWriteScope,
	useSheetCellWrites
} from './use-sheet-cell-writes';

const HOUR = 3600;
const MINUTE = 60;

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

/** Two hours typed in the cell of `identity`: lowering it to 30 minutes deletes the later and shortens the earlier. */
const typedEarly = logOf({
	id: 'typed-early',
	projectId: 'project',
	taskId: 'task',
	logType: ETimeLogType.MANUAL,
	startedAt: at(9),
	stoppedAt: at(10)
});
const typedLate = { ...typedEarly, id: 'typed-late', startedAt: at(11), stoppedAt: at(12) };

async function readTypedCell(): Promise<ReadonlyArray<ITimeLog>> {
	return [typedEarly, typedLate];
}

/** Each right alone stops that lowering, which needs both a delete and a shortening. */
const REFUSED_RIGHTS: Array<{ right: string; rights: Partial<SheetWriteScope> }> = [
	{ right: 'delete', rights: { mayDeleteTime: false } },
	{ right: 'change', rights: { mayModifyTime: false } }
];

/** An entry of another task in the week of `day`, whose timesheet was approved after the sheet was read. */
const approvedSince = logOf({
	id: 'approved',
	projectId: 'project',
	taskId: 'approved-task',
	startedAt: at(14),
	stoppedAt: at(15),
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
		mayDeleteTime: true,
		mayModifyTime: true,
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

/** Types `seconds` in the cell of `identity` on `day`, and answers how the commit went. */
async function commitIn(scope: SheetWriteScope, seconds: number) {
	const { result } = renderWrites(scope);
	let outcome: CellCommitOutcome | undefined;
	await act(async () => {
		outcome = await result.current.commitCell(identity, day, seconds);
	});
	return outcome;
}

describe('useSheetCellWrites', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockCreateTimesheetFrom.mockResolvedValue(undefined);
		mockDeleteTaskTimesheetLogs.mockResolvedValue(undefined);
		mockUpdateTimeLog.mockResolvedValue(undefined);
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

	it('saves nothing in a day approved since the sheet was read', async () => {
		const scope = scopeOf({ readSavedMemberLogs: async () => [approvedSince] });
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

	it('lowers a cell by deleting and shortening its manual entries when the role may do both', async () => {
		const outcome = await commitIn(scopeOf({ readSavedMemberLogs: readTypedCell }), 30 * MINUTE);

		expect(outcome).toBe('saved');
		expect(mockDeleteTaskTimesheetLogs).toHaveBeenCalledWith({ logIds: ['typed-late'] });
		expect(mockUpdateTimeLog).toHaveBeenCalledWith(
			expect.objectContaining({ timeLogId: 'typed-early', stoppedAt: at(9, 30) })
		);
	});

	it.each(REFUSED_RIGHTS)('writes nothing to lower a cell without the right to $right time', async ({ rights }) => {
		const outcome = await commitIn(scopeOf({ ...rights, readSavedMemberLogs: readTypedCell }), 30 * MINUTE);

		expect(outcome).toBe('refused');
		expect(mockDeleteTaskTimesheetLogs).not.toHaveBeenCalled();
		expect(mockUpdateTimeLog).not.toHaveBeenCalled();
		expect(mockToastError).toHaveBeenCalledWith('dashboard.timesheets.SHEET.EDIT.SAVE_FAILED', {
			description: 'dashboard.timesheets.SHEET.EDIT.TAKE_BACK_NOT_ALLOWED'
		});
	});

	it('copies nothing into a day approved since the copy was prepared, and counts it as left out', async () => {
		const scope = scopeOf({ readSavedMemberLogs: async () => [approvedSince] });
		const { result } = renderWrites(scope);

		let run: CopyRunResult | undefined;
		await act(async () => {
			run = await result.current.applyCopyPlan([{ identity, day, seconds: 2 * HOUR }]);
		});

		expect(mockCreateTimesheetFrom).not.toHaveBeenCalled();
		expect(run).toMatchObject({ savedCount: 0, skippedCount: 1, notCopiedCount: 0, isStopped: false });
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
			isPartlyCopied: false,
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
			isPartlyCopied: false,
			isStopped: true
		});
	});

	it('tells a cell the copy stopped in after saving part of its time from the cells it did not copy', async () => {
		// Busy from 10:00 to 11:00: two hours of the first cell go in two entries, 09:00-10:00 and 11:00-12:00
		const busyAtTen = logOf({ id: 'busy', projectId: 'other', startedAt: at(10), stoppedAt: at(11) });
		mockCreateTimesheetFrom.mockResolvedValueOnce(undefined);
		mockCreateTimesheetFrom.mockRejectedValue(new Error('offline'));
		const secondRow = rowIdentityOfLog(logOf({ projectId: 'project', taskId: 'second-task' }));
		const { result } = renderWrites(scopeOf({ readSavedMemberLogs: async () => [busyAtTen] }));
		const plans = [
			{ identity, day, seconds: 2 * HOUR },
			{ identity: secondRow, day, seconds: HOUR }
		];

		let run: CopyRunResult | undefined;
		await act(async () => {
			run = await result.current.applyCopyPlan(plans);
		});

		expect(mockCreateTimesheetFrom).toHaveBeenCalledTimes(2);
		expect(run).toEqual({
			savedCount: 0,
			savedSeconds: 0,
			skippedCount: 0,
			notCopiedCount: 1,
			isPartlyCopied: true,
			isStopped: true
		});
	});
});
