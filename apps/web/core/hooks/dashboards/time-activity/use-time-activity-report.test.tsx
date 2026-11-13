/** @jest-environment jsdom */

import { renderHook } from '@testing-library/react';
import { NO_CLIENT_FILTER_VALUE } from '@/core/lib/utils/project-list';
import type { TimeActivityFilters } from '@/core/lib/utils/dashboards/time-activity';
import type { ITimeLogGroupedDailyReport } from '@/core/types/interfaces/activity/activity-report';

const mockRefetchDaily = jest.fn();
const mockRefetchProjectClients = jest.fn();

const NO_FILTERS: TimeActivityFilters = {
	teamIds: [],
	employeeIds: [],
	projectIds: [],
	taskIds: [],
	clientIds: [],
	billable: []
};

const employeeLogs = [{ employee: { id: 'ada' }, sum: 600, activity: 50, tasks: [] }];

/** One project of a client, and one whose client is archived: the report names no client beside that one. */
const DAILY_REPORT = [
	{
		date: '2026-11-03',
		logs: [
			{ project: { id: 'website', name: 'Website', organizationContact: { id: 'acme' } }, employeeLogs },
			{ project: { id: 'old-site', name: 'Old site', organizationContact: null }, employeeLogs }
		]
	}
] as unknown as ITimeLogGroupedDailyReport[];

const LISTED_CLIENT_IDS = new Map<string, string | null>([
	['website', 'acme'],
	['old-site', 'archived-client']
]);

const NO_CLIENT_IDS = new Map<string, string | null>();

interface ClientLookup {
	isPending: boolean;
	isError: boolean;
}

function clientIdsOf(lookup: ClientLookup) {
	const isRead = !lookup.isPending && !lookup.isError;
	if (isRead) {
		return LISTED_CLIENT_IDS;
	}
	return NO_CLIENT_IDS;
}

let mockFilters = NO_FILTERS;
let mockLookup: ClientLookup = { isPending: false, isError: false };

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key, useLocale: () => 'en' }));
jest.mock('@/core/hooks/auth', () => ({
	useAuthenticateUser: () => ({
		user: {
			id: 'user',
			tenantId: 'tenant',
			role: { name: 'ADMIN' },
			employee: { id: 'ada', organizationId: 'organization' }
		},
		isTeamManager: false
	})
}));
jest.mock('@/core/hooks/activities/use-activity-filters', () => ({
	getReportMemberIds: () => [],
	managesEveryTeam: () => false
}));
jest.mock('@/core/hooks/organizations/teams/use-organization-teams-managers', () => ({
	useOrganizationAndTeamManagers: () => ({ userManagedTeams: [] })
}));
jest.mock('./use-time-activity-settings', () => ({
	useTimeActivitySettings: () => ({ filters: mockFilters, grouping: 'project' })
}));
jest.mock('./use-time-activity-queries', () => ({
	useTimeActivityDailyQuery: () => ({
		data: DAILY_REPORT,
		isPending: false,
		isError: false,
		isFetching: false,
		refetch: mockRefetchDaily
	}),
	useTimeActivityCountsQuery: () => ({
		data: undefined,
		isPending: true,
		isError: false,
		isFetching: false,
		refetch: jest.fn()
	})
}));
jest.mock('@/core/hooks/dashboards/use-report-clients', () => ({
	useReportProjectClients: () => ({
		clientIds: clientIdsOf(mockLookup),
		isPending: mockLookup.isPending,
		isError: mockLookup.isError,
		refetch: mockRefetchProjectClients
	})
}));

import { useTimeActivityReport } from './use-time-activity-report';

function reportUnder(clientIds: string[], lookup: ClientLookup) {
	mockFilters = { ...NO_FILTERS, clientIds };
	mockLookup = lookup;
	return renderHook(() => useTimeActivityReport()).result.current;
}

function projectNamesOf(report: ReturnType<typeof useTimeActivityReport>) {
	return report.rows.map((row) => row.projectName);
}

describe('useTimeActivityReport with a client picked', () => {
	beforeEach(() => {
		mockRefetchDaily.mockClear();
		mockRefetchProjectClients.mockClear();
	});

	it('keeps the time of a project whose client is archived out of "No client", once the projects are read', () => {
		const report = reportUnder([NO_CLIENT_FILTER_VALUE], { isPending: false, isError: false });

		expect(report.isDailyPending).toBe(false);
		expect(report.isDailyError).toBe(false);
		expect(projectNamesOf(report)).toEqual([]);
	});

	it('waits for the projects instead of counting that time under "No client" meanwhile', () => {
		const report = reportUnder([NO_CLIENT_FILTER_VALUE], { isPending: true, isError: false });

		expect(report.isDailyPending).toBe(true);
		expect(report.isFiguresLoading).toBe(true);
		expect(report.isDailyError).toBe(false);
		expect(projectNamesOf(report)).toEqual([]);
		expect(report.figures.reportSeconds).toBeNull();
	});

	it('says the report could not be read when the projects cannot be, and reads them again on retry', () => {
		const report = reportUnder([NO_CLIENT_FILTER_VALUE], { isPending: false, isError: true });

		expect(report.isDailyError).toBe(true);
		expect(report.isDailyPending).toBe(false);
		expect(projectNamesOf(report)).toEqual([]);
		expect(report.figures.reportSeconds).toBeNull();
		expect(report.weekDailySource).toMatchObject({ isLoading: false, isError: true });

		report.refetchDaily();

		expect(mockRefetchProjectClients).toHaveBeenCalledTimes(1);
		expect(mockRefetchDaily).toHaveBeenCalledTimes(1);
	});

	it('shows the whole report without a client picked, whatever the projects answer', () => {
		const report = reportUnder([], { isPending: true, isError: true });

		expect(report.isDailyPending).toBe(false);
		expect(report.isDailyError).toBe(false);
		expect(projectNamesOf(report)).toEqual(['Website', 'Old site']);
		expect(report.figures.reportSeconds).toBe(1200);

		report.refetchDaily();

		expect(mockRefetchProjectClients).not.toHaveBeenCalled();
		expect(mockRefetchDaily).toHaveBeenCalledTimes(1);
	});
});
