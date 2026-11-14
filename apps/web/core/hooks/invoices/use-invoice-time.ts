'use client';

import { useCallback, useMemo } from 'react';
import { useQueries, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { addDays, endOfDay, startOfDay, subDays } from 'date-fns';
import { queryKeys } from '@/core/query/keys';
import { rateService } from '@/core/services/client/api/organizations/rate.service';
import {
	timeLogReportService,
	type TimeLogReportRange
} from '@/core/services/client/api/timesheets/time-log-report.service';
import { useOrganizationProjectsQuery } from '@/core/hooks/organizations/projects/use-organization-projects-query';
import { getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/cookies';
import { getDefaultTimezone } from '@/core/lib/helpers/date-and-time';
import type { Period } from '@/core/lib/utils/dashboard-period';
import {
	logsStartedWithin,
	offeredLogsOf,
	recordsBilledTimeOf,
	timeLogIdsByLineOf
} from '@/core/lib/utils/invoice-billed-time';
import type { BilledLinesRead } from '@/core/lib/utils/invoice-edit';
import {
	billableEntriesOf,
	invoiceTimeOf,
	linePriceOf,
	namedLinesOf,
	type EmployeeBillingRate,
	type InvoiceGrouping,
	type InvoiceLineNames,
	type NamedInvoiceLine,
	type UnpricedTime
} from '@/core/lib/utils/invoices';
import { clientIdOf } from '@/core/lib/utils/project-list';
import { isRatesReadUnavailable } from '@/core/lib/utils/rates';
import { currentOrganizationState } from '@/core/stores/user/user-organizations';
import type { TOrganizationProject } from '@/core/types/schemas';
import type { TBillableTimeLog } from '@/core/types/schemas/organization/invoice.schema';
import type { TProjectRates } from '@/core/types/schemas/organization/rates.schema';
import type { TOwedReportDay, TOwedReportEmployee } from '@/core/types/schemas/timer/time-log-reports.schema';

const NO_LOGS: TBillableTimeLog[] = [];

const NO_REPORT: TOwedReportDay[] = [];

const TASK_RELATIONS: ReadonlyArray<string> = ['task'];

const NO_RELATIONS: ReadonlyArray<string> = [];

const NO_BILLED_LINES: BilledLinesRead = { lineIds: new Set(), projectIds: [] };

export interface InvoiceTimeLabels {
	unnamedProject: string;
	unnamedMember: string;
	noTask: string;
}

export interface NamedUnpricedTime extends UnpricedTime {
	projectName: string;
	memberName: string;
}

interface EmployeeOfReport extends EmployeeBillingRate {
	name: string;
}

interface ProjectRatesState {
	rates: TProjectRates | null;
	isLoading: boolean;
	isRefreshing: boolean;
	hasFailed: boolean;
}

function retriesRatesRead(failureCount: number, error: unknown) {
	if (isRatesReadUnavailable(error)) {
		return false;
	}
	return failureCount < 2;
}

/**
 * A project whose client rates the API does not serve (404, an API without those routes) or refuses (403) has none
 * here: its time is priced at each member's own rate, as everywhere else in the app. Any other failure is an error.
 */
function projectRatesStatesOf(results: ReadonlyArray<UseQueryResult<TProjectRates>>): ProjectRatesState[] {
	return results.map((result) => {
		const isUnavailable = isRatesReadUnavailable(result.error);
		return {
			rates: result.data ?? null,
			isLoading: result.isLoading,
			isRefreshing: result.isFetching && !result.isLoading,
			hasFailed: result.isError && !isUnavailable
		};
	});
}

function nameOfEmployee(employee: TOwedReportEmployee) {
	const user = employee.user;
	const parts = [user?.firstName?.trim(), user?.lastName?.trim()];
	const fullName = parts.filter(Boolean).join(' ');
	if (fullName) {
		return fullName;
	}
	return user?.name?.trim() ?? '';
}

/** The owed report names every member with time on these projects in the range, with their own billing rate. */
function employeesOfReport(report: ReadonlyArray<TOwedReportDay>) {
	const employees = new Map<string, EmployeeOfReport>();
	for (const day of report) {
		for (const entry of day.employees ?? []) {
			const employee = entry.employee;
			if (!employee) {
				continue;
			}
			employees.set(employee.id, {
				billRateValue: employee.billRateValue,
				billRateCurrency: employee.billRateCurrency,
				name: nameOfEmployee(employee)
			});
		}
	}
	return employees;
}

function taskTitleOf(task: NonNullable<TBillableTimeLog['task']>) {
	const title = task.title?.trim() ?? '';
	const hasNumber = typeof task.number === 'number';
	if (!hasNumber) {
		return title;
	}
	return `#${task.number} ${title}`.trim();
}

function taskTitlesOf(logs: ReadonlyArray<TBillableTimeLog>) {
	const titles = new Map<string, string>();
	for (const log of logs) {
		const task = log.task;
		if (!task) {
			continue;
		}
		const title = taskTitleOf(task);
		if (title) {
			titles.set(task.id, title);
		}
	}
	return titles;
}

function namesOfMap<T>(items: ReadonlyMap<string, T>, nameOf: (item: T) => string) {
	const names = new Map<string, string>();
	for (const [id, item] of items) {
		const name = nameOf(item);
		if (name) {
			names.set(id, name);
		}
	}
	return names;
}

function projectsById(projects: ReadonlyArray<TOrganizationProject>) {
	const byId = new Map<string, TOrganizationProject>();
	for (const project of projects) {
		byId.set(project.id, project);
	}
	return byId;
}

function sortedIdsOf(ids: Iterable<string>) {
	const distinct = [...new Set(ids)];
	return distinct.sort((first, second) => first.localeCompare(second));
}

/**
 * Whoever made a saved invoice read its period's days in their own time zone: the time its lines bill is read a day
 * wider on each side, so a log near the first or the last midnight keeps its line.
 */
function billedReadStartOf(from: Date, readsWider: boolean) {
	if (!readsWider) {
		return from;
	}
	return subDays(from, 1);
}

function billedReadEndOf(to: Date, readsWider: boolean) {
	if (!readsWider) {
		return to;
	}
	return addDays(to, 1);
}

/** The period's own logs out of a wider read: whether the period is all invoiced is told by its own time only. */
function periodLogsOf(logs: TBillableTimeLog[], from: Date, to: Date, readsWider: boolean) {
	if (!readsWider) {
		return logs;
	}
	return logsStartedWithin(logs, from, to);
}

function offeredProjectsOf(projects: ReadonlyArray<TOrganizationProject>, projectIds: ReadonlySet<string>) {
	const offered = projects.filter((project) => projectIds.has(project.id));
	return projectsById(offered);
}

interface QueryFlags {
	isLoading: boolean;
	isError: boolean;
	isFetching: boolean;
}

interface TimeReads {
	projects: { isLoaded: boolean; isError: boolean };
	free: QueryFlags;
	all: QueryFlags;
	employees: QueryFlags;
	rates: ReadonlyArray<ProjectRatesState>;
	readsBilledTime: boolean;
	/** The read of all the time runs: for the saved lines' time, or to tell a period already invoiced. */
	readsAllTime: boolean;
}

function isRefreshing(query: QueryFlags) {
	return query.isFetching && !query.isLoading;
}

function readStateOf(reads: TimeReads) {
	const isReadingRates = reads.rates.some((state) => state.isLoading);
	const haveRatesFailed = reads.rates.some((state) => state.hasFailed);
	const isReadingLogs = reads.free.isLoading || reads.all.isLoading;
	const isReadingTime = isReadingLogs || reads.employees.isLoading;
	const haveProjectsFailed = reads.projects.isError;
	// The projects read waits for the signed-in user: until it answered, "no project" is not known yet.
	const isReadingProjects = !reads.projects.isLoaded && !haveProjectsFailed;
	// Failed, the check for a period already invoiced would leave "no time" on screen instead of the error
	const hasAllTimeFailed = reads.readsAllTime && reads.all.isError;
	const hasTimeFailed = reads.free.isError || reads.employees.isError || hasAllTimeFailed;
	const isReadingBilledTime = reads.readsBilledTime && reads.all.isLoading;
	const hasBilledTimeFailed = reads.readsBilledTime && reads.all.isError;
	const isReadingAny = isReadingProjects || isReadingTime;
	const isLoading = isReadingAny || isReadingRates;
	const hasReadFailed = haveProjectsFailed || hasTimeFailed;
	const hasPricingFailed = haveRatesFailed || hasBilledTimeFailed;
	const isError = hasReadFailed || hasPricingFailed;
	const isRefreshingTime = [reads.free, reads.all, reads.employees].some(isRefreshing);
	const isRefreshingRates = reads.rates.some((state) => state.isRefreshing);
	// A read again keeps showing its previous answer: the lines, their rates and their names can still change.
	const isUpdating = isRefreshingTime || isRefreshingRates;
	return { isLoading, isError, isUpdating, isReadingBilledTime, hasBilledTimeFailed };
}

export function useInvoiceTime({
	clientId,
	period,
	grouping,
	labels,
	enabled = true,
	billedLines = NO_BILLED_LINES
}: Readonly<{
	clientId: string | null;
	period: Period;
	grouping: InvoiceGrouping;
	labels: InvoiceTimeLabels;
	/** Off while the invoice shows the lines it was saved with: its time is read once it is taken again. */
	enabled?: boolean;
	/** The lines of the saved invoice being edited or replaced: the time they bill is read whatever lines are shown. */
	billedLines?: BilledLinesRead;
}>) {
	const tenantId = getTenantIdCookie();
	const organizationId = getOrganizationIdCookie();
	const queryClient = useQueryClient();
	const organization = useAtomValue(currentOrganizationState);
	const organizationCurrency = organization?.currency ?? null;
	const timeZone = useMemo(() => getDefaultTimezone(), []);
	const projectsQuery = useOrganizationProjectsQuery();
	const organizationProjects = projectsQuery.organizationProjects;

	const clientProjects = useMemo(() => {
		if (!clientId) {
			return [];
		}
		return organizationProjects.filter((project) => clientIdOf(project) === clientId);
	}, [clientId, organizationProjects]);
	const clientProjectsById = useMemo(() => projectsById(clientProjects), [clientProjects]);
	const projectIds = useMemo(() => sortedIdsOf(clientProjectsById.keys()), [clientProjectsById]);
	// A saved line's project may have left the client since: the time it bills is read on its own project too
	const billedProjectIds = billedLines.projectIds;
	const allProjectIds = useMemo(
		() => sortedIdsOf([...projectIds, ...billedProjectIds]),
		[billedProjectIds, projectIds]
	);

	const from = useMemo(() => startOfDay(period.from), [period.from]);
	const to = useMemo(() => endOfDay(period.to), [period.to]);
	const hasBilledLines = billedLines.lineIds.size > 0;
	const allFrom = useMemo(() => billedReadStartOf(from, hasBilledLines), [from, hasBilledLines]);
	const allTo = useMemo(() => billedReadEndOf(to, hasBilledLines), [hasBilledLines, to]);
	const range = useMemo<TimeLogReportRange>(
		() => ({ from, to, timeZone, projectIds }),
		[from, projectIds, timeZone, to]
	);
	const allRange = useMemo<TimeLogReportRange>(
		() => ({ from: allFrom, to: allTo, timeZone, projectIds: allProjectIds }),
		[allFrom, allProjectIds, allTo, timeZone]
	);
	const scope = useMemo(() => ({ tenantId, organizationId }), [organizationId, tenantId]);
	const rangeKey = {
		tenantId,
		organizationId,
		projectIds,
		from: from.toISOString(),
		to: to.toISOString(),
		timeZone
	};

	const hasScope = Boolean(tenantId) && Boolean(organizationId);
	const hasProjects = projectIds.length > 0;
	// Without a project the API would answer the time of every project: the free time is never read without one.
	const readsTime = enabled && hasScope && hasProjects;
	// The time the saved lines bill is read on their own projects: it is taken again even when no project is left to
	// the client, and the members' rates are read on every project it offers.
	const takesTime = enabled && hasScope;
	const offersProjects = allProjectIds.length > 0;
	const readsMembers = takesTime && offersProjects;
	const readsRates = enabled && hasScope;
	const readsBilledTime = hasScope && hasBilledLines;
	const namesTasks = grouping === 'task';
	let relations = NO_RELATIONS;
	if (namesTasks) {
		relations = TASK_RELATIONS;
	}

	// Read again whenever the screen opens: another invoice may bill part of this time since the last read.
	const freeQuery = useQuery({
		queryKey: queryKeys.timesheet.reports.billableLogs({ ...rangeKey, namesTasks, notInvoiced: true }),
		queryFn: () => timeLogReportService.getBillableTimeLogs(range, relations, { notInvoiced: true, scope }),
		enabled: readsTime,
		staleTime: 0
	});
	// Every offered project (the client's, and those its saved lines bill) over the days the billed time is read in: a
	// member whose billed time sits in a widened day is named and priced too (the same read without saved lines)
	const membersRange = useMemo<TimeLogReportRange>(
		() => ({ from: allFrom, to: allTo, timeZone, projectIds: allProjectIds }),
		[allFrom, allProjectIds, allTo, timeZone]
	);
	const employeesQuery = useQuery({
		queryKey: queryKeys.timesheet.reports.owedAmounts({
			...rangeKey,
			from: allFrom.toISOString(),
			to: allTo.toISOString(),
			projectIds: allProjectIds,
			purpose: 'invoice'
		}),
		queryFn: () => timeLogReportService.getOwedAmountReport(membersRange),
		enabled: readsMembers
	});

	const projectIdSet = useMemo(() => new Set(projectIds), [projectIds]);
	const freeLogs = freeQuery.data ?? NO_LOGS;
	const freeEntries = useMemo(() => billableEntriesOf(freeLogs, projectIdSet), [freeLogs, projectIdSet]);
	const isFreeTimeEmpty = freeQuery.isSuccess && freeEntries.length === 0;
	// No free time left: all of the time tells a period already invoiced from one without billable time
	const checksInvoicedTime = readsTime && isFreeTimeEmpty;
	const readsAllTime = readsBilledTime || checksInvoicedTime;

	const allQuery = useQuery({
		queryKey: queryKeys.timesheet.reports.billableLogs({
			...rangeKey,
			from: allFrom.toISOString(),
			to: allTo.toISOString(),
			projectIds: allProjectIds,
			namesTasks,
			notInvoiced: false
		}),
		queryFn: () => timeLogReportService.getBillableTimeLogs(allRange, relations, { notInvoiced: false, scope }),
		enabled: readsAllTime,
		staleTime: 0
	});

	const allLogs = allQuery.data ?? NO_LOGS;
	const billedLineIds = billedLines.lineIds;
	const offeredLogs = useMemo(
		() => offeredLogsOf(freeLogs, allLogs, billedLineIds),
		[allLogs, billedLineIds, freeLogs]
	);
	const billedTimeByLine = useMemo(() => timeLogIdsByLineOf(allLogs, billedLineIds), [allLogs, billedLineIds]);
	const recordsBilledTime = useMemo(() => recordsBilledTimeOf([...freeLogs, ...allLogs]), [allLogs, freeLogs]);
	const periodLogs = useMemo(
		() => periodLogsOf(allLogs, from, to, hasBilledLines),
		[allLogs, from, hasBilledLines, to]
	);
	const allEntries = useMemo(() => billableEntriesOf(periodLogs, projectIdSet), [periodLogs, projectIdSet]);
	const hasInvoicedTime = recordsBilledTime === true && allEntries.length > 0;
	const isAllInvoiced = checksInvoicedTime && hasInvoicedTime;

	// Lines come from the time only once it is taken: the lines a saved invoice shows are its own.
	let logs = NO_LOGS;
	if (takesTime) {
		logs = offeredLogs;
	}
	const report = employeesQuery.data ?? NO_REPORT;
	// The saved lines' time stays priced and named on a project that left the client since
	const offeredProjectIdSet = useMemo(() => new Set(allProjectIds), [allProjectIds]);
	const offeredProjectsById = useMemo(
		() => offeredProjectsOf(organizationProjects, offeredProjectIdSet),
		[offeredProjectIdSet, organizationProjects]
	);
	const entries = useMemo(() => billableEntriesOf(logs, offeredProjectIdSet), [logs, offeredProjectIdSet]);
	const pricedProjectIds = useMemo(() => sortedIdsOf(entries.map((entry) => entry.projectId)), [entries]);

	const ratesStates = useQueries({
		queries: pricedProjectIds.map((projectId) => ({
			queryKey: queryKeys.rates.project(tenantId, organizationId, projectId),
			queryFn: () => rateService.getProjectRates(projectId),
			enabled: readsRates,
			retry: retriesRatesRead
		})),
		combine: projectRatesStatesOf
	});

	const ratesByProject = useMemo(() => {
		const byProject = new Map<string, TProjectRates | null>();
		ratesStates.forEach((state, index) => byProject.set(pricedProjectIds[index], state.rates));
		return byProject;
	}, [pricedProjectIds, ratesStates]);

	const employees = useMemo(() => employeesOfReport(report), [report]);

	const priceOf = useCallback(
		(projectId: string, employeeId: string) =>
			linePriceOf({
				employeeId,
				projectRates: ratesByProject.get(projectId),
				projectCurrency: offeredProjectsById.get(projectId)?.currency,
				employeeRate: employees.get(employeeId),
				organizationCurrency
			}),
		[employees, offeredProjectsById, organizationCurrency, ratesByProject]
	);

	const names = useMemo<InvoiceLineNames>(
		() => ({
			projectNames: namesOfMap(offeredProjectsById, (project) => project.name?.trim() ?? ''),
			memberNames: namesOfMap(employees, (employee) => employee.name),
			taskTitles: taskTitlesOf(logs),
			unnamedProject: labels.unnamedProject,
			unnamedMember: labels.unnamedMember,
			noTask: labels.noTask
		}),
		[employees, labels.noTask, labels.unnamedMember, labels.unnamedProject, logs, offeredProjectsById]
	);

	const time = useMemo(() => invoiceTimeOf({ entries, grouping, priceOf }), [entries, grouping, priceOf]);
	const lines = useMemo<NamedInvoiceLine[]>(
		() => namedLinesOf(time.lines, grouping, names),
		[grouping, names, time.lines]
	);
	const unpriced = useMemo<NamedUnpricedTime[]>(
		() =>
			time.unpriced.map((item) => ({
				...item,
				projectName: names.projectNames.get(item.projectId) ?? names.unnamedProject,
				memberName: names.memberNames.get(item.employeeId) ?? names.unnamedMember
			})),
		[names, time.unpriced]
	);

	const { isLoading, isError, isUpdating, isReadingBilledTime, hasBilledTimeFailed } = readStateOf({
		projects: {
			isLoaded: projectsQuery.isOrganizationProjectsLoaded,
			isError: projectsQuery.isOrganizationProjectsError
		},
		free: freeQuery,
		all: allQuery,
		employees: employeesQuery,
		rates: ratesStates,
		readsBilledTime,
		readsAllTime
	});

	const refetchProjects = projectsQuery.refetchOrganizationProjects;
	const refetchFreeLogs = freeQuery.refetch;
	const refetchAllLogs = allQuery.refetch;
	const refetchEmployees = employeesQuery.refetch;
	const refetch = useCallback(() => {
		void refetchProjects();
		if (readsTime) {
			void refetchFreeLogs();
		}
		if (readsMembers) {
			void refetchEmployees();
		}
		if (takesTime) {
			void queryClient.refetchQueries({ queryKey: queryKeys.rates.all, type: 'active' });
		}
		if (readsAllTime) {
			void refetchAllLogs();
		}
	}, [
		queryClient,
		readsAllTime,
		readsMembers,
		readsTime,
		refetchAllLogs,
		refetchEmployees,
		refetchFreeLogs,
		refetchProjects,
		takesTime
	]);

	return {
		hasProjects,
		lines,
		unpriced,
		isLoading,
		isError,
		isUpdating,
		refetch,
		/** The API records the time each invoice line bills; null until a time log was read. */
		recordsBilledTime,
		/** The time logs that name each line of the saved invoice, by line id. */
		billedTimeByLine,
		isReadingBilledTime,
		hasBilledTimeFailed,
		/** Every billable hour of the period is on an invoice: the period is not without billable time. */
		isAllInvoiced
	};
}
