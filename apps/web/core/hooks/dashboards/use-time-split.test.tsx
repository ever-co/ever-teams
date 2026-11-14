/** @jest-environment jsdom */
import { act, renderHook } from '@testing-library/react';
import { flattenDailyReport } from '@/core/lib/utils/daily-report-figures';
import type { ITimeLogGroupedDailyReport } from '@/core/types/interfaces/activity/activity-report';

const HOUR = 3600;

/** Project A of client Acme, project B without a client, and time without a project, by two members. */
const DAILY_REPORT = [
	{
		date: '2026-11-10',
		logs: [
			{
				project: { id: 'a', name: 'Project A', organizationContact: { id: 'acme', name: 'Acme' } },
				employeeLogs: [
					{ employee: { id: 'marie' }, sum: 20 * HOUR, activity: 50, tasks: [] },
					{ employee: { id: 'paul' }, sum: 10 * HOUR, activity: 50, tasks: [] }
				]
			},
			{
				project: { id: 'b', name: 'Project B', organizationContact: null },
				employeeLogs: [{ employee: { id: 'marie' }, sum: 10 * HOUR, activity: 50, tasks: [] }]
			},
			{
				project: null,
				employeeLogs: [{ employee: { id: 'marie' }, sum: 2 * HOUR, activity: 50, tasks: [] }]
			}
		]
	}
] as unknown as ITimeLogGroupedDailyReport[];

const ROWS = flattenDailyReport(DAILY_REPORT, 'No team');

let mockPermissions: string[] = ['ORG_CONTACT_VIEW'];
let mockProjectsLookup = { isPending: false, isError: false };
const mockLookupOptions = jest.fn();
const mockClientsOptions = jest.fn();
const mockRefetchProjects = jest.fn();
const mockRefetchClients = jest.fn();

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('@/core/hooks/roles/use-my-role-permissions-query', () => ({
	useMyRolePermissionsQuery: () => ({ myPermissions: mockPermissions })
}));
jest.mock('@/core/hooks/dashboards/use-report-clients', () => ({
	useReportProjectClients: (options: { includesArchived: boolean; isEnabled: boolean }) => {
		mockLookupOptions(options);
		return {
			clientIds: new Map<string, string | null>([
				['a', 'acme'],
				['b', null]
			]),
			isPending: mockProjectsLookup.isPending,
			isError: mockProjectsLookup.isError,
			refetch: mockRefetchProjects
		};
	}
}));
jest.mock('@/core/hooks/clients/use-clients-query', () => ({
	useClientsQuery: (options: { includeArchived?: boolean; enabled?: boolean }) => {
		mockClientsOptions(options);
		return {
			clients: [{ id: 'acme', name: 'Acme' }],
			isLoaded: true,
			isError: false,
			refetch: mockRefetchClients
		};
	}
}));
jest.mock('@/core/lib/utils/clients', () => ({
	...jest.requireActual('@/core/lib/utils/clients'),
	canReadClients: (permissions: readonly string[]) => permissions.includes('ORG_CONTACT_VIEW')
}));

import { useTimeSplit } from './use-time-split';

function sharesOf(rows: ReadonlyArray<{ key: string; share: number }>) {
	return rows.map((row) => [row.key, row.share]);
}

beforeEach(() => {
	mockPermissions = ['ORG_CONTACT_VIEW'];
	mockProjectsLookup = { isPending: false, isError: false };
	jest.clearAllMocks();
});

describe('useTimeSplit', () => {
	it('splits the rows in view by project first, without reading any client', () => {
		const { result } = renderHook(() => useTimeSplit({ rows: ROWS, report: DAILY_REPORT }));

		expect(result.current.mode).toBe('project');
		expect(sharesOf(result.current.rows)).toEqual([
			['a', 71],
			['b', 24],
			['no-project', 5]
		]);
		expect(result.current.totalSeconds).toBe(42 * HOUR);
		expect(mockLookupOptions).toHaveBeenLastCalledWith({ includesArchived: false, isEnabled: false });
		expect(mockClientsOptions).toHaveBeenLastCalledWith({ includeArchived: true, enabled: false });
	});

	it('splits the same time by client, the time without one in its own group', () => {
		const { result } = renderHook(() => useTimeSplit({ rows: ROWS, report: DAILY_REPORT }));

		act(() => result.current.setMode('client'));

		expect(result.current.mode).toBe('client');
		expect(sharesOf(result.current.rows)).toEqual([
			['acme', 71],
			['none', 29]
		]);
		expect(result.current.totalSeconds).toBe(42 * HOUR);
		expect(mockLookupOptions).toHaveBeenLastCalledWith({ includesArchived: false, isEnabled: true });
	});

	it('keeps to the rows the page shows when it splits by client', () => {
		const onlyMarie = (row: { employeeId: string }) => row.employeeId === 'marie';
		const marieRows = ROWS.filter(onlyMarie);
		const { result } = renderHook(() =>
			useTimeSplit({ rows: marieRows, report: DAILY_REPORT, keepRow: onlyMarie })
		);

		act(() => result.current.setMode('client'));

		expect(result.current.totalSeconds).toBe(32 * HOUR);
	});

	it('offers no split by client to someone who may not read clients', () => {
		mockPermissions = [];
		const { result } = renderHook(() => useTimeSplit({ rows: ROWS, report: DAILY_REPORT }));

		act(() => result.current.setMode('client'));

		expect(result.current.canSplitByClient).toBe(false);
		expect(result.current.mode).toBe('project');
		expect(mockLookupOptions).toHaveBeenLastCalledWith({ includesArchived: false, isEnabled: false });
	});

	it('waits for the projects before it tells the clients, and says when they cannot be read', () => {
		mockProjectsLookup = { isPending: true, isError: false };
		const { result, rerender } = renderHook(() => useTimeSplit({ rows: ROWS, report: DAILY_REPORT }));
		act(() => result.current.setMode('client'));

		expect(result.current.isClientLookupPending).toBe(true);

		mockProjectsLookup = { isPending: false, isError: true };
		rerender();

		expect(result.current.isClientLookupError).toBe(true);
		act(() => result.current.retryClientLookup());
		expect(mockRefetchProjects).toHaveBeenCalled();
	});
});
