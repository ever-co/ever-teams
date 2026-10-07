/**
 * @jest-environment jsdom
 */
import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';

const mockUseAtomValue = jest.fn();
const mockUseUserQuery = jest.fn();

jest.mock('@/core/lib/helpers/cookies', () => ({
	getAccessTokenCookie: () => null,
	getActiveTeamIdCookie: () => 'cookie-team',
	getOrganizationIdCookie: () => 'cookie-organization',
	getTenantIdCookie: () => 'cookie-tenant'
}));

jest.mock('@/core/services/logs/logger.service', () => ({
	Logger: { getInstance: () => ({ debug: jest.fn(), error: jest.fn() }) }
}));

jest.mock('@/core/services/logs/logger-adapter.service', () => ({
	HttpLoggerAdapter: jest.fn().mockImplementation(() => ({ logError: jest.fn() }))
}));

jest.mock('@/core/hooks', () => ({
	useLocalStorageState: (_key: string, initialValue: unknown) => React.useState(initialValue),
	useOutsideClick: () => ({ current: null })
}));

jest.mock('@/core/hooks/daily-plans/use-employee-daily-plans', () => ({
	useEmployeeDailyPlans: () => ({
		employeeTodayPlan: null,
		employeeOutstandingPlans: [],
		employeeDailyPlans: { items: [] }
	})
}));

jest.mock('@/core/components/tasks/daily-plan', () => ({
	estimatedTotalTime: () => ({ totalTasks: 0 }),
	getTotalTasks: () => 0
}));

jest.mock('@/core/stores', () => ({
	activeTeamManagersState: 'active-team-managers',
	activeTeamState: 'active-team',
	timeLogsDailyReportState: 'time-logs-daily-report'
}));

jest.mock('jotai', () => ({ useAtomValue: (atom: unknown) => mockUseAtomValue(atom) }));
jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('next/navigation', () => ({ usePathname: () => '/profile/member-1' }));
jest.mock('@/core/hooks/queries/user-user.query', () => ({ useUserQuery: () => mockUseUserQuery() }));

import { queryKeys } from '@/core/query/keys';
import { statisticsService } from '@/core/services/client/api/timesheets/statistic.service';
import {
	profileActivityRequestSchema,
	profileActivityResponseSchema,
	type TProfileActivityRequest
} from '@/core/types/schemas/activities/profile-activity.schema';
import { useTaskFilter } from '@/core/hooks/tasks/use-task-filter';
import {
	getProfileActivityMonthRange,
	getProfileActivityYearRange,
	getMillisecondsUntilNextProfileActivityMonth,
	MAX_PROFILE_ACTIVITY_TIMEOUT_MS,
	normalizeProfileActivityTimeZone,
	useProfileActivity,
	useProfileActivityMonthRange
} from './use-profile-activity';

const ids = {
	tenantId: '11111111-1111-4111-8111-111111111111',
	organizationId: '22222222-2222-4222-8222-222222222222',
	organizationTeamId: '33333333-3333-4333-8333-333333333333',
	employeeId: '44444444-4444-4444-8444-444444444444'
};

const request: TProfileActivityRequest = {
	...ids,
	startDate: '2026-08-01',
	endDate: '2026-09-01',
	timeZone: 'Europe/Madrid',
	includeDaily: false
};

const summaryResponse = {
	employeeId: ids.employeeId,
	activeDays: 3,
	totalDuration: 10800,
	firstActiveOn: '2026-08-01',
	lastActiveOn: '2026-08-18',
	period: {
		startDate: '2026-08-01',
		endDate: '2026-09-01',
		timeZone: 'Europe/Madrid'
	}
};

function axiosResponse<T>(data: T) {
	return { config: {}, data, headers: {}, status: 200, statusText: 'OK' };
}

function createQueryClient() {
	return new QueryClient({
		defaultOptions: { queries: { retry: false, gcTime: Infinity } }
	});
}

function createWrapper(client: QueryClient) {
	return function Wrapper({ children }: React.PropsWithChildren) {
		return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
	};
}

describe('strict profile activity contract', () => {
	afterEach(() => {
		jest.restoreAllMocks();
		jest.useRealTimers();
	});

	it('accepts only strict UUID/date/IANA request fields and a half-open range', () => {
		expect(profileActivityRequestSchema.parse(request)).toEqual(request);
		expect(profileActivityRequestSchema.safeParse({ ...request, tenantId: 'not-a-uuid' }).success).toBe(false);
		expect(profileActivityRequestSchema.safeParse({ ...request, startDate: '2026-8-1' }).success).toBe(false);
		expect(profileActivityRequestSchema.safeParse({ ...request, endDate: request.startDate }).success).toBe(false);
		expect(profileActivityRequestSchema.safeParse({ ...request, timeZone: 'Madrid time' }).success).toBe(false);
		expect(profileActivityRequestSchema.safeParse({ ...request, extra: true }).success).toBe(false);
	});

	it('rejects malformed or widened responses while accepting summary and daily modes', () => {
		expect(profileActivityResponseSchema.parse(summaryResponse)).toEqual(summaryResponse);
		expect(
			profileActivityResponseSchema.parse({
				...summaryResponse,
				daily: [
					{ date: '2026-08-01', duration: 3600 },
					{ date: '2026-08-18', duration: 7200 }
				]
			})
		).toEqual({
			...summaryResponse,
			daily: [
				{ date: '2026-08-01', duration: 3600 },
				{ date: '2026-08-18', duration: 7200 }
			]
		});
		expect(profileActivityResponseSchema.safeParse({ ...summaryResponse, activeDays: -1 }).success).toBe(false);
		expect(profileActivityResponseSchema.safeParse({ ...summaryResponse, unknown: true }).success).toBe(false);
	});

	it('normalizes IANA zones and creates local-calendar half-open month/year boundaries', () => {
		expect(normalizeProfileActivityTimeZone('America/New_York (UTC -05:00)', 'UTC')).toBe('America/New_York');
		expect(normalizeProfileActivityTimeZone('Europe/Madrid', 'UTC')).toBe('Europe/Madrid');
		expect(normalizeProfileActivityTimeZone('not/a-zone', 'Asia/Tokyo')).toBe('Asia/Tokyo');
		expect(normalizeProfileActivityTimeZone('not/a-zone', 'also-invalid')).toBe('UTC');
		expect(getProfileActivityMonthRange('America/New_York', new Date('2026-03-15T03:30:00.000Z'))).toEqual({
			startDate: '2026-03-01',
			endDate: '2026-04-01'
		});
		expect(getProfileActivityYearRange('Europe/Madrid', 2024)).toEqual({
			startDate: '2024-01-01',
			endDate: '2025-01-01'
		});
	});

	it('moves a mounted current-month range forward at the local month boundary', () => {
		jest.useFakeTimers().setSystemTime(new Date('2026-08-31T23:59:30.000Z'));
		const { result, unmount } = renderHook(() => useProfileActivityMonthRange('UTC'));
		expect(result.current).toEqual({ startDate: '2026-08-01', endDate: '2026-09-01' });
		expect(getMillisecondsUntilNextProfileActivityMonth('UTC')).toBe(30_001);

		act(() => jest.advanceTimersByTime(30_001));
		expect(result.current).toEqual({ startDate: '2026-09-01', endDate: '2026-10-01' });
		unmount();
	});

	it('switches time zones across a local month boundary without issuing a stale-period request', async () => {
		jest.useFakeTimers().setSystemTime(new Date('2026-08-31T12:30:00.000Z'));
		const getProfileActivity = jest
			.spyOn(statisticsService, 'getProfileActivity')
			.mockImplementation(async (nextRequest) => ({
				...summaryResponse,
				period: {
					startDate: nextRequest.startDate,
					endDate: nextRequest.endDate,
					timeZone: nextRequest.timeZone
				}
			}));
		const client = createQueryClient();
		const { rerender, unmount } = renderHook(
			({ timeZone }) => {
				const range = useProfileActivityMonthRange(timeZone);
				return useProfileActivity({ ...request, ...range, timeZone });
			},
			{
				initialProps: { timeZone: 'UTC' },
				wrapper: createWrapper(client)
			}
		);

		await act(async () => Promise.resolve());
		expect(getProfileActivity).toHaveBeenCalledTimes(1);
		expect(getProfileActivity.mock.calls[0][0]).toEqual(
			expect.objectContaining({
				timeZone: 'UTC',
				startDate: '2026-08-01',
				endDate: '2026-09-01'
			})
		);

		getProfileActivity.mockClear();
		rerender({ timeZone: 'Pacific/Kiritimati' });
		await act(async () => Promise.resolve());

		expect(getProfileActivity).toHaveBeenCalledTimes(1);
		expect(getProfileActivity.mock.calls[0][0]).toEqual(
			expect.objectContaining({
				timeZone: 'Pacific/Kiritimati',
				startDate: '2026-09-01',
				endDate: '2026-10-01'
			})
		);
		unmount();
	});

	it('caps long month-boundary timers and reschedules instead of overflowing browser timeouts', () => {
		jest.useFakeTimers().setSystemTime(new Date('2026-08-01T00:00:00.000Z'));
		const timeoutSpy = jest.spyOn(globalThis, 'setTimeout');
		const { unmount } = renderHook(() => useProfileActivityMonthRange('UTC'));

		expect(getMillisecondsUntilNextProfileActivityMonth('UTC')).toBeGreaterThan(MAX_PROFILE_ACTIVITY_TIMEOUT_MS);
		expect(timeoutSpy).toHaveBeenLastCalledWith(expect.any(Function), MAX_PROFILE_ACTIVITY_TIMEOUT_MS);
		unmount();
	});

	it('sends tenant only through transport config, consumes the signal, and validates the response', async () => {
		const get = jest.spyOn(statisticsService, 'get').mockResolvedValue(axiosResponse(summaryResponse) as never);
		const signal = new AbortController().signal;

		const result = await statisticsService.getProfileActivity(request, signal);

		expect(result).toEqual(summaryResponse);
		expect(get).toHaveBeenCalledTimes(1);
		const [url, config] = get.mock.calls[0];
		const parsed = new URL(url as string, 'https://client.test');
		expect(parsed.pathname).toBe('/timesheet/statistics/profile-activity');
		expect(Object.fromEntries(parsed.searchParams)).toEqual({
			organizationId: ids.organizationId,
			employeeId: ids.employeeId,
			organizationTeamId: ids.organizationTeamId,
			startDate: '2026-08-01',
			endDate: '2026-09-01',
			timeZone: 'Europe/Madrid',
			includeDaily: 'false'
		});
		expect(parsed.searchParams.has('tenantId')).toBe(false);
		expect(config).toEqual({ tenantId: ids.tenantId, signal });
	});

	it('uses the full fixed-position key including tenant and the literal daily boolean', () => {
		expect(queryKeys.profileActivity.byScope(request)).toEqual([
			'profile-activity',
			ids.tenantId,
			ids.organizationId,
			ids.organizationTeamId,
			ids.employeeId,
			'2026-08-01',
			'2026-09-01',
			'Europe/Madrid',
			false
		]);
		expect(
			queryKeys.profileActivity.byScope({ ...request, organizationTeamId: undefined, includeDaily: true })
		).toEqual([
			'profile-activity',
			ids.tenantId,
			ids.organizationId,
			null,
			ids.employeeId,
			'2026-08-01',
			'2026-09-01',
			'Europe/Madrid',
			true
		]);
	});
});

describe('profile activity query ownership and switching', () => {
	afterEach(() => jest.restoreAllMocks());

	it('aborts A when the employee changes to B and never exposes A as B data', async () => {
		type Pending = {
			request: TProfileActivityRequest;
			signal: AbortSignal;
			resolve: (value: typeof summaryResponse) => void;
		};
		const pending: Pending[] = [];
		jest.spyOn(statisticsService, 'getProfileActivity').mockImplementation(
			(nextRequest, signal) =>
				new Promise((resolvePromise) => {
					pending.push({ request: nextRequest, signal: signal!, resolve: resolvePromise });
				})
		);
		const client = createQueryClient();
		const employeeB = '55555555-5555-4555-8555-555555555555';
		const { result, rerender } = renderHook(({ employeeId }) => useProfileActivity({ ...request, employeeId }), {
			initialProps: { employeeId: ids.employeeId },
			wrapper: createWrapper(client)
		});

		await waitFor(() => expect(pending).toHaveLength(1));
		rerender({ employeeId: employeeB });

		await waitFor(() => expect(pending).toHaveLength(2));
		expect(pending[0].signal.aborted).toBe(true);
		expect(result.current.data).toBeUndefined();
		await act(async () => {
			pending[0].resolve(summaryResponse);
			pending[1].resolve({ ...summaryResponse, employeeId: employeeB, activeDays: 7 });
		});
		await waitFor(() => expect(result.current.data?.employeeId).toBe(employeeB));
		expect(result.current.data?.activeDays).toBe(7);
	});

	it('surfaces the original error with one request and does not call a rich fallback', async () => {
		const failure = new Error('profile endpoint failed');
		const requestSpy = jest.spyOn(statisticsService, 'getProfileActivity').mockRejectedValue(failure);
		const client = createQueryClient();
		const { result } = renderHook(() => useProfileActivity(request), { wrapper: createWrapper(client) });

		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(result.current.error).toBe(failure);
		expect(requestSpy).toHaveBeenCalledTimes(1);
		expect(readFileSync(resolve(__dirname, 'use-profile-activity.ts'), 'utf8')).not.toContain(
			'useGetTimeLogsDailyReport'
		);
	});
});

describe('profile integration contracts', () => {
	const routeSource = readFileSync(
		resolve(__dirname, '../../../app/[locale]/(main)/profile/[memberId]/page.tsx'),
		'utf8'
	);
	const filterSource = readFileSync(resolve(__dirname, '../tasks/use-task-filter.ts'), 'utf8');
	const cardSource = readFileSync(
		resolve(__dirname, '../../components/pages/teams/team/team-members-views/user-team-card/index.tsx'),
		'utf8'
	);
	const calendarSource = readFileSync(
		resolve(__dirname, '../../components/activities/activity-calendar.tsx'),
		'utf8'
	);
	const lazySource = readFileSync(resolve(__dirname, '../../components/optimized-components/common.tsx'), 'utf8');

	beforeEach(() => {
		mockUseUserQuery.mockReturnValue({
			data: { id: 'user-1', employee: { id: ids.employeeId }, employeeId: ids.employeeId }
		});
		mockUseAtomValue.mockImplementation((atom) => {
			if (atom === 'active-team-managers') return [];
			if (atom === 'active-team') return { shareProfileView: true };
			return undefined;
		});
	});

	it('uses the employee activeDays summary for Stats', () => {
		const profile = {
			isAuthUser: true,
			userProfile: { id: 'user-1' },
			member: null,
			tasksGrouped: { assignedTasks: [], unassignedTasks: [], workedTasks: [], planned: 0 }
		} as never;
		const { result } = renderHook(() => useTaskFilter(profile, { statsCount: 3 }));

		expect(result.current.tabs.find(({ tab }) => tab === 'stats')?.count).toBe(3);
	});

	it('keeps exactly one route-owned current-month summary and passes its activeDays as a scalar', () => {
		expect(routeSource.match(/useProfileActivity\(/g)).toHaveLength(1);
		expect(routeSource).toMatch(/includeDaily:\s*false/);
		expect(routeSource).toMatch(/const statsCount =[\s\S]*activeDays/);
		expect(routeSource).toMatch(/useTaskFilter\(profile,\s*\{ statsCount \}\)/);
		expect(routeSource).toMatch(/profileValidation\.isValid/);
		expect(filterSource).toMatch(/resolvedStatsCount\s*=\s*statsCount\s*\?\?\s*0/);
		expect(filterSource).not.toContain('timeLogsDailyReport');
	});

	it('proves eight member cards and public cards own zero summary calls', () => {
		const summaryCallsPerCard = Array.from(
			{ length: 8 },
			() => (cardSource.match(/useProfileActivity\(/g) ?? []).length
		);
		expect(summaryCallsPerCard).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
		expect(cardSource).toMatch(/statsCount:\s*0/);
		expect(cardSource).toMatch(/publicTeam[\s\S]*return undefined/);
	});

	it('loads one scoped yearly aggregate only when the lazy activity calendar mounts', () => {
		expect(calendarSource).not.toContain('useGetTimeLogsDailyReport');
		expect(calendarSource.match(/useProfileActivity\(/g)).toHaveLength(1);
		expect(calendarSource).toMatch(/includeDaily:\s*true/);
		expect(calendarSource).toMatch(/Array\.from\(\{ length:\s*5 \}/);
		expect(calendarSource).toMatch(/duration\s*\/\s*3600\)\.toPrecision\(2\)/);
		expect(lazySource).toMatch(/LazyActivityCalendar[\s\S]*ssr:\s*false/);
	});
});
