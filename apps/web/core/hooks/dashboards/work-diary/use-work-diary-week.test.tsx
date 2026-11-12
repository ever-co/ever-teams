/** @jest-environment jsdom */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import type { Period } from '@/core/lib/utils/dashboard-period';
import { ETimeLogType } from '@/core/types/generics/enums/timer';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';

const mockGetTimeLogs = jest.fn();

jest.mock('@/core/services/client/api/timesheets/time-log.service', () => ({
	timeLogService: { getTimeLogs: (...args: unknown[]) => mockGetTimeLogs(...args) }
}));

import { useWorkDiaryWeek, type WorkDiaryWeekScope } from './use-work-diary-week';

const thisWeek: Period = { from: new Date(2024, 0, 8), to: new Date(2024, 0, 14, 23, 59, 59, 999) };
const nextWeek: Period = { from: new Date(2024, 0, 15), to: new Date(2024, 0, 21, 23, 59, 59, 999) };

function logOf(id: string, employeeId: string): ITimeLog {
	return {
		id,
		duration: 0,
		version: '1',
		logType: ETimeLogType.TRACKED,
		employeeId,
		startedAt: new Date(2024, 0, 9, 9),
		stoppedAt: new Date(2024, 0, 9, 10)
	};
}

function scopeOf(overrides: Partial<WorkDiaryWeekScope>): WorkDiaryWeekScope {
	return {
		tenantId: 'tenant',
		organizationId: 'organization',
		employeeId: 'member',
		week: thisWeek,
		timeZone: 'Europe/Paris',
		isEnabled: true,
		...overrides
	};
}

function renderWeek(initialProps: WorkDiaryWeekScope) {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const wrapper = ({ children }: PropsWithChildren) => (
		<QueryClientProvider client={client}>{children}</QueryClientProvider>
	);
	return renderHook((props: WorkDiaryWeekScope) => useWorkDiaryWeek(props), { wrapper, initialProps });
}

describe('useWorkDiaryWeek', () => {
	it("reads the week for the member's own id alone, in the diary's zone, and keeps only their logs", async () => {
		mockGetTimeLogs.mockResolvedValue([logOf('own', 'member'), logOf('other', 'teammate')]);
		const { result } = renderWeek(scopeOf({}));

		await waitFor(() => expect(result.current.hasLogs).toBe(true));

		expect(mockGetTimeLogs).toHaveBeenCalledTimes(1);
		expect(mockGetTimeLogs).toHaveBeenCalledWith({
			startDate: '2024-01-08',
			endDate: '2024-01-14',
			timeZone: 'Europe/Paris',
			employeeIds: ['member']
		});
		expect(result.current.source.periodLogs.map((log) => log.id)).toEqual(['own']);
		expect(result.current.source).toMatchObject({
			ownEmployeeId: 'member',
			hasOrganizationRole: false,
			period: thisWeek,
			hasPeriodLogs: true,
			isFiltered: false,
			tenantId: 'tenant',
			organizationId: 'organization',
			userTimeZone: 'Europe/Paris'
		});
	});

	it('asks nothing while the member is unknown: a request without an employee returns everyone', () => {
		const { result } = renderWeek(scopeOf({ employeeId: null }));

		expect(mockGetTimeLogs).not.toHaveBeenCalled();
		expect(result.current.hasLogs).toBe(false);
		expect(result.current.source.periodLogs).toEqual([]);
	});

	it('asks nothing while the week view is not on screen', () => {
		renderWeek(scopeOf({ isEnabled: false }));

		expect(mockGetTimeLogs).not.toHaveBeenCalled();
	});

	it("never lets another week's logs stand in while the next week loads", async () => {
		let answerNextWeek: (logs: ITimeLog[]) => void = () => undefined;
		const nextWeekRead = new Promise<ITimeLog[]>((resolve) => {
			answerNextWeek = resolve;
		});
		mockGetTimeLogs.mockResolvedValueOnce([logOf('own', 'member')]).mockReturnValueOnce(nextWeekRead);
		const { result, rerender } = renderWeek(scopeOf({}));
		await waitFor(() => expect(result.current.hasLogs).toBe(true));

		rerender(scopeOf({ week: nextWeek }));

		expect(result.current.hasLogs).toBe(false);
		expect(result.current.source.hasPeriodLogs).toBe(false);
		expect(result.current.source.periodLogs).toEqual([]);

		await act(async () => {
			answerNextWeek([logOf('later', 'member')]);
			await nextWeekRead;
		});
		await waitFor(() => expect(result.current.hasLogs).toBe(true));
		expect(result.current.source.periodLogs.map((log) => log.id)).toEqual(['later']);
	});

	it('reports a failed read, and nothing as read', async () => {
		mockGetTimeLogs.mockRejectedValue(new Error('offline'));
		const { result } = renderWeek(scopeOf({}));

		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(result.current.hasLogs).toBe(false);
	});
});
