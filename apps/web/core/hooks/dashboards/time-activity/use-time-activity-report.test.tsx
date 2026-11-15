/** @jest-environment jsdom */

import { renderHook } from '@testing-library/react';
import { NO_CLIENT_FILTER_VALUE } from '@/core/lib/utils/project-list';
import { localDayKeyOf } from '@/core/lib/utils/dashboard-export';
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
			{
				project: {
					id: 'website',
					name: 'Website',
					organizationContact: { id: 'acme', name: 'Acme in the report' }
				},
				employeeLogs
			},
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
const LINKED_PERIOD = { from: new Date(2026, 10, 3), to: new Date(2026, 10, 3, 23, 59, 59) };
let mockLinkedPeriod: { from: Date; to: Date } | null = LINKED_PERIOD;
const mockSetPeriod = jest.fn();
/** A role that may read client rates, unless a test takes it away. */
let mockPermissions: string[] = ['CHANGE_SELECTED_EMPLOYEE'];
/** The daily reads still show the previous period or filters while the next ones load. */
let mockShowsPreviousRead = false;
/** What the daily read answers: the report of November 3, unless a test reads another day. */
let mockDailyReport = DAILY_REPORT;
const mockRatesByProject = new Map([['website', { id: 'website', billRateValue: 90, currency: 'EUR', members: [] }]]);

// Breaks (#5216) off, as in a workspace that never turned them on, unless a test turns them on
let mockAllowsBreaks = false;
let mockBreaksQuery: { data?: number; isError: boolean } = { data: undefined, isError: false };
jest.mock('@/core/hooks/timer/use-breaks-allowed', () => ({ useBreaksAllowed: () => mockAllowsBreaks }));
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
	useTimeActivitySettings: () => ({
		filters: mockFilters,
		grouping: mockGrouping,
		clientGroupingAccess: mockAccess,
		linkedPeriod: mockLinkedPeriod,
		holdsView: mockLinkedPeriod !== null,
		setPeriod: mockSetPeriod
	})
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
	// Breaks (#5216): their figure's read, off unless a test turns breaks on
	useTimeActivityBreaksQuery: () => mockBreaksQuery,
	useTimeActivityDailyQuery: () => ({
		data: mockDailyReport,
		isPlaceholderData: mockShowsPreviousRead,
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
// The organization's read, which fills the current organization the amounts are priced with
const mockRefetchOrganization = jest.fn();
let mockOrganizationReadFailed = false;
jest.mock('@/core/hooks/auth/use-current-organization', () => ({
	useGetCurrentOrganization: () => ({ isError: mockOrganizationReadFailed, refetch: mockRefetchOrganization })
}));
jest.mock('@/core/hooks/roles/use-my-role-permissions-query', () => ({
	useMyRolePermissionsQuery: () => ({ myPermissions: mockPermissions, isLoaded: true })
}));
jest.mock('@/core/hooks/organizations/rates/use-project-client-rates', () => ({
	useProjectClientRates: () => ({
		ratesByProject: mockRatesByProject,
		isLoading: false,
		hasFailed: false,
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

import { getDefaultStore } from 'jotai';
import { currentOrganizationState } from '@/core/stores/user/user-organizations';
import type { TOrganization } from '@/core/types/schemas';
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
		expect(report.isBreakdownPending).toBe(false);
		expect(report.isBreakdownError).toBe(false);
		expect(report.isClientNamesError).toBe(false);
		const clientsOfRows = report.rows.map((row) => [row.projectName, row.client]);
		expect(clientsOfRows).toEqual([
			['Website', { key: 'acme', name: 'Acme' }],
			['Old site', { key: 'archived-client', name: 'Old client' }]
		]);
		expect(report.clientOfProjectLog).not.toBeNull();
		expect(mockClientsQueryOptions).toHaveBeenLastCalledWith(READS_NAMES);
	});

	it('shows the figures at once and keeps only the table waiting while the clients list is read', () => {
		mockClientsList = { isLoaded: false, isError: false };

		const report = reportUnder([], PROJECTS_READ);

		expect(report.isDailyPending).toBe(false);
		expect(report.isDailyError).toBe(false);
		expect(report.figures.reportSeconds).toBe(1200);
		expect(report.isBreakdownPending).toBe(true);
		expect(report.clientOfProjectLog).toBeNull();
	});

	it('keeps only the table waiting while the projects are read', () => {
		const report = reportUnder([], { isPending: true, isError: false });

		expect(report.isDailyPending).toBe(false);
		expect(report.figures.reportSeconds).toBe(1200);
		expect(report.isBreakdownPending).toBe(true);
		expect(report.clientOfProjectLog).toBeNull();
	});

	it('names the clients from the report when the clients list cannot be read, says so, and reads it again on retry', () => {
		mockClientsList = { isLoaded: false, isError: true };

		const report = reportUnder([], PROJECTS_READ);

		expect(report.isDailyError).toBe(false);
		expect(report.isDailyPending).toBe(false);
		expect(report.isBreakdownError).toBe(false);
		expect(report.isBreakdownPending).toBe(false);
		expect(report.isClientNamesError).toBe(true);
		expect(report.figures.reportSeconds).toBe(1200);
		const clientsOfRows = report.rows.map((row) => [row.projectName, row.client]);
		expect(clientsOfRows).toEqual([
			['Website', { key: 'acme', name: 'Acme in the report' }],
			['Old site', { key: 'archived-client', name: null }]
		]);

		report.retryClientNames();

		expect(mockRefetchClientNames).toHaveBeenCalledTimes(1);
		expect(mockRefetchDaily).not.toHaveBeenCalled();
	});

	it("shows the table's error only when the projects cannot be read, and reads them again on retry", () => {
		const report = reportUnder([], { isPending: false, isError: true });

		expect(report.isDailyError).toBe(false);
		expect(report.figures.reportSeconds).toBe(1200);
		expect(report.isBreakdownError).toBe(true);
		expect(report.isBreakdownPending).toBe(false);

		report.refetchDaily();

		expect(mockRefetchProjectClients).toHaveBeenCalledTimes(1);
		expect(mockRefetchClientNames).not.toHaveBeenCalled();
	});

	it('keeps the table waiting for the permissions and reads no client before they say the reader may', () => {
		mockAccess = 'unknown';

		const report = reportUnder([], PROJECTS_READ);

		expect(report.isDailyPending).toBe(false);
		expect(report.isBreakdownPending).toBe(true);
		expect(report.clientOfProjectLog).toBeNull();
		expect(mockClientsQueryOptions).toHaveBeenLastCalledWith(READS_NO_NAMES);
	});

	it('neither reads the clients nor gives the rows a client under another grouping', () => {
		mockGrouping = 'project';

		const report = reportUnder([], PROJECTS_READ);

		const clientsOfRows = report.rows.map((row) => row.client);
		expect(clientsOfRows).toEqual([undefined, undefined]);
		expect(report.clientOfProjectLog).toBeNull();
		expect(report.isBreakdownPending).toBe(false);
		expect(report.isClientNamesError).toBe(false);
		expect(mockClientsQueryOptions).toHaveBeenLastCalledWith(READS_NO_NAMES);
	});
});

describe('useTimeActivityReport with a duration rounding rule', () => {
	const QUARTER_UP = { id: 'organization-a', durationRoundingInterval: 15, durationRoundingDirection: 'UP' };
	const ROWS_READ = { isPending: false, isError: false };

	function useRule(organization: object | null) {
		getDefaultStore().set(currentOrganizationState, organization as TOrganization | null);
	}

	beforeEach(() => {
		resetMocks('project');
	});

	afterEach(() => {
		useRule(null);
	});

	it('rounds each row and sums the figures from the rounded rows', () => {
		useRule(QUARTER_UP);

		const report = reportUnder([], ROWS_READ);

		// Two rows of 10 minutes listed without their entries: each is rounded as one entry
		expect(report.rows.map((row) => row.seconds)).toEqual([900, 900]);
		expect(report.totals.seconds).toBe(1800);
		expect(report.figures.trackedSeconds).toBe(1800);
		expect(report.roundingRule).toEqual({ intervalMinutes: 15, direction: 'UP' });
	});

	it('gives the exports the report with each entry rounded, as the rows show it', () => {
		useRule(QUARTER_UP);

		const report = reportUnder([], ROWS_READ);

		const sums = report.report.flatMap((day) =>
			day.logs.flatMap((projectLog) => projectLog.employeeLogs.map((employeeLog) => employeeLog.sum))
		);
		expect(sums).toEqual([900, 900]);
	});

	it('builds the week grid from the rounded rows', () => {
		useRule(QUARTER_UP);

		const report = reportUnder([], ROWS_READ);

		expect(report.weekDailySource?.rows.map((row) => row.seconds)).toEqual([900, 900]);
	});

	it('shows the time as tracked without a rule', () => {
		const report = reportUnder([], ROWS_READ);

		expect(report.rows.map((row) => row.seconds)).toEqual([600, 600]);
		expect(report.roundingRule).toBeNull();
		expect(report.isDailyPending).toBe(false);
		expect(report.weekDailySource).toBeNull();
	});
});

describe('useTimeActivityReport and the period of the page link', () => {
	beforeEach(() => {
		resetMocks('project');
		mockSetPeriod.mockClear();
		mockLinkedPeriod = LINKED_PERIOD;
	});

	afterEach(() => {
		mockShowsPreviousRead = false;
		mockDailyReport = DAILY_REPORT;
	});

	afterAll(() => {
		mockLinkedPeriod = LINKED_PERIOD;
	});

	it('reads the period the link names and leaves the link alone', () => {
		const report = reportUnder([], PROJECTS_READ);

		expect(report.period).toBe(LINKED_PERIOD);
		expect(report.request?.startDate).toBe('2026-11-03');
		expect(report.request?.endDate).toBe('2026-11-03');
		expect(mockSetPeriod).not.toHaveBeenCalled();
	});

	it('writes the last 7 days into a link that names no period', () => {
		mockLinkedPeriod = null;

		const report = reportUnder([], PROJECTS_READ);

		expect(mockSetPeriod).toHaveBeenCalledTimes(1);
		expect(mockSetPeriod).toHaveBeenCalledWith(report.period);
		expect(report.request?.endDate).toBe(localDayKeyOf(new Date()));
	});

	it('keeps the chart on the days of the rows it shows while another period is read (#5342)', () => {
		const nextDay = { from: new Date(2026, 10, 4), to: new Date(2026, 10, 4, 23, 59, 59) };
		const { result, rerender } = renderHook(() => useTimeActivityReport());
		const chartOf = (report: typeof result.current) => report.chartDays.map((day) => [day.key, day.value]);
		const firstDay = [[localDayKeyOf(LINKED_PERIOD.from), 1200]];
		expect(chartOf(result.current)).toEqual(firstDay);

		// The next period is asked for: its read is on the way, the previous rows stay on screen
		mockLinkedPeriod = nextDay;
		mockShowsPreviousRead = true;
		rerender();

		expect(result.current.period).toBe(nextDay);
		expect(chartOf(result.current)).toEqual(firstDay);

		// Its own rows came: the chart draws the new period with them
		mockDailyReport = DAILY_REPORT.map((day) => ({ ...day, date: '2026-11-04' }));
		mockShowsPreviousRead = false;
		rerender();

		expect(chartOf(result.current)).toEqual([[localDayKeyOf(nextDay.from), 1200]]);
	});

	it('writes a picked period into the link', () => {
		const report = reportUnder([], PROJECTS_READ);
		const picked = { from: new Date(2026, 9, 1), to: new Date(2026, 9, 31, 23, 59, 59) };

		report.setPeriod(picked);

		expect(mockSetPeriod).toHaveBeenCalledWith(picked);
	});
});

describe('useTimeActivityReport billable amounts', () => {
	beforeEach(() => {
		resetMocks('project');
		mockPermissions = ['CHANGE_SELECTED_EMPLOYEE'];
		mockOrganizationReadFailed = false;
		mockRefetchOrganization.mockClear();
		// Read, without a default rate: the amounts wait for nothing more
		getDefaultStore().set(currentOrganizationState, { id: 'organization' } as TOrganization);
	});

	it('prices the billable time at the client rate, and counts the time no rate prices apart', () => {
		const report = reportUnder([], PROJECTS_READ);

		expect(report.billable.isOffered).toBe(true);
		expect(report.billable.isPending).toBe(false);
		expect(report.billable.figures).toEqual({
			amounts: [{ currency: 'EUR', amount: 15 }],
			seconds: 1200,
			unpricedSeconds: 600
		});
	});

	it('prices the time no other rate prices at the workspace default', () => {
		const organization = {
			id: 'organization',
			currency: 'EUR',
			defaultBillRateValue: 60
		} as unknown as TOrganization;
		getDefaultStore().set(currentOrganizationState, organization);

		const report = reportUnder([], PROJECTS_READ);

		expect(report.billable.figures.amounts).toEqual([{ currency: 'EUR', amount: 25 }]);
		expect(report.billable.figures.unpricedSeconds).toBe(0);
	});

	it('waits instead of pricing a previous read beside the time now shown', () => {
		mockShowsPreviousRead = true;

		const report = reportUnder([], PROJECTS_READ);
		mockShowsPreviousRead = false;

		expect(report.billable.isPending).toBe(true);
		expect(report.billable.facts).toEqual([]);
	});

	it('reads the projects again from the billable retry when their lookup failed under a client filter', () => {
		const report = reportUnder([NO_CLIENT_FILTER_VALUE], { isPending: false, isError: true });

		expect(report.billable.isError).toBe(true);
		report.billable.refetch();
		expect(mockRefetchProjectClients).toHaveBeenCalledTimes(1);
	});

	it('waits for the organization, whose default rate, currency and rounding price the amounts (Greptile P2 on #5310)', () => {
		getDefaultStore().set(currentOrganizationState, null);

		const report = reportUnder([], PROJECTS_READ);

		expect(report.billable.isPending).toBe(true);
		expect(report.billable.facts).toEqual([]);
	});

	it('shows no amount once the organization could not be read, and reads it again from the billable retry', () => {
		getDefaultStore().set(currentOrganizationState, null);
		mockOrganizationReadFailed = true;

		const report = reportUnder([], PROJECTS_READ);

		expect(report.billable.isError).toBe(true);
		expect(report.billable.isPending).toBe(false);
		// No facts priced without the organization reach the breakdown (CodeRabbit on #5312)
		expect(report.billable.facts).toEqual([]);
		report.billable.refetch();
		expect(mockRefetchOrganization).toHaveBeenCalledTimes(1);
	});

	it('gives no billable amount to a role that may not read client rates', () => {
		mockPermissions = ['ORG_TIME_TRACKING'];

		const report = reportUnder([], PROJECTS_READ);

		expect(report.billable.isOffered).toBe(false);
		expect(report.billable.facts).toEqual([]);
		expect(report.billable.figures.amounts).toEqual([]);
	});
});

describe('useTimeActivityReport with breaks on (#5216)', () => {
	beforeEach(() => {
		resetMocks('project');
		mockFilters = NO_FILTERS;
		mockAllowsBreaks = true;
	});

	afterEach(() => {
		mockAllowsBreaks = false;
		mockBreaksQuery = { data: undefined, isError: false };
	});

	it('gives the time on breaks the read found', () => {
		mockBreaksQuery = { data: 3600, isError: false };

		const { figures } = renderHook(() => useTimeActivityReport()).result.current;

		expect(figures.breakSeconds).toBe(3600);
	});

	it('shows no figure while the read loads', () => {
		mockBreaksQuery = { data: undefined, isError: false };

		const { figures } = renderHook(() => useTimeActivityReport()).result.current;

		expect(figures.breakSeconds).toBeUndefined();
	});

	it('says the figure is unavailable once the read failed, never a period without breaks', () => {
		mockBreaksQuery = { data: undefined, isError: true };

		const { figures } = renderHook(() => useTimeActivityReport()).result.current;

		expect(figures.breakSeconds).toBeNull();
	});
});
