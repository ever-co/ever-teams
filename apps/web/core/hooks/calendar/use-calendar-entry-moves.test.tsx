/** @jest-environment jsdom */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import type { CalendarEntry } from '@/core/lib/utils/calendar-view';
import type { TimeWindow } from '@/core/lib/utils/dashboards/timesheet-sheet-edit';
import { queryKeys } from '@/core/query/keys';
import { ETimeLogType } from '@/core/types/generics/enums/timer';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';

const mockGetTimeLogConflicts = jest.fn();
const mockUpdateTimeLog = jest.fn();
const mockToastError = jest.fn();

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('sonner', () => ({ toast: { error: (...args: unknown[]) => mockToastError(...args) } }));
jest.mock('jotai', () => ({
	...jest.requireActual('jotai'),
	useAtomValue: () => ({ allowModifyTime: true, futureDateAllowed: true })
}));
jest.mock('@/core/stores/user/user-organizations', () => ({ currentOrganizationState: 'currentOrganizationState' }));
jest.mock('@/core/hooks/roles/use-my-role-permissions-query', () => ({
	useMyRolePermissionsQuery: () => ({ myPermissions: ['ALLOW_MODIFY_TIME'] })
}));
jest.mock('@/core/hooks/dashboards/timesheets/use-sheet-cell-writes', () => ({
	writeErrorKeyOf: () => 'dashboard.timesheets.SHEET.EDIT.SAVE_FAILED'
}));
jest.mock('@/core/services/client/api/timesheets/time-log.service', () => ({
	timeLogService: {
		getTimeLogConflicts: (...args: unknown[]) => mockGetTimeLogConflicts(...args),
		updateTimeLog: (...args: unknown[]) => mockUpdateTimeLog(...args)
	}
}));

import { useCalendarEntryMoves } from './use-calendar-entry-moves';
import type { CalendarPageState } from './use-calendar-page';

/** A day long past, so "now" never limits where an entry can go. */
function at(hours: number) {
	return new Date(2024, 0, 8, hours, 0);
}

function manualLog(id: string, startHour: number, endHour: number): ITimeLog {
	return {
		id,
		duration: 0,
		version: '1',
		logType: ETimeLogType.MANUAL,
		employeeId: 'member',
		startedAt: at(startHour),
		stoppedAt: at(endHour),
		isRunning: false
	} as ITimeLog;
}

function entryOf(log: ITimeLog): CalendarEntry {
	return { log, start: new Date(log.startedAt as Date), end: new Date(log.stoppedAt as Date) } as CalendarEntry;
}

const movedLog = manualLog('moved', 9, 10);
const movedEntry = entryOf(movedLog);
const elevenToNoon: TimeWindow = { start: at(11), end: at(12) };

const showEntryAt = jest.fn();
const showEntryAsSaved = jest.fn();

function pageOf(overrides: Partial<CalendarPageState>): CalendarPageState {
	return {
		memberLogs: [movedLog],
		movedWindows: new Map<string, TimeWindow>(),
		showEntryAt,
		showEntryAsSaved,
		isLoading: false,
		isShowingPreviousChoice: false,
		...overrides
	} as CalendarPageState;
}

function renderMoves(page: CalendarPageState) {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const wrapper = ({ children }: PropsWithChildren) => (
		<QueryClientProvider client={client}>{children}</QueryClientProvider>
	);
	const view = renderHook(() => useCalendarEntryMoves(page, () => true), { wrapper });
	return { ...view, client };
}

describe('useCalendarEntryMoves', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockGetTimeLogConflicts.mockResolvedValue([]);
		mockUpdateTimeLog.mockResolvedValue(undefined);
	});

	it('saves a move on a place the API holds nothing on', async () => {
		const { result } = renderMoves(pageOf({}));

		await act(async () => {
			result.current.moveEntry(movedEntry, elevenToNoon);
		});

		expect(mockGetTimeLogConflicts).toHaveBeenCalledWith({
			employeeId: 'member',
			startDate: at(11),
			endDate: at(12),
			ignoreId: 'moved'
		});
		expect(mockUpdateTimeLog).toHaveBeenCalledTimes(1);
		expect(mockUpdateTimeLog).toHaveBeenCalledWith(
			expect.objectContaining({ timeLogId: 'moved', startedAt: at(11), stoppedAt: at(12) })
		);
	});

	it('refuses a place taken by an entry saved since the grid was read, and sends no update', async () => {
		const savedElsewhere = manualLog('unseen', 11, 12);
		mockGetTimeLogConflicts.mockResolvedValue([savedElsewhere]);
		const { result } = renderMoves(pageOf({}));

		await act(async () => {
			result.current.moveEntry(movedEntry, elevenToNoon);
		});

		expect(mockUpdateTimeLog).not.toHaveBeenCalled();
		expect(mockToastError).toHaveBeenCalledWith('dashboard.calendar.DRAG.REFUSED_TITLE', {
			description: 'dashboard.calendar.DRAG.OVERLAP'
		});
		expect(showEntryAsSaved).toHaveBeenCalledWith('moved');
	});

	it('sends no update when the place could not be checked', async () => {
		mockGetTimeLogConflicts.mockRejectedValue(new Error('offline'));
		const { result } = renderMoves(pageOf({}));

		await act(async () => {
			result.current.moveEntry(movedEntry, elevenToNoon);
		});

		expect(mockUpdateTimeLog).not.toHaveBeenCalled();
		expect(mockToastError).toHaveBeenCalledWith('dashboard.calendar.DRAG.SAVE_FAILED', expect.anything());
		expect(showEntryAsSaved).toHaveBeenCalledWith('moved');
	});

	it('reads the days again when the update fails, so the grid shows where the entry really is', async () => {
		mockUpdateTimeLog.mockRejectedValue(new Error('timeout'));
		const { result, client } = renderMoves(pageOf({}));
		const invalidateQueries = jest.spyOn(client, 'invalidateQueries');

		await act(async () => {
			result.current.moveEntry(movedEntry, elevenToNoon);
		});

		expect(mockToastError).toHaveBeenCalledWith('dashboard.calendar.DRAG.SAVE_FAILED', expect.anything());
		expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.timesheet.all });
		expect(showEntryAsSaved).toHaveBeenCalledWith('moved');
	});

	it('takes one move at a time', async () => {
		let answerFirstCheck: (conflicts: ITimeLog[]) => void = () => undefined;
		const firstCheck = new Promise<ITimeLog[]>((resolve) => {
			answerFirstCheck = resolve;
		});
		mockGetTimeLogConflicts.mockReturnValueOnce(firstCheck);
		const otherLog = manualLog('other', 13, 14);
		const otherEntry = entryOf(otherLog);
		const { result } = renderMoves(pageOf({ memberLogs: [movedLog, otherLog] }));

		act(() => {
			result.current.moveEntry(movedEntry, elevenToNoon);
		});
		act(() => {
			result.current.moveEntry(otherEntry, { start: at(9), end: at(10) });
		});
		await act(async () => {
			answerFirstCheck([]);
		});

		expect(mockGetTimeLogConflicts).toHaveBeenCalledTimes(1);
		expect(mockUpdateTimeLog).toHaveBeenCalledTimes(1);
		expect(mockUpdateTimeLog).toHaveBeenCalledWith(expect.objectContaining({ timeLogId: 'moved' }));
	});

	it('lets no entry be picked up while a move is being saved', () => {
		const otherEntry = entryOf(manualLog('other', 13, 14));
		const movedWindows = new Map<string, TimeWindow>([['moved', elevenToNoon]]);
		const { result } = renderMoves(pageOf({ movedWindows }));

		expect(result.current.canDragEntry(otherEntry)).toBe(false);
	});

	it('lets a manual entry be picked up when nothing is being saved', () => {
		const { result } = renderMoves(pageOf({}));

		expect(result.current.canDragEntry(movedEntry)).toBe(true);
	});
});
