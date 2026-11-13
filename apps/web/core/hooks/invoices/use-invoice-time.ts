'use client';

import { useCallback, useMemo } from 'react';
import { useQueries, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { endOfDay, startOfDay } from 'date-fns';
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

export function useInvoiceTime({
	clientId,
	period,
	grouping,
	labels
}: Readonly<{
	clientId: string | null;
	period: Period;
	grouping: InvoiceGrouping;
	labels: InvoiceTimeLabels;
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

	const from = useMemo(() => startOfDay(period.from), [period.from]);
	const to = useMemo(() => endOfDay(period.to), [period.to]);
	const range = useMemo<TimeLogReportRange>(
		() => ({ from, to, timeZone, projectIds }),
		[from, projectIds, timeZone, to]
	);
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
	// Without a project the API would answer the time of every project: the read never runs.
	const readsTime = hasScope && hasProjects;
	const namesTasks = grouping === 'task';
	let relations = NO_RELATIONS;
	if (namesTasks) {
		relations = TASK_RELATIONS;
	}

	const logsQuery = useQuery({
		queryKey: queryKeys.timesheet.reports.billableLogs({ ...rangeKey, namesTasks }),
		queryFn: () => timeLogReportService.getBillableTimeLogs(range, relations),
		enabled: readsTime
	});
	const employeesQuery = useQuery({
		queryKey: queryKeys.timesheet.reports.owedAmounts({ ...rangeKey, purpose: 'invoice' }),
		queryFn: () => timeLogReportService.getOwedAmountReport(range),
		enabled: readsTime
	});

	const logs = logsQuery.data ?? NO_LOGS;
	const report = employeesQuery.data ?? NO_REPORT;
	const projectIdSet = useMemo(() => new Set(projectIds), [projectIds]);
	const entries = useMemo(() => billableEntriesOf(logs, projectIdSet), [logs, projectIdSet]);
	const billedProjectIds = useMemo(() => sortedIdsOf(entries.map((entry) => entry.projectId)), [entries]);

	const ratesStates = useQueries({
		queries: billedProjectIds.map((projectId) => ({
			queryKey: queryKeys.rates.project(tenantId, organizationId, projectId),
			queryFn: () => rateService.getProjectRates(projectId),
			enabled: hasScope,
			retry: retriesRatesRead
		})),
		combine: projectRatesStatesOf
	});

	const ratesByProject = useMemo(() => {
		const byProject = new Map<string, TProjectRates | null>();
		ratesStates.forEach((state, index) => byProject.set(billedProjectIds[index], state.rates));
		return byProject;
	}, [billedProjectIds, ratesStates]);

	const employees = useMemo(() => employeesOfReport(report), [report]);

	const priceOf = useCallback(
		(projectId: string, employeeId: string) =>
			linePriceOf({
				employeeId,
				projectRates: ratesByProject.get(projectId),
				projectCurrency: clientProjectsById.get(projectId)?.currency,
				employeeRate: employees.get(employeeId),
				organizationCurrency
			}),
		[clientProjectsById, employees, organizationCurrency, ratesByProject]
	);

	const names = useMemo<InvoiceLineNames>(
		() => ({
			projectNames: namesOfMap(clientProjectsById, (project) => project.name?.trim() ?? ''),
			memberNames: namesOfMap(employees, (employee) => employee.name),
			taskTitles: taskTitlesOf(logs),
			unnamedProject: labels.unnamedProject,
			unnamedMember: labels.unnamedMember,
			noTask: labels.noTask
		}),
		[clientProjectsById, employees, labels.noTask, labels.unnamedMember, labels.unnamedProject, logs]
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

	const isReadingRates = ratesStates.some((state) => state.isLoading);
	const haveRatesFailed = ratesStates.some((state) => state.hasFailed);
	const isReadingTime = logsQuery.isLoading || employeesQuery.isLoading;
	const haveProjectsFailed = projectsQuery.isOrganizationProjectsError;
	// The projects read waits for the signed-in user: until it answered, "no project" is not known yet.
	const isReadingProjects = !projectsQuery.isOrganizationProjectsLoaded && !haveProjectsFailed;
	const hasTimeFailed = logsQuery.isError || employeesQuery.isError;
	const isReadingAny = isReadingProjects || isReadingTime;
	const isLoading = isReadingAny || isReadingRates;
	const hasReadFailed = haveProjectsFailed || hasTimeFailed;
	const isError = hasReadFailed || haveRatesFailed;
	const isRefreshingLogs = logsQuery.isFetching && !logsQuery.isLoading;
	const isRefreshingEmployees = employeesQuery.isFetching && !employeesQuery.isLoading;
	const isRefreshingRates = ratesStates.some((state) => state.isRefreshing);
	// A read again keeps showing its previous answer: the lines, their rates and their names can still change.
	const isUpdating = isRefreshingLogs || isRefreshingEmployees || isRefreshingRates;

	const refetchProjects = projectsQuery.refetchOrganizationProjects;
	const refetchLogs = logsQuery.refetch;
	const refetchEmployees = employeesQuery.refetch;
	const refetch = useCallback(() => {
		void refetchProjects();
		void refetchLogs();
		void refetchEmployees();
		void queryClient.refetchQueries({ queryKey: queryKeys.rates.all, type: 'active' });
	}, [queryClient, refetchEmployees, refetchLogs, refetchProjects]);

	return {
		hasProjects,
		lines,
		unpriced,
		isLoading,
		isError,
		isUpdating,
		refetch
	};
}
