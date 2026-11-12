/** @jest-environment jsdom */

import { renderHook } from '@testing-library/react';
import { NO_CLIENT_FILTER_VALUE } from '@/core/lib/utils/project-list';
import type {
	ClientGroupingAccess,
	TimeActivityFilters,
	TimeActivityGrouping
} from '@/core/lib/utils/dashboards/time-activity';
import type { ITimeLogGroupedDailyReport } from '@/core/types/interfaces/activity/activity-report';

const mockRefetchDaily = jest.fn();
const mockRefetchProjectClients = jest.fn();
const mockRefetchClientNames = jest.fn();
const mockClientsQueryOptions = jest.fn();

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

interface ClientsList {
	isLoaded: boolean;
	isError: boolean;
}

/** The clients list, archived clients included, as the clients query reads it. */
const mockClients = [
	{ id: 'acme', name: 'Acme' },
	{ id: 'archived-client', name: 'Old client', deletedAt: '2026-11-01T09:00:00.000Z' }
];

const PROJECTS_READ: ClientLookup = { isPending: false, isError: false };

const CLIENTS_READ: ClientsList = { isLoaded: true, isError: false };

let mockFilters = NO_FILTERS;
let mockLookup: ClientLookup = PROJECTS_READ;
let mockGrouping: TimeActivityGrouping = 'project';
let mockAccess: ClientGroupingAccess = 'granted';
let mockClientsList: ClientsList = CLIENTS_READ;

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
	useTimeActivitySettings: () => ({ filters: mockFilters, grouping: mockGrouping, clientGroupingAccess: mockAccess })
}));
jest.mock('@/core/hooks/clients/use-clients-query', () => ({
	useClientsQuery: (options: { includeArchived?: boolean; enabled?: boolean }) => {
		mockClientsQueryOptions(options);
		const clients = mockClientsList.isLoaded ? mockClients : [];
		return {
			clients,
			isLoaded: mockClientsList.isLoaded,
			isError: mockClientsList.isError,
			refetch: mockRefetchClientNames
		};
	}
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

function resetMocks(grouping: TimeActivityGrouping) {
	mockRefetchDaily.mockClear();
	mockRefetchProjectClients.mockClear();
	mockRefetchClientNames.mockClear();
	mockClientsQueryOptions.mockClear();
	mockGrouping = grouping;
	mockAccess = 'granted';
	mockClientsList = CLIENTS_READ;
}

describe('useTimeActivityReport with a client picked', () => {
	beforeEach(() => {
		resetMocks('project');
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

describe('useTimeActivityReport grouped by client', () => {
	beforeEach(() => {
		resetMocks('client');
	});

	const READS_NAMES = { includeArchived: true, enabled: true };
	const READS_NO_NAMES = { includeArchived: true, enabled: false };

	it('gives each row the client of its project once the projects and the clients are read', () => {
		const report = reportUnder([], PROJECTS_READ);

		expect(report.isDailyPending).toBe(false);
		expect(report.isDailyError).toBe(false);
		const clientsOfRows = report.rows.map((row) => [row.projectName, row.client]);
		expect(clientsOfRows).toEqual([
			['Website', { key: 'acme', name: 'Acme' }],
			['Old site', { key: 'archived-client', name: 'Old client' }]
		]);
		expect(report.clientOfProjectLog).not.toBeNull();
		expect(mockClientsQueryOptions).toHaveBeenLastCalledWith(READS_NAMES);
	});

	it('waits for the clients list before it shows time by client', () => {
		mockClientsList = { isLoaded: false, isError: false };

		const report = reportUnder([], PROJECTS_READ);

		expect(report.isDailyPending).toBe(true);
		expect(report.isDailyError).toBe(false);
		expect(report.rows).toEqual([]);
		expect(report.figures.reportSeconds).toBeNull();
	});

	it('waits for the projects before it shows time by client', () => {
		const report = reportUnder([], { isPending: true, isError: false });

		expect(report.isDailyPending).toBe(true);
		expect(report.rows).toEqual([]);
	});

	it("shows the report's error when the clients cannot be read, and reads them again on retry", () => {
		mockClientsList = { isLoaded: false, isError: true };

		const report = reportUnder([], PROJECTS_READ);

		expect(report.isDailyError).toBe(true);
		expect(report.isDailyPending).toBe(false);
		expect(report.rows).toEqual([]);

		report.refetchDaily();

		expect(mockRefetchClientNames).toHaveBeenCalledTimes(1);
		expect(mockRefetchDaily).toHaveBeenCalledTimes(1);
		expect(mockRefetchProjectClients).not.toHaveBeenCalled();
	});

	it("shows the report's error when the projects cannot be read, and reads them again on retry", () => {
		const report = reportUnder([], { isPending: false, isError: true });

		expect(report.isDailyError).toBe(true);

		report.refetchDaily();

		expect(mockRefetchProjectClients).toHaveBeenCalledTimes(1);
		expect(mockRefetchClientNames).not.toHaveBeenCalled();
	});

	it('waits for the permissions and reads no client before they say the reader may', () => {
		mockAccess = 'unknown';

		const report = reportUnder([], PROJECTS_READ);

		expect(report.isDailyPending).toBe(true);
		expect(report.rows).toEqual([]);
		expect(mockClientsQueryOptions).toHaveBeenLastCalledWith(READS_NO_NAMES);
	});

	it('neither reads the clients nor gives the rows a client under another grouping', () => {
		mockGrouping = 'project';

		const report = reportUnder([], PROJECTS_READ);

		const clientsOfRows = report.rows.map((row) => row.client);
		expect(clientsOfRows).toEqual([undefined, undefined]);
		expect(report.clientOfProjectLog).toBeNull();
		expect(mockClientsQueryOptions).toHaveBeenLastCalledWith(READS_NO_NAMES);
	});
});
