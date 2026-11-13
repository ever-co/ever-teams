/** @jest-environment jsdom */
import type { PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { addDays, addHours, subDays } from 'date-fns';
import { localDayKeyOf } from '@/core/lib/utils/dashboard-export';
import { myWeekPeriodOf } from '@/core/lib/utils/dashboards/my-week';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';

const ME = 'employee-me';
const SOMEONE_ELSE = 'employee-other';
const HOUR = 3600;

const mockGetTimeLogs = jest.fn();
let mockUser: unknown;

jest.mock('@/core/services/client/api/timesheets/time-log.service', () => ({
	timeLogService: { getTimeLogs: (...args: unknown[]) => mockGetTimeLogs(...args) }
}));
jest.mock('@/core/hooks/queries/user-user.query', () => ({ useUserQuery: () => ({ data: mockUser }) }));
jest.mock('@/core/lib/helpers/cookies', () => ({
	getTenantIdCookie: () => 'tenant-1',
	getOrganizationIdCookie: () => 'organization-1'
}));

import { useMyWeekPage } from './use-my-week-page';

interface TimeLogsRequest {
	startDate: string;
	endDate: string;
	timeZone: string;
	employeeIds: string[];
}

/** Wednesday of the week that runs from Monday November 9 to Sunday November 15, 2026. */
const NOW = new Date(2026, 10, 11, 15, 30);
const THIS_WEEK = myWeekPeriodOf('thisWeek', NOW);
const LAST_WEEK = myWeekPeriodOf('lastWeek', NOW);

/** Only the clock is frozen: the queries and the waits of the tests keep their real timers. */
const REAL_TIMERS = [
	'hrtime',
	'nextTick',
	'performance',
	'queueMicrotask',
	'requestAnimationFrame',
	'cancelAnimationFrame',
	'requestIdleCallback',
	'cancelIdleCallback',
	'setImmediate',
	'clearImmediate',
	'setInterval',
	'clearInterval',
	'setTimeout',
	'clearTimeout'
] as const;

function userWith(reWeeklyLimit: number | null) {
	return { id: 'user-me', employee: { id: ME, reWeeklyLimit } };
}

function logOf(id: string, employeeId: string, start: Date, hours: number): ITimeLog {
	return {
		id,
		employeeId,
		startedAt: start,
		stoppedAt: addHours(start, hours),
		duration: hours * HOUR,
		isRunning: false
	} as unknown as ITimeLog;
}

function requestAt(callIndex: number): TimeLogsRequest {
	return mockGetTimeLogs.mock.calls[callIndex][0] as TimeLogsRequest;
}

function renderMyWeek() {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const wrapper = ({ children }: PropsWithChildren) => (
		<QueryClientProvider client={client}>{children}</QueryClientProvider>
	);
	return renderHook(() => useMyWeekPage(), { wrapper });
}

describe('useMyWeekPage', () => {
	beforeAll(() => {
		jest.useFakeTimers({ now: NOW, doNotFake: [...REAL_TIMERS] });
	});

	afterAll(() => {
		jest.useRealTimers();
	});

	beforeEach(() => {
		mockGetTimeLogs.mockReset();
		mockUser = userWith(40);
	});

	it("reads this week with one request, for the signed-in member's own employee id and no other", async () => {
		mockGetTimeLogs.mockResolvedValue([]);
		const { result } = renderMyWeek();

		await waitFor(() => expect(result.current.isLoading).toBe(false));

		expect(mockGetTimeLogs).toHaveBeenCalledTimes(1);
		const request = requestAt(0);
		expect(request.employeeIds).toEqual([ME]);
		expect(request.startDate).toBe(localDayKeyOf(subDays(THIS_WEEK.from, 1)));
		expect(request.endDate).toBe(localDayKeyOf(addDays(THIS_WEEK.to, 1)));
		expect(request.timeZone).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone);
		expect([request.startDate, request.endDate]).toEqual(['2026-11-08', '2026-11-16']);
		expect(result.current.shownKey).toBe('thisWeek');
		expect(result.current.isEmpty).toBe(true);
	});

	it("counts the member's own entries only, even when the answer holds someone else's", async () => {
		const monday = addHours(THIS_WEEK.from, 9);
		mockGetTimeLogs.mockResolvedValue([logOf('mine', ME, monday, 2), logOf('not-mine', SOMEONE_ELSE, monday, 8)]);
		const { result } = renderMyWeek();

		await waitFor(() => expect(result.current.entryCount).toBe(1));

		expect(result.current.figures.trackedSeconds).toBe(2 * HOUR);
		expect(result.current.recentEntries.map((entry) => entry.id)).toEqual(['mine']);
		expect(result.current.projects).toHaveLength(1);
	});

	it('measures the week against the weekly limit of the profile, and a month against none', async () => {
		mockGetTimeLogs.mockResolvedValue([logOf('mine', ME, addHours(THIS_WEEK.from, 9), 10)]);
		const { result } = renderMyWeek();

		await waitFor(() => expect(result.current.entryCount).toBe(1));
		expect(result.current.target).toEqual({
			limitSeconds: 40 * HOUR,
			usedSeconds: 10 * HOUR,
			share: 25,
			verdict: 'within',
			remainingSeconds: 30 * HOUR
		});
		expect(result.current.dailyLimitSeconds).toBe(8 * HOUR);

		act(() => result.current.pickPeriod('thisMonth'));
		await waitFor(() => expect(result.current.shownKey).toBe('thisMonth'));

		expect(result.current.target).toBeNull();
		expect(result.current.weeklyLimitSeconds).toBe(40 * HOUR);
	});

	it('gives a member without a weekly limit their tracked time and no target, without an error', async () => {
		mockUser = userWith(0);
		mockGetTimeLogs.mockResolvedValue([logOf('mine', ME, addHours(THIS_WEEK.from, 9), 3)]);
		const { result } = renderMyWeek();

		await waitFor(() => expect(result.current.entryCount).toBe(1));

		expect(result.current.figures.trackedSeconds).toBe(3 * HOUR);
		expect(result.current.target).toBeNull();
		expect(result.current.dailyLimitSeconds).toBeNull();
		expect(result.current.showsError).toBe(false);
	});

	it('keeps the week on screen while last week loads, then shows last week from its own request', async () => {
		let answerLastWeek: (logs: ITimeLog[]) => void = () => undefined;
		const lastWeekLogs = new Promise<ITimeLog[]>((resolve) => {
			answerLastWeek = resolve;
		});
		mockGetTimeLogs
			.mockResolvedValueOnce([logOf('this-week', ME, addHours(THIS_WEEK.from, 9), 2)])
			.mockReturnValueOnce(lastWeekLogs);
		const { result } = renderMyWeek();
		await waitFor(() => expect(result.current.entryCount).toBe(1));

		act(() => result.current.pickPeriod('lastWeek'));
		await waitFor(() => expect(mockGetTimeLogs).toHaveBeenCalledTimes(2));

		expect(result.current.periodKey).toBe('lastWeek');
		expect(result.current.shownKey).toBe('thisWeek');
		expect(result.current.figures.trackedSeconds).toBe(2 * HOUR);
		expect(result.current.isUpdating).toBe(true);
		expect(result.current.isLoading).toBe(false);

		await act(async () => {
			answerLastWeek([logOf('last-week', ME, addHours(LAST_WEEK.from, 9), 5)]);
			await lastWeekLogs;
		});
		await waitFor(() => expect(result.current.shownKey).toBe('lastWeek'));

		const request = requestAt(1);
		expect(request.employeeIds).toEqual([ME]);
		expect(request.startDate).toBe(localDayKeyOf(subDays(LAST_WEEK.from, 1)));
		expect(request.endDate).toBe(localDayKeyOf(addDays(LAST_WEEK.to, 1)));
		expect(result.current.figures.trackedSeconds).toBe(5 * HOUR);
		expect(result.current.figures.todaySeconds).toBeNull();
		expect(result.current.isUpdating).toBe(false);
	});

	it('asks nothing for an account without a member profile, and says so', () => {
		mockUser = { id: 'user-me', employee: null };
		const { result } = renderMyWeek();

		expect(result.current.isMemberUnknown).toBe(true);
		expect(result.current.isLoading).toBe(false);
		expect(mockGetTimeLogs).not.toHaveBeenCalled();
	});

	it('reports a failed read, and reads again on retry', async () => {
		mockGetTimeLogs.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([]);
		const { result } = renderMyWeek();

		await waitFor(() => expect(result.current.showsError).toBe(true));
		expect(result.current.isLoading).toBe(false);

		act(() => result.current.refetch());
		await waitFor(() => expect(result.current.showsError).toBe(false));
		expect(result.current.isEmpty).toBe(true);
	});
});
