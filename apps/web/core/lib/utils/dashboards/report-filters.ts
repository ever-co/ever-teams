import type { ITimeLogGroupedDailyReport } from '@/core/types/interfaces/activity/activity-report';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import type { TOrganizationProject } from '@/core/types/schemas';
import { NO_CLIENT_FILTER_VALUE, clientIdOf } from '@/core/lib/utils/project-list';

/** The report filters a link carries, each under a query parameter of its name. */
export type ReportUrlFilterField = 'clients' | 'billable' | 'labels';

const REPORT_URL_FILTER_FIELDS: ReadonlyArray<ReportUrlFilterField> = ['clients', 'billable', 'labels'];

export type ReportUrlFilters = Record<ReportUrlFilterField, string[]>;

/** The one value of the billable filter: without it a report counts all time. */
export const BILLABLE_ONLY_VALUE = 'true';

const VALUE_SEPARATOR = ',';

export function isReportUrlFilterField(field: string): field is ReportUrlFilterField {
	const fields: ReadonlyArray<string> = REPORT_URL_FILTER_FIELDS;
	return fields.includes(field);
}

function listParamOf(params: Pick<URLSearchParams, 'get'>, field: ReportUrlFilterField) {
	const value = params.get(field);
	if (!value) {
		return [];
	}
	const parts = value.split(VALUE_SEPARATOR);
	const values = parts.filter(Boolean);
	return [...new Set(values)];
}

function billableParamOf(params: Pick<URLSearchParams, 'get'>) {
	const value = params.get('billable');
	if (value === BILLABLE_ONLY_VALUE) {
		return [BILLABLE_ONLY_VALUE];
	}
	return [];
}

export function readReportUrlFilters(params: Pick<URLSearchParams, 'get'>): ReportUrlFilters {
	return {
		clients: listParamOf(params, 'clients'),
		billable: billableParamOf(params),
		labels: listParamOf(params, 'labels')
	};
}

/** Changes `params` in place: the caller builds the next link from a copy of the current one. */
export function writeReportUrlFilter(
	params: URLSearchParams,
	field: ReportUrlFilterField,
	values: ReadonlyArray<string>
) {
	if (values.length === 0) {
		params.delete(field);
		return;
	}
	params.set(field, values.join(VALUE_SEPARATOR));
}

export function clearReportUrlFilters(params: URLSearchParams) {
	for (const field of REPORT_URL_FILTER_FIELDS) {
		params.delete(field);
	}
}

export function isBillableOnly(values: ReadonlyArray<string>) {
	return values.includes(BILLABLE_ONLY_VALUE);
}

/** Each project's current client by project id, `null` for a project that has none. */
export type ProjectClientIds = ReadonlyMap<string, string | null>;

type ProjectWithClient = Pick<TOrganizationProject, 'id' | 'organizationContactId' | 'organizationContact'>;

export function projectClientIdsOf(projects: ReadonlyArray<ProjectWithClient>): Map<string, string | null> {
	const clientIds = new Map<string, string | null>();
	for (const project of projects) {
		clientIds.set(project.id, clientIdOf(project));
	}
	return clientIds;
}

/**
 * The client some time belongs to: the current client of its project, whenever the time was logged. The projects
 * the web lists come first, since they keep the id of a client that was archived; `statedClientId` is the client a
 * report names beside a project those lists do not hold. Time without a project, or on a project nothing names a
 * client for, has no client.
 */
export function clientIdOfTime(
	projectId: string | null | undefined,
	clientIds: ProjectClientIds,
	statedClientId: string | null = null
): string | null {
	if (!projectId) {
		return null;
	}
	const listedClientId = clientIds.get(projectId);
	if (listedClientId) {
		return listedClientId;
	}
	return statedClientId;
}

export function matchesPickedClients(clientId: string | null, picked: ReadonlyArray<string>) {
	if (picked.length === 0) {
		return true;
	}
	if (!clientId) {
		return picked.includes(NO_CLIENT_FILTER_VALUE);
	}
	return picked.includes(clientId);
}

export function logMatchesClients(log: ITimeLog, picked: ReadonlyArray<string>, clientIds: ProjectClientIds) {
	if (picked.length === 0) {
		return true;
	}
	const projectId = log.project?.id ?? log.projectId;
	const clientId = clientIdOfTime(projectId, clientIds);
	return matchesPickedClients(clientId, picked);
}

export function logMatchesBillable(log: ITimeLog, billableOnly: boolean) {
	if (!billableOnly) {
		return true;
	}
	return log.isBillable === true;
}

export interface ReportLabel {
	id: string;
	name: string;
	color: string | null;
}

/** The labels of the task a log was tracked on, as the time log request returns them with `task.tags`. */
function labelsOfLog(log: ITimeLog): ReportLabel[] {
	const tags = log.task?.tags ?? [];
	const labels: ReportLabel[] = [];
	for (const tag of tags) {
		if (!tag?.id) {
			continue;
		}
		labels.push({ id: tag.id, name: tag.name ?? '', color: tag.color ?? null });
	}
	return labels;
}

/** The labels carried by the tasks of some logs, each once, by name. */
export function labelsOfLogs(logs: ReadonlyArray<ITimeLog>): ReportLabel[] {
	const byId = new Map<string, ReportLabel>();
	for (const log of logs) {
		for (const label of labelsOfLog(log)) {
			if (!byId.has(label.id)) {
				byId.set(label.id, label);
			}
		}
	}
	const labels = [...byId.values()];
	labels.sort((first, second) => first.name.localeCompare(second.name, undefined, { sensitivity: 'base' }));
	return labels;
}

/** Time logged on a task that carries one of the picked labels; time without a task carries none. */
export function logMatchesLabels(log: ITimeLog, picked: ReadonlyArray<string>) {
	if (picked.length === 0) {
		return true;
	}
	const labels = labelsOfLog(log);
	return labels.some((label) => picked.includes(label.id));
}

/** A log the three filters keep: each filter narrows the others, a filter that holds nothing keeps every log. */
export function logMatchesReportFilters(log: ITimeLog, filters: ReportUrlFilters, clientIds: ProjectClientIds) {
	const matchesClients = logMatchesClients(log, filters.clients, clientIds);
	const matchesBillable = logMatchesBillable(log, isBillableOnly(filters.billable));
	const matchesLabels = logMatchesLabels(log, filters.labels);
	const checks = [matchesClients, matchesBillable, matchesLabels];
	return checks.every(Boolean);
}

export interface ReportClientChoice {
	id: string;
	name: string;
}

interface NamedClient {
	id: string;
	name?: string | null;
}

interface ProjectNamingClient {
	organizationContact?: NamedClient | null;
}

/**
 * The clients a report offers, by name: the active ones, and the ones only a project names when the viewer may not
 * read the clients list. The API leaves an archived client out of a project's relation, so those are active too.
 */
export function reportClientChoicesOf(
	activeClients: ReadonlyArray<NamedClient>,
	projects: ReadonlyArray<ProjectNamingClient>
): ReportClientChoice[] {
	const byId = new Map<string, ReportClientChoice>();
	const namedClients: Array<NamedClient | null | undefined> = [...activeClients];
	for (const project of projects) {
		namedClients.push(project.organizationContact);
	}
	for (const client of namedClients) {
		const id = client?.id;
		const name = client?.name;
		if (!id || !name) {
			continue;
		}
		if (!byId.has(id)) {
			byId.set(id, { id, name });
		}
	}
	const choices = [...byId.values()];
	choices.sort((first, second) => first.name.localeCompare(second.name, undefined, { sensitivity: 'base' }));
	return choices;
}

type ReportProjectLog = ITimeLogGroupedDailyReport['logs'][number];

function statedClientIdOf(project: ReportProjectLog['project'] | null | undefined) {
	const storedId = project?.organizationContactId;
	if (storedId) {
		return storedId;
	}
	return project?.organizationContact?.id ?? null;
}

function projectLogMatchesClients(
	projectLog: ReportProjectLog,
	picked: ReadonlyArray<string>,
	clientIds: ProjectClientIds
) {
	const project = projectLog?.project;
	const clientId = clientIdOfTime(project?.id, clientIds, statedClientIdOf(project));
	return matchesPickedClients(clientId, picked);
}

/**
 * The daily report without the projects of other clients. A project's time is kept or dropped whole, so the time,
 * the activity and the earnings of what stays are the API's own figures. Without a picked client the report is
 * returned as it is.
 */
export function filterDailyReportByClients(
	report: ITimeLogGroupedDailyReport[],
	picked: ReadonlyArray<string>,
	clientIds: ProjectClientIds
): ITimeLogGroupedDailyReport[] {
	if (picked.length === 0) {
		return report;
	}
	const days: ITimeLogGroupedDailyReport[] = [];
	for (const day of report) {
		const projectLogs = day?.logs ?? [];
		const logs = projectLogs.filter((projectLog) => projectLogMatchesClients(projectLog, picked, clientIds));
		if (logs.length > 0) {
			days.push({ ...day, logs });
		}
	}
	return days;
}
