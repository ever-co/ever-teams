/** @jest-environment jsdom */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider, createStore } from 'jotai';
import { renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';

import { timesheetFilterStatusState } from '@/core/stores';
import { ETimesheetStatus } from '@/core/types/generics/enums/timesheet';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';

const mockUser = {
	id: 'user-a',
	tenantId: 'tenant-a',
	timeZone: 'UTC',
	employee: { id: 'employee-a', tenantId: 'tenant-a', organizationId: 'organization-a' }
};
const mockGetTimeLogs = jest.fn();

jest.mock('../auth', () => ({
	useAuthenticateUser: () => ({ user: mockUser, isTeamManager: true })
}));
jest.mock('@/core/services/client/api/timesheets/time-log.service', () => ({
	timeLogService: { getTimeLogs: (params: unknown) => mockGetTimeLogs(params) }
}));

import { useTimesheetQuery } from './use-timesheet-query';

// The atom is typed { value, label }, but the Status select of the Filter popover stores the picked statusTable rows
// as they are: a label and a description, no value
type StatusFilterOption = { value: string; label: string };
type StatusTableRow = { label: ETimesheetStatus; description: string };

const approvedRow: StatusTableRow = { label: ETimesheetStatus.APPROVED, description: 'The item has been approved' };
const inReviewRow: StatusTableRow = { label: ETimesheetStatus.IN_REVIEW, description: 'The item is being reviewed' };

const startDate = new Date(2026, 9, 19);
const endDate = new Date(2026, 9, 25);

function timeLog(id: string, status?: ETimesheetStatus): ITimeLog {
	const timesheet = { id: `timesheet-${id}`, status, createdAt: '2026-10-20T09:00:00.000Z' };
	return { id, duration: 3600, timesheetId: timesheet.id, timesheet } as unknown as ITimeLog;
}

const loadedLogs = [
	timeLog('approved-log', ETimesheetStatus.APPROVED),
	timeLog('pending-log', ETimesheetStatus.PENDING),
	timeLog('in-review-log', ETimesheetStatus.IN_REVIEW),
	timeLog('no-status-log')
];

function logIds(logs: ITimeLog[]): string[] {
	return logs.map((log) => log.id);
}

function renderTimesheetQuery(pickedRows: StatusTableRow[]) {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const store = createStore();
	store.set(timesheetFilterStatusState, pickedRows as unknown as StatusFilterOption[]);
	const wrapper = ({ children }: PropsWithChildren) => (
		<QueryClientProvider client={client}>
			<Provider store={store}>{children}</Provider>
		</QueryClientProvider>
	);
	return renderHook(() => useTimesheetQuery({ startDate, endDate, timesheetViewMode: 'ListView' }), { wrapper });
}

describe('useTimesheetQuery Status filter of the Filter popover', () => {
	beforeEach(() => {
		mockGetTimeLogs.mockResolvedValue(loadedLogs);
	});

	it('keeps only the loaded logs whose timesheet has one of the picked statuses', async () => {
		const { result } = renderTimesheetQuery([approvedRow, inReviewRow]);

		await waitFor(() => expect(result.current.timesheetLogsQuery.isSuccess).toBe(true));

		const rowIds = logIds(result.current.timesheet);
		const approvedIds = logIds(result.current.statusTimesheet[ETimesheetStatus.APPROVED]);
		const inReviewIds = logIds(result.current.statusTimesheet[ETimesheetStatus.IN_REVIEW]);
		const pendingIds = logIds(result.current.statusTimesheet[ETimesheetStatus.PENDING]);
		expect(rowIds).toEqual(['approved-log', 'in-review-log']);
		expect(approvedIds).toEqual(['approved-log']);
		expect(inReviewIds).toEqual(['in-review-log']);
		expect(pendingIds).toEqual([]);
	});

	it('keeps every loaded log when no status is picked', async () => {
		// getStatusTimesheet warns about the log that has no status
		jest.spyOn(console, 'warn').mockImplementation(() => undefined);
		const { result } = renderTimesheetQuery([]);

		await waitFor(() => expect(result.current.timesheetLogsQuery.isSuccess).toBe(true));

		const rowIds = logIds(result.current.timesheet);
		const loadedIds = logIds(loadedLogs);
		expect(rowIds).toEqual(loadedIds);
	});
});
