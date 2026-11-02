import type { DateRange } from 'react-day-picker';
import type { TOrganizationProject } from '@/core/types/schemas';
import type { TTaskStatus } from '@/core/types/schemas/task/task-status.schema';
import type { TTask } from '@/core/types/schemas/task/task.schema';
import { projectBelongsToTeam, projectHasNoTeams } from '@/core/lib/helpers/type-guards';

export type ProjectScope = 'active' | 'archived';

/** The values already stored under `LAST_SELECTED_PROJECTS_VIEW` by the previous page. */
export type ProjectsView = 'LIST' | 'GRID';

export type ProjectGrouping = 'none' | 'status';

export type ProjectOrderField = 'name' | 'status' | 'startDate' | 'endDate' | 'createdAt';

/** Stored under `PROJECTS_TABLE_VIEW_LAST_SORTING` in the shape the previous table used (`[{ id, desc }]`). */
export interface ProjectOrdering {
	id: ProjectOrderField;
	desc: boolean;
}

export type ProjectColumn = 'status' | 'progress' | 'managers' | 'members' | 'teams' | 'dates' | 'budget';

export const PROJECT_COLUMNS: ProjectColumn[] = [
	'status',
	'progress',
	'managers',
	'members',
	'teams',
	'dates',
	'budget'
];

export type ProjectFilterField = 'teams' | 'members' | 'managers' | 'status' | 'budgetTypes';

export const PROJECT_FILTER_FIELDS: ProjectFilterField[] = ['teams', 'status', 'managers', 'members', 'budgetTypes'];

export type ProjectFilters = Record<ProjectFilterField, string[]>;

export const DATE_FROM_PARAM = 'dateFrom';
export const DATE_TO_PARAM = 'dateTo';
export const ARCHIVED_PARAM = 'archived';

export type ProjectMember = NonNullable<TOrganizationProject['members']>[number];

export interface ProjectPerson {
	id: string;
	name: string;
	imageUrl: string | null | undefined;
	email?: string | null;
}

export type TaskStatusCategory = 'todo' | 'started' | 'done';

export interface ProjectTaskStats {
	total: number;
	started: number;
	done: number;
	tasks: TTask[];
}

const EPOCH_YEAR = 1970;

const DONE_STATUS_NAMES = new Set(['done', 'completed', 'closed', 'cancelled', 'canceled']);

const STARTED_STATUS_NAMES = new Set([
	'in progress',
	'in review',
	'ready for review',
	'for testing',
	'testing',
	'blocked'
]);

/** Gauzy stores "no date" as the epoch, so a 1970 date reads as unset. */
export function realDateOf(date: string | Date | null | undefined): Date | null {
	if (!date) {
		return null;
	}
	const parsed = new Date(date);
	const isInvalid = Number.isNaN(parsed.getTime());
	if (isInvalid) {
		return null;
	}
	const year = parsed.getFullYear();
	const isEpoch = year === EPOCH_YEAR;
	if (isEpoch) {
		return null;
	}
	return parsed;
}

/** Status names arrive as `in-progress`, `In Progress` or `in progress` depending on the client that wrote them. */
export function normalizeStatusName(name: string | null | undefined) {
	if (!name) {
		return '';
	}
	const lowered = name.trim().toLowerCase();
	return lowered.replace(/[-_]+/g, ' ');
}

function splitParam(value: string | null) {
	if (!value) {
		return [];
	}
	return value.split(',').filter(Boolean);
}

export function urlWithParams(pathname: string, params: URLSearchParams) {
	const query = params.toString();
	if (!query) {
		return pathname;
	}
	return `${pathname}?${query}`;
}

export function readProjectFilters(params: URLSearchParams): ProjectFilters {
	return {
		teams: splitParam(params.get('teams')),
		members: splitParam(params.get('members')),
		managers: splitParam(params.get('managers')),
		status: splitParam(params.get('status')),
		budgetTypes: splitParam(params.get('budgetTypes'))
	};
}

export function readProjectDateRange(params: URLSearchParams): DateRange | undefined {
	const from = params.get(DATE_FROM_PARAM);
	const to = params.get(DATE_TO_PARAM);
	const hasFrom = Boolean(from);
	const hasTo = Boolean(to);
	const hasBothBounds = hasFrom && hasTo;
	if (!hasBothBounds) {
		return undefined;
	}
	return { from: new Date(from as string), to: new Date(to as string) };
}

export function countActiveFilterValues(filters: ProjectFilters) {
	let count = 0;
	for (const field of PROJECT_FILTER_FIELDS) {
		count += filters[field].length;
	}
	return count;
}

export function managersOf(project: Pick<TOrganizationProject, 'members'>): ProjectMember[] {
	const members = project.members ?? [];
	return members.filter((member) => member?.isManager);
}

/** The project's members who are not its managers, as the Gauzy UI and the previous page split them. */
export function contributorsOf(project: Pick<TOrganizationProject, 'members'>): ProjectMember[] {
	const members = project.members ?? [];
	return members.filter((member) => !member?.isManager);
}

export function personFromProjectMember(member: ProjectMember): ProjectPerson {
	const employee = member?.employee;
	const user = employee?.user;
	const name = employee?.fullName || user?.name || '';
	const id = member?.employeeId || member?.id || name;
	return { id, name, imageUrl: user?.imageUrl, email: user?.email };
}

export function isProjectVisibleInTeam(project: TOrganizationProject, activeTeamId: string | null | undefined) {
	if (!activeTeamId) {
		return true;
	}
	const belongsToTeam = projectBelongsToTeam(project, activeTeamId);
	if (belongsToTeam) {
		return true;
	}
	return projectHasNoTeams(project);
}

function endOfDay(date: Date) {
	const end = new Date(date);
	end.setHours(23, 59, 59, 999);
	return end;
}

function isWithin(date: Date, from: Date, to: Date) {
	const isAfterStart = date >= from;
	const isBeforeEnd = date <= to;
	return isAfterStart && isBeforeEnd;
}

/**
 * The rule of the previous page, kept: a project with both dates matches when its span overlaps the range, one with a
 * single date when that date falls inside it, one without dates by its creation day.
 */
export function projectMatchesDateRange(project: TOrganizationProject, range: DateRange | undefined) {
	const from = range?.from;
	const to = range?.to;
	if (!from || !to) {
		return true;
	}
	const rangeEnd = endOfDay(to);
	const start = realDateOf(project.startDate);
	const end = realDateOf(project.endDate);
	if (start && end) {
		const startsBeforeRangeEnds = start <= rangeEnd;
		const endsAfterRangeStarts = end >= from;
		return startsBeforeRangeEnds && endsAfterRangeStarts;
	}
	if (start) {
		return isWithin(start, from, rangeEnd);
	}
	if (end) {
		return isWithin(end, from, rangeEnd);
	}
	if (!project.createdAt) {
		return false;
	}
	const createdAt = new Date(project.createdAt);
	return isWithin(createdAt, from, rangeEnd);
}

export function projectMatchesSearch(project: TOrganizationProject, term: string) {
	const needle = term.trim().toLocaleLowerCase();
	if (!needle) {
		return true;
	}
	const name = project.name?.toLocaleLowerCase() ?? '';
	const code = project.code?.toLocaleLowerCase() ?? '';
	const nameMatches = name.includes(needle);
	const codeMatches = code.includes(needle);
	return nameMatches || codeMatches;
}

function hasAny(selected: string[], values: Array<string | null | undefined>) {
	return selected.some((value) => values.includes(value));
}

function matchesTeams(project: TOrganizationProject, teams: string[]) {
	if (teams.length === 0) {
		return true;
	}
	const teamIds = (project.teams ?? []).map((team) => team?.id);
	return hasAny(teams, teamIds);
}

function matchesManagers(project: TOrganizationProject, managers: string[]) {
	if (managers.length === 0) {
		return true;
	}
	const managerIds = managersOf(project).map((member) => member?.employeeId);
	return hasAny(managers, managerIds);
}

function matchesMembers(project: TOrganizationProject, members: string[]) {
	if (members.length === 0) {
		return true;
	}
	const memberIds = contributorsOf(project).map((member) => member?.employeeId);
	return hasAny(members, memberIds);
}

function statusNameOfFilterValue(value: string, statuses: TTaskStatus[]) {
	const statusById = statuses.find((candidate) => candidate.id === value);
	if (statusById) {
		return statusById.name;
	}
	return value;
}

/**
 * Status filter values are status names. Links written by the previous filter modal carry status ids, so an id is
 * read back through the statuses it names.
 */
function matchesStatus(project: TOrganizationProject, status: string[], statuses: TTaskStatus[]) {
	if (status.length === 0) {
		return true;
	}
	const projectStatus = normalizeStatusName(project.status);
	if (!projectStatus) {
		return false;
	}
	return status.some((value) => {
		const wantedName = statusNameOfFilterValue(value, statuses);
		const wantedStatus = normalizeStatusName(wantedName);
		return wantedStatus === projectStatus;
	});
}

function matchesBudgetTypes(project: TOrganizationProject, budgetTypes: string[]) {
	if (budgetTypes.length === 0) {
		return true;
	}
	if (!project.budgetType) {
		return false;
	}
	return budgetTypes.includes(project.budgetType);
}

export function projectMatchesFilters(project: TOrganizationProject, filters: ProjectFilters, statuses: TTaskStatus[]) {
	const checks = [
		matchesTeams(project, filters.teams),
		matchesManagers(project, filters.managers),
		matchesMembers(project, filters.members),
		matchesStatus(project, filters.status, statuses),
		matchesBudgetTypes(project, filters.budgetTypes)
	];
	return checks.every(Boolean);
}

function compareText(a: string | null | undefined, b: string | null | undefined) {
	const left = a ?? '';
	const right = b ?? '';
	return left.localeCompare(right, undefined, { sensitivity: 'base' });
}

function timeOf(date: string | Date | null | undefined) {
	const real = realDateOf(date);
	if (!real) {
		return null;
	}
	return real.getTime();
}

/** Unset dates sort last whatever the direction, so the projects that carry the value lead. */
function compareDates(a: string | Date | null | undefined, b: string | Date | null | undefined, desc: boolean) {
	const left = timeOf(a);
	const right = timeOf(b);
	if (left === null && right === null) {
		return 0;
	}
	if (left === null) {
		return 1;
	}
	if (right === null) {
		return -1;
	}
	const ascending = left - right;
	if (desc) {
		return -ascending;
	}
	return ascending;
}

function withDirection(result: number, desc: boolean) {
	if (desc) {
		return -result;
	}
	return result;
}

export function sortProjects(projects: TOrganizationProject[], ordering: ProjectOrdering) {
	const sorted = [...projects];
	sorted.sort((a, b) => {
		if (ordering.id === 'startDate') {
			return compareDates(a.startDate, b.startDate, ordering.desc);
		}
		if (ordering.id === 'endDate') {
			return compareDates(a.endDate, b.endDate, ordering.desc);
		}
		if (ordering.id === 'createdAt') {
			return compareDates(a.createdAt, b.createdAt, ordering.desc);
		}
		if (ordering.id === 'status') {
			return withDirection(compareText(a.status, b.status), ordering.desc);
		}
		return withDirection(compareText(a.name, b.name), ordering.desc);
	});
	return sorted;
}

export function findStatusByName(statuses: TTaskStatus[], name: string | null | undefined) {
	const wanted = normalizeStatusName(name);
	if (!wanted) {
		return undefined;
	}
	return statuses.find((status) => {
		const statusName = normalizeStatusName(status.name);
		const statusValue = normalizeStatusName(status.value);
		const nameMatches = statusName === wanted;
		const valueMatches = statusValue === wanted;
		return nameMatches || valueMatches;
	});
}

const NO_STATUS_KEY = '__none__';

export interface StatusGroup<T> {
	key: string;
	name: string | null;
	status: TTaskStatus | undefined;
	items: T[];
}

export type ProjectStatusGroup = StatusGroup<TOrganizationProject>;

function groupOrderOf<T>(group: StatusGroup<T>) {
	if (group.key === NO_STATUS_KEY) {
		return Number.MAX_SAFE_INTEGER;
	}
	return group.status?.order ?? Number.MAX_SAFE_INTEGER - 1;
}

export function groupByStatus<T>(
	items: T[],
	statusNameOf: (item: T) => string | null | undefined,
	statuses: TTaskStatus[]
) {
	const groups = new Map<string, StatusGroup<T>>();
	for (const item of items) {
		const name = statusNameOf(item) ?? null;
		const normalized = normalizeStatusName(name);
		const key = normalized || NO_STATUS_KEY;
		const existing = groups.get(key);
		if (existing) {
			existing.items.push(item);
			continue;
		}
		groups.set(key, { key, name, status: findStatusByName(statuses, name), items: [item] });
	}
	const ordered = [...groups.values()];
	ordered.sort((a, b) => groupOrderOf(a) - groupOrderOf(b));
	return ordered;
}

export function groupProjectsByStatus(projects: TOrganizationProject[], statuses: TTaskStatus[]) {
	return groupByStatus(projects, (project) => project.status, statuses);
}

/** The status as people read it; `fallback` names a project or task that has none. */
export function statusLabelOf(statusName: string | null | undefined, fallback: string) {
	const label = normalizeStatusName(statusName);
	if (!label) {
		return fallback;
	}
	return label;
}

export function statusCategoryOf(statusName: string | null | undefined, statuses: TTaskStatus[]): TaskStatusCategory {
	const status = findStatusByName(statuses, statusName);
	if (status?.isDone) {
		return 'done';
	}
	if (status?.isInProgress) {
		return 'started';
	}
	const normalized = normalizeStatusName(statusName);
	if (DONE_STATUS_NAMES.has(normalized)) {
		return 'done';
	}
	if (STARTED_STATUS_NAMES.has(normalized)) {
		return 'started';
	}
	return 'todo';
}

function emptyStats(): ProjectTaskStats {
	return { total: 0, started: 0, done: 0, tasks: [] };
}

export function buildProjectTaskStats(tasks: TTask[], statuses: TTaskStatus[]) {
	const statsByProject = new Map<string, ProjectTaskStats>();
	for (const task of tasks) {
		const projectId = task.projectId;
		if (!projectId) {
			continue;
		}
		const stats = statsByProject.get(projectId) ?? emptyStats();
		const category = statusCategoryOf(task.status, statuses);
		stats.total += 1;
		stats.tasks.push(task);
		if (category === 'done') {
			stats.done += 1;
		}
		if (category === 'started') {
			stats.started += 1;
		}
		statsByProject.set(projectId, stats);
	}
	return statsByProject;
}

export function completionPercentOf(stats: Pick<ProjectTaskStats, 'total' | 'done'>) {
	if (stats.total === 0) {
		return 0;
	}
	return Math.round((stats.done / stats.total) * 100);
}

/** Rich text descriptions shown as one plain line; React escapes the result. */
export function plainTextOf(html: string | null | undefined) {
	if (!html) {
		return '';
	}
	const withoutTags = html.replace(/<[^>]*>/g, ' ');
	const decoded = withoutTags
		.replace(/&nbsp;/g, ' ')
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'");
	return decoded.replace(/\s+/g, ' ').trim();
}

interface ProjectContact {
	name?: string | null;
}

/** The client: Gauzy returns it under the `organizationContact` relation, kept by the schema's passthrough. */
export function clientNameOf(project: TOrganizationProject) {
	const contact = (project as { organizationContact?: ProjectContact | null }).organizationContact;
	return contact?.name ?? null;
}
