/** @jest-environment jsdom */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import type { Period } from '@/core/lib/utils/dashboard-period';
import { currentOrganizationState } from '@/core/stores/user/user-organizations';
import type { TOrganization } from '@/core/types/schemas';

interface Deferred<T> {
	promise: Promise<T>;
	resolve: (value: T) => void;
}

/** An answer of the API the test gives when it chooses to. */
function deferred<T>(): Deferred<T> {
	let resolve: (value: T) => void = () => undefined;
	const promise = new Promise<T>((onResolve) => {
		resolve = onResolve;
	});
	return { promise, resolve };
}

const mockReports = { getBillableTimeLogs: jest.fn(), getOwedAmountReport: jest.fn() };
const mockRates = { getProjectRates: jest.fn() };
/** The signed-in role's permissions: read, and without the rates of every project, unless a case says otherwise. */
const settledPermissions = { myPermissions: [] as string[], isLoaded: true, isLoading: false };
let mockPermissions = settledPermissions;
const siteProject = { id: 'project-site', name: 'Site', organizationContactId: 'client-acme', currency: 'USD' };
const mockProjectsQuery = {
	organizationProjects: [siteProject] as Array<Record<string, unknown>>,
	isOrganizationProjectsLoaded: true,
	isOrganizationProjectsError: false,
	refetchOrganizationProjects: jest.fn()
};

// Getters: the mocked modules load before this file's constants are set, and read them only when called
jest.mock('@/core/services/client/api/timesheets/time-log-report.service', () => ({
	get timeLogReportService() {
		return mockReports;
	}
}));
jest.mock('@/core/services/client/api/organizations/rate.service', () => ({
	get rateService() {
		return mockRates;
	}
}));
jest.mock('@/core/hooks/roles/use-my-role-permissions-query', () => ({
	useMyRolePermissionsQuery: () => mockPermissions
}));
jest.mock('@/core/hooks/organizations/projects/use-organization-projects-query', () => ({
	useOrganizationProjectsQuery: () => mockProjectsQuery
}));
jest.mock('@/core/lib/helpers/cookies', () => ({
	getTenantIdCookie: () => 'tenant-1',
	getOrganizationIdCookie: () => 'organization-1'
}));

import { useInvoiceTime } from './use-invoice-time';

const october: Period = { from: new Date(2026, 9, 1), to: new Date(2026, 9, 31) };
const labels = { unnamedProject: 'Unnamed project', unnamedMember: 'Unnamed member', noTask: 'No task' };
const adaTime = {
	projectId: 'project-site',
	employeeId: 'member-ada',
	taskId: null,
	isBillable: true,
	duration: 36000
};
const ada = { id: 'member-ada', billRateValue: 80, billRateCurrency: 'USD', user: { firstName: 'Ada' } };
const owedReport = [{ employees: [{ employee: ada }] }];
const siteRates = { id: 'project-site', billRateValue: null, currency: 'USD', members: [] };

const organization = { id: 'organization-1', currency: 'USD' } as TOrganization;

function renderInvoiceTime(currentOrganization: TOrganization = organization) {
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const store = createStore();
	store.set(currentOrganizationState, currentOrganization);
	const wrapper = ({ children }: Readonly<{ children: React.ReactNode }>) => (
		<QueryClientProvider client={queryClient}>
			<Provider store={store}>{children}</Provider>
		</QueryClientProvider>
	);
	const rendered = renderHook(
		() => useInvoiceTime({ clientId: 'client-acme', period: october, grouping: 'member', labels }),
		{ wrapper }
	);
	return { ...rendered, queryClient };
}

describe('the billable time of a new invoice while it is read again', () => {
	beforeEach(() => {
		mockReports.getBillableTimeLogs.mockResolvedValue([adaTime]);
		mockReports.getOwedAmountReport.mockResolvedValue(owedReport);
		mockRates.getProjectRates.mockResolvedValue(siteRates);
	});

	async function renderReadTime() {
		const rendered = renderInvoiceTime();
		await waitFor(() => expect(rendered.result.current.isLoading).toBe(false));
		expect(rendered.result.current.lines).toHaveLength(1);
		expect(rendered.result.current.isUpdating).toBe(false);
		return rendered;
	}

	it('is being updated while the members’ own rates are read again', async () => {
		const { result, queryClient } = await renderReadTime();
		const report = deferred<unknown>();
		mockReports.getOwedAmountReport.mockReturnValueOnce(report.promise);

		act(() => {
			void queryClient.refetchQueries({ queryKey: ['timesheet', 'reports', 'owed-amounts'] });
		});
		await waitFor(() => expect(result.current.isUpdating).toBe(true));

		await act(async () => {
			report.resolve(owedReport);
			await report.promise;
		});
		await waitFor(() => expect(result.current.isUpdating).toBe(false));
	});

	it('is being updated while the client rates of a project are read again', async () => {
		const { result, queryClient } = await renderReadTime();
		const rates = deferred<unknown>();
		mockRates.getProjectRates.mockReturnValueOnce(rates.promise);

		act(() => {
			void queryClient.refetchQueries({ queryKey: ['rates'] });
		});
		await waitFor(() => expect(result.current.isUpdating).toBe(true));

		await act(async () => {
			rates.resolve(siteRates);
			await rates.promise;
		});
		await waitFor(() => expect(result.current.isUpdating).toBe(false));
	});
});

describe('the projects whose time a new invoice bills', () => {
	beforeEach(() => {
		mockReports.getBillableTimeLogs.mockResolvedValue([adaTime]);
		mockReports.getOwedAmountReport.mockResolvedValue(owedReport);
		mockRates.getProjectRates.mockResolvedValue(siteRates);
	});

	afterEach(() => {
		mockProjectsQuery.organizationProjects = [siteProject];
	});

	it('include a project whose client came only as its relation, as the Clients page counts it', async () => {
		const relationOnly = { id: 'project-site', name: 'Site', organizationContact: { id: 'client-acme' } };
		mockProjectsQuery.organizationProjects = [relationOnly];

		const { result } = renderInvoiceTime();
		await waitFor(() => expect(result.current.isLoading).toBe(false));

		expect(result.current.hasProjects).toBe(true);
		expect(result.current.lines).toHaveLength(1);
	});
});

describe('the billable time of a workspace that rounds durations', () => {
	const minutesOfAda = (minutes: number) => ({ ...adaTime, duration: minutes * 60 });

	beforeEach(() => {
		mockReports.getBillableTimeLogs.mockResolvedValue([minutesOfAda(7), minutesOfAda(8), minutesOfAda(22)]);
		mockReports.getOwedAmountReport.mockResolvedValue(owedReport);
		mockRates.getProjectRates.mockResolvedValue(siteRates);
	});

	it('bills each entry rounded: 7, 8 and 22 min make 1.00 h at 15 min up', async () => {
		const rounding = { ...organization, durationRoundingInterval: 15, durationRoundingDirection: 'UP' as const };

		const { result } = renderInvoiceTime(rounding);
		await waitFor(() => expect(result.current.isLoading).toBe(false));

		expect(result.current.lines.map((line) => line.hours)).toEqual([1]);
		expect(result.current.roundingRule).toEqual({ intervalMinutes: 15, direction: 'UP' });
	});

	it('bills the time as tracked without a rule: 0.62 h', async () => {
		const { result } = renderInvoiceTime();
		await waitFor(() => expect(result.current.isLoading).toBe(false));

		expect(result.current.lines.map((line) => line.hours)).toEqual([0.62]);
		expect(result.current.roundingRule).toBeNull();
	});
});

describe('the billable time of an invoice that shows the lines it was saved with', () => {
	beforeEach(() => {
		mockReports.getBillableTimeLogs.mockReset();
		mockReports.getOwedAmountReport.mockReset();
		mockRates.getProjectRates.mockReset();
	});

	it('is not read until it is taken again', async () => {
		const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
		const store = createStore();
		const wrapper = ({ children }: Readonly<{ children: React.ReactNode }>) => (
			<QueryClientProvider client={queryClient}>
				<Provider store={store}>{children}</Provider>
			</QueryClientProvider>
		);
		const options = { clientId: 'client-acme', period: october, grouping: 'member' as const, labels };

		const { result } = renderHook(() => useInvoiceTime({ ...options, enabled: false }), { wrapper });
		await act(async () => {
			await Promise.resolve();
		});

		expect(result.current.lines).toEqual([]);
		expect(result.current.isUpdating).toBe(false);
		expect(mockReports.getBillableTimeLogs).not.toHaveBeenCalled();
		expect(mockReports.getOwedAmountReport).not.toHaveBeenCalled();
		expect(mockRates.getProjectRates).not.toHaveBeenCalled();
	});
});

type BillableReadOptions = {
	notInvoiced: boolean;
	scope: { tenantId: string; organizationId: string };
	withClientRates?: boolean;
};

const freeAda = { ...adaTime, id: 'log-free', invoiceItemId: null };
const ownAda = { ...adaTime, id: 'log-own', duration: 7200, invoiceItemId: 'line-1' };
const otherInvoiceAda = { ...adaTime, id: 'log-other', duration: 3600, invoiceItemId: 'line-of-another-invoice' };

/** The free time when asked, all of it otherwise, as an API that records billed time answers. */
function answerTimeReads(free: unknown[], all: unknown[]) {
	mockReports.getBillableTimeLogs.mockImplementation(
		async (_range: unknown, _relations: unknown, options: BillableReadOptions) => {
			if (options.notInvoiced) {
				return free;
			}
			return all;
		}
	);
}

function readOptionsOfCalls(): BillableReadOptions[] {
	return mockReports.getBillableTimeLogs.mock.calls.map((call) => call[2] as BillableReadOptions);
}

function renderTimeOf(options: Partial<Parameters<typeof useInvoiceTime>[0]>) {
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const store = createStore();
	store.set(currentOrganizationState, { id: 'organization-1', currency: 'USD' } as TOrganization);
	const wrapper = ({ children }: Readonly<{ children: React.ReactNode }>) => (
		<QueryClientProvider client={queryClient}>
			<Provider store={store}>{children}</Provider>
		</QueryClientProvider>
	);
	const base = { clientId: 'client-acme', period: october, grouping: 'member' as const, labels };
	return renderHook(() => useInvoiceTime({ ...base, ...options }), { wrapper });
}

describe('the time a new invoice offers', () => {
	beforeEach(() => {
		mockReports.getBillableTimeLogs.mockReset();
		mockReports.getOwedAmountReport.mockReset();
		mockRates.getProjectRates.mockReset();
		mockReports.getOwedAmountReport.mockResolvedValue(owedReport);
		mockRates.getProjectRates.mockResolvedValue(siteRates);
	});

	it('is the time no invoice bills, read in the workspace its key holds', async () => {
		answerTimeReads([freeAda], [freeAda, ownAda]);

		const { result } = renderTimeOf({});
		await waitFor(() => expect(result.current.isLoading).toBe(false));

		expect(readOptionsOfCalls()).toEqual([
			{ notInvoiced: true, scope: { tenantId: 'tenant-1', organizationId: 'organization-1' } }
		]);
		expect(result.current.lines.map((line) => line.timeLogIds)).toEqual([['log-free']]);
		expect(result.current.recordsBilledTime).toBe(true);
	});

	it('says the period is all invoiced when every billable hour is on an invoice', async () => {
		answerTimeReads([], [ownAda]);

		const { result } = renderTimeOf({});
		await waitFor(() => expect(result.current.isAllInvoiced).toBe(true));

		expect(result.current.isLoading).toBe(false);
		expect(result.current.lines).toEqual([]);
	});

	it('does not say so when the period has no billable time at all', async () => {
		answerTimeReads([], []);

		const { result } = renderTimeOf({});
		await waitFor(() => expect(readOptionsOfCalls()).toHaveLength(2));
		await waitFor(() => expect(result.current.isLoading).toBe(false));

		expect(result.current.isAllInvoiced).toBe(false);
	});

	it('says the time could not be read when the check for an invoiced period fails', async () => {
		mockReports.getBillableTimeLogs.mockImplementation(
			async (_range: unknown, _relations: unknown, options: BillableReadOptions) => {
				if (options.notInvoiced) {
					return [];
				}
				throw new Error('offline');
			}
		);

		const { result } = renderTimeOf({});
		await waitFor(() => expect(readOptionsOfCalls()).toHaveLength(2));

		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(result.current.isAllInvoiced).toBe(false);
	});

	it('comes from an API that does not record billed time when the logs name no line', async () => {
		answerTimeReads([adaTime], [adaTime]);

		const { result } = renderTimeOf({});
		await waitFor(() => expect(result.current.isLoading).toBe(false));

		expect(result.current.recordsBilledTime).toBe(false);
		expect(result.current.isAllInvoiced).toBe(false);
	});
});

describe('the time of a saved invoice', () => {
	const billedLines = { lineIds: new Set(['line-1']), projectIds: ['project-site'] };

	beforeEach(() => {
		mockReports.getBillableTimeLogs.mockReset();
		mockReports.getOwedAmountReport.mockReset();
		mockRates.getProjectRates.mockReset();
		mockReports.getOwedAmountReport.mockResolvedValue(owedReport);
		mockRates.getProjectRates.mockResolvedValue(siteRates);
	});

	afterEach(() => {
		mockProjectsQuery.organizationProjects = [siteProject];
	});

	it('reads the time its lines bill a day wider on each side: its maker read the period in their own zone', async () => {
		answerTimeReads([], [ownAda]);

		const { result } = renderTimeOf({ enabled: false, billedLines });
		await waitFor(() => expect(result.current.isReadingBilledTime).toBe(false));

		const range = mockReports.getBillableTimeLogs.mock.calls[0][0] as { from: Date; to: Date };
		expect(range.from).toEqual(new Date(2026, 8, 30));
		expect(range.to).toEqual(new Date(2026, 10, 1, 23, 59, 59, 999));
		expect(result.current.billedTimeByLine.get('line-1')).toEqual(['log-own']);
	});

	it('keeps the hours its lines bill on a project that left the client since, once the time is taken again', async () => {
		const goneProject = {
			id: 'project-gone',
			name: 'Old site',
			organizationContactId: 'client-beta',
			currency: 'USD'
		};
		mockProjectsQuery.organizationProjects = [siteProject, goneProject];
		const goneAda = {
			...adaTime,
			projectId: 'project-gone',
			id: 'log-gone',
			duration: 3600,
			invoiceItemId: 'line-2'
		};
		answerTimeReads([freeAda], [freeAda, goneAda]);
		const linesOnGoneProject = { lineIds: new Set(['line-2']), projectIds: ['project-gone'] };

		const { result } = renderTimeOf({ billedLines: linesOnGoneProject });
		await waitFor(() => expect(result.current.isLoading).toBe(false));

		const billedLogIds = result.current.lines.flatMap((line) => line.timeLogIds ?? []);
		expect(billedLogIds).toEqual(expect.arrayContaining(['log-free', 'log-gone']));
		expect(result.current.lines.map((line) => line.projectName)).toContain('Old site');
	});

	it('keeps the hours its lines bill once the time is taken again, when the client has no project left', async () => {
		const goneProject = {
			id: 'project-gone',
			name: 'Old site',
			organizationContactId: 'client-beta',
			currency: 'USD'
		};
		mockProjectsQuery.organizationProjects = [goneProject];
		const goneAda = {
			...adaTime,
			projectId: 'project-gone',
			id: 'log-gone',
			duration: 3600,
			invoiceItemId: 'line-2'
		};
		answerTimeReads([], [goneAda]);
		const linesOnGoneProject = { lineIds: new Set(['line-2']), projectIds: ['project-gone'] };

		const { result } = renderTimeOf({ billedLines: linesOnGoneProject });
		await waitFor(() => expect(result.current.isLoading).toBe(false));
		await waitFor(() => expect(result.current.lines).toHaveLength(1));

		expect(result.current.lines[0].timeLogIds).toEqual(['log-gone']);
		expect(result.current.lines[0].projectName).toBe('Old site');
		expect(result.current.lines[0].hours).toBe(1);
		// Without a project of its own the client's free time is never read: the API would answer every project's
		expect(readOptionsOfCalls().map((options) => options.notInvoiced)).toEqual([false]);
	});

	it('names the time each of its lines bills, without reading the free time or the rates', async () => {
		answerTimeReads([freeAda], [freeAda, ownAda, otherInvoiceAda]);

		const { result } = renderTimeOf({ enabled: false, billedLines });
		await waitFor(() => expect(result.current.isReadingBilledTime).toBe(false));

		expect(result.current.billedTimeByLine.get('line-1')).toEqual(['log-own']);
		expect(readOptionsOfCalls().map((options) => options.notInvoiced)).toEqual([false]);
		expect(mockReports.getOwedAmountReport).not.toHaveBeenCalled();
		expect(result.current.lines).toEqual([]);
		expect(result.current.unpriced).toEqual([]);
	});

	it('offers its own billed time again with the free time once the time is taken again', async () => {
		answerTimeReads([freeAda], [freeAda, ownAda, otherInvoiceAda]);

		const { result } = renderTimeOf({ billedLines });
		await waitFor(() => expect(result.current.isLoading).toBe(false));

		expect(result.current.lines).toHaveLength(1);
		expect(result.current.lines[0].timeLogIds).toEqual(['log-free', 'log-own']);
		expect(result.current.lines[0].hours).toBe(12);
	});

	it('reads its members and their rates over the same wider days as the time its lines bill', async () => {
		answerTimeReads([], [ownAda]);

		const { result } = renderTimeOf({ billedLines });
		await waitFor(() => expect(result.current.isReadingBilledTime).toBe(false));
		await waitFor(() => expect(mockReports.getOwedAmountReport).toHaveBeenCalled());

		const range = mockReports.getOwedAmountReport.mock.calls[0][0] as { from: Date; to: Date };
		expect(range.from).toEqual(new Date(2026, 8, 30));
		expect(range.to).toEqual(new Date(2026, 10, 1, 23, 59, 59, 999));
	});

	it('reads the time its lines bill over its own period too, when the edit picks another one', async () => {
		answerTimeReads([], [ownAda]);
		const savedInSeptember = { ...billedLines, period: { fromDay: '2026-09-01', toDay: '2026-09-30' } };

		const { result } = renderTimeOf({ enabled: false, billedLines: savedInSeptember });
		await waitFor(() => expect(result.current.isReadingBilledTime).toBe(false));

		const range = mockReports.getBillableTimeLogs.mock.calls[0][0] as { from: Date; to: Date };
		expect(range.from).toEqual(new Date(2026, 7, 31));
		expect(range.to).toEqual(new Date(2026, 10, 1, 23, 59, 59, 999));
	});

	it('is waited for while the time its lines bill is read', async () => {
		const all = deferred<unknown[]>();
		mockReports.getBillableTimeLogs.mockReturnValue(all.promise);

		const { result } = renderTimeOf({ enabled: false, billedLines });
		await waitFor(() => expect(result.current.isReadingBilledTime).toBe(true));

		await act(async () => {
			all.resolve([ownAda]);
			await all.promise;
		});
		await waitFor(() => expect(result.current.isReadingBilledTime).toBe(false));
		expect(result.current.hasBilledTimeFailed).toBe(false);
	});

	it('says when the time its lines bill could not be read', async () => {
		mockReports.getBillableTimeLogs.mockRejectedValue(new Error('offline'));

		const { result } = renderTimeOf({ enabled: false, billedLines });

		await waitFor(() => expect(result.current.hasBilledTimeFailed).toBe(true));
	});
});

describe('the time of a new invoice priced at the client rates each entry kept (CORE-29)', () => {
	// The project's client rate is 110 today; Ada's October was worked at 90 and kept it
	const siteRatesToday = { ...siteRates, billRateValue: 110 };
	const keptAt = (rate: number) => ({
		ratesStored: true,
		clientRates: {
			projectBillRateValue: rate,
			projectMemberBillRateValue: null,
			projectBillRateCurrency: 'USD',
			projectMemberBillRateCurrency: null
		}
	});
	const octoberAda = { ...adaTime, id: 'log-october', duration: 144000, invoiceItemId: null, ...keptAt(90) };
	const novemberAda = { ...adaTime, id: 'log-november', duration: 7200, invoiceItemId: null, ...keptAt(110) };

	/** The logs as the API answers them: the rates they keep only to a read that asks for them. */
	function answerAsTheApi(logs: ReadonlyArray<Record<string, unknown>>) {
		mockReports.getBillableTimeLogs.mockImplementation(
			async (_range: unknown, _relations: unknown, options: BillableReadOptions) =>
				logs.map(({ ratesStored, clientRates, ...log }) =>
					options.withClientRates ? { ...log, ratesStored, clientRates } : log
				)
		);
	}

	beforeEach(() => {
		mockReports.getBillableTimeLogs.mockReset();
		mockReports.getOwedAmountReport.mockResolvedValue(owedReport);
		mockRates.getProjectRates.mockResolvedValue(siteRatesToday);
	});

	afterEach(() => {
		mockPermissions = settledPermissions;
	});

	const asRateAdmin = () => {
		mockPermissions = { myPermissions: ['ORG_EMPLOYEES_EDIT'], isLoaded: true, isLoading: false };
	};

	it('asks an admin’s time with the client rates it kept, and bills 40 h at the 90 kept: 3,600, not 4,400', async () => {
		asRateAdmin();
		answerAsTheApi([octoberAda]);

		const { result } = renderTimeOf({});
		await waitFor(() => expect(result.current.isLoading).toBe(false));

		expect(readOptionsOfCalls()[0]).toMatchObject({ notInvoiced: true, withClientRates: true });
		expect(result.current.lines.map((line) => [line.hours, line.rate, line.amount])).toEqual([[40, 90, 3600]]);
		// The line says today's rate differs, for its note
		expect(result.current.lines[0].todaysPrice).toEqual({ rate: 110, currency: 'USD' });
	});

	it('makes one line per rate when a member worked at two, the one at today’s rate without a note', async () => {
		asRateAdmin();
		answerAsTheApi([octoberAda, novemberAda]);

		const { result } = renderTimeOf({});
		await waitFor(() => expect(result.current.lines).toHaveLength(2));

		const lines = [...result.current.lines].sort((a, b) => a.rate - b.rate);
		expect(lines.map((line) => [line.hours, line.rate, line.amount])).toEqual([
			[40, 90, 3600],
			[2, 110, 220]
		]);
		expect(lines[1].todaysPrice).toBeUndefined();
	});

	it('reads the time as before for a role that may not read every client rate, priced at today’s', async () => {
		answerAsTheApi([octoberAda]);

		const { result } = renderTimeOf({});
		await waitFor(() => expect(result.current.isLoading).toBe(false));

		expect(readOptionsOfCalls()[0]).not.toHaveProperty('withClientRates');
		expect(result.current.lines.map((line) => [line.rate, line.amount])).toEqual([[110, 4400]]);
	});

	it('waits for the permissions before reading the time, and says it is loading meanwhile', async () => {
		mockPermissions = { myPermissions: [], isLoaded: false, isLoading: true };
		answerAsTheApi([octoberAda]);

		const { result, rerender } = renderTimeOf({});
		await act(async () => {
			await Promise.resolve();
		});

		expect(mockReports.getBillableTimeLogs).not.toHaveBeenCalled();
		expect(result.current.isLoading).toBe(true);

		asRateAdmin();
		rerender();
		await waitFor(() => expect(result.current.isLoading).toBe(false));

		// Read once, with the kept rates: never priced at today's rates first
		expect(readOptionsOfCalls().filter((options) => options.notInvoiced)).toEqual([
			expect.objectContaining({ withClientRates: true })
		]);
		expect(result.current.lines.map((line) => line.amount)).toEqual([3600]);
	});

	it('reads the time when the permissions could not be read, priced at today’s rates', async () => {
		mockPermissions = { myPermissions: [], isLoaded: false, isLoading: false };
		answerAsTheApi([octoberAda]);

		const { result } = renderTimeOf({});
		await waitFor(() => expect(result.current.isLoading).toBe(false));

		expect(readOptionsOfCalls()[0]).not.toHaveProperty('withClientRates');
		expect(result.current.lines.map((line) => line.amount)).toEqual([4400]);
	});
});

describe('the lines of a new invoice regrouped (#5355)', () => {
	beforeEach(() => {
		mockReports.getBillableTimeLogs.mockReset();
		mockReports.getBillableTimeLogs.mockResolvedValue([adaTime]);
		mockReports.getOwedAmountReport.mockResolvedValue(owedReport);
		mockRates.getProjectRates.mockResolvedValue(siteRates);
	});

	type Grouping = Parameters<typeof useInvoiceTime>[0]['grouping'];

	/** The new invoice's time under one grouping; a rerender switches it. */
	function renderRegrouped(initialGrouping: Grouping) {
		const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
		const store = createStore();
		store.set(currentOrganizationState, organization);
		const wrapper = ({ children }: Readonly<{ children: React.ReactNode }>) => (
			<QueryClientProvider client={queryClient}>
				<Provider store={store}>{children}</Provider>
			</QueryClientProvider>
		);
		return renderHook(
			({ grouping }: { grouping: Grouping }) =>
				useInvoiceTime({ clientId: 'client-acme', period: october, grouping, labels }),
			{ wrapper, initialProps: { grouping: initialGrouping } }
		);
	}

	it('regroups the time already read by task, without reading it again or showing the loading state', async () => {
		// Two tasks of one member: one line by member, two named lines by task
		const homepageTime = {
			...adaTime,
			taskId: 'task-home',
			task: { id: 'task-home', number: 12, title: 'Homepage' },
			duration: 7200
		};
		const checkoutTime = {
			...adaTime,
			taskId: 'task-checkout',
			task: { id: 'task-checkout', number: 13, title: 'Checkout' },
			duration: 3600
		};
		mockReports.getBillableTimeLogs.mockResolvedValue([homepageTime, checkoutTime]);
		const { result, rerender } = renderRegrouped('member');
		await waitFor(() => expect(result.current.isLoading).toBe(false));
		const readsBefore = mockReports.getBillableTimeLogs.mock.calls.length;
		// The time is read with its tasks from the start
		expect(mockReports.getBillableTimeLogs.mock.calls[0][1]).toEqual(['task']);
		expect(result.current.lines.map((line) => line.seconds)).toEqual([10800]);

		rerender({ grouping: 'task' });

		expect(result.current.isLoading).toBe(false);
		expect(result.current.lines.map((line) => [line.label, line.seconds])).toEqual([
			[expect.stringMatching(/^#12 Homepage · /), 7200],
			[expect.stringMatching(/^#13 Checkout · /), 3600]
		]);
		expect(mockReports.getBillableTimeLogs.mock.calls).toHaveLength(readsBefore);
	});

	it('keeps every second, every time log and the amount whichever way the lines are grouped', async () => {
		// 2 h and 1 h on two tasks and 30 min on none, at 80 USD an hour: 280 USD in every grouping
		const homepageTime = { ...adaTime, id: 'log-home', taskId: 'task-home', duration: 7200 };
		const checkoutTime = { ...adaTime, id: 'log-checkout', taskId: 'task-checkout', duration: 3600 };
		const untaskedTime = { ...adaTime, id: 'log-none', taskId: null, duration: 1800 };
		mockReports.getBillableTimeLogs.mockResolvedValue([homepageTime, checkoutTime, untaskedTime]);
		const { result, rerender } = renderRegrouped('project');
		await waitFor(() => expect(result.current.lines).toHaveLength(1));
		const readsBefore = mockReports.getBillableTimeLogs.mock.calls.length;
		const totalsOf = () => {
			const { lines } = result.current;
			return {
				seconds: lines.reduce((sum, line) => sum + line.seconds, 0),
				amount: lines.reduce((sum, line) => sum + line.amount, 0),
				timeLogIds: lines.flatMap((line) => line.timeLogIds ?? []).sort((a, b) => a.localeCompare(b))
			};
		};
		const expected = { seconds: 12600, amount: 280, timeLogIds: ['log-checkout', 'log-home', 'log-none'] };
		expect(totalsOf()).toEqual(expected);

		rerender({ grouping: 'member' });
		expect(result.current.lines).toHaveLength(1);
		expect(totalsOf()).toEqual(expected);

		rerender({ grouping: 'task' });
		const taskSeconds = result.current.lines.map((line) => line.seconds);
		expect(taskSeconds.sort((a, b) => a - b)).toEqual([1800, 3600, 7200]);
		expect(totalsOf()).toEqual(expected);
		expect(result.current.isLoading).toBe(false);
		expect(mockReports.getBillableTimeLogs.mock.calls).toHaveLength(readsBefore);
	});
});
