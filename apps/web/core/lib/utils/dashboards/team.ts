import { isAfter, isWithinInterval, startOfDay, startOfMonth, startOfWeek } from 'date-fns';
import {
	activityPercentOf,
	type DailyReportRow,
	type DailyReportTask,
	type FigureTotals,
	type GroupSummary,
	groupRowsBy,
	isNoProjectKey,
	projectKeyOf,
	tasksOf
} from '@/core/lib/utils/daily-report-figures';
import { getReportMemberIds } from '@/core/hooks/activities/use-activity-filters';
import { localDayKeyOf } from '@/core/lib/utils/dashboard-export';
import { percentOf, shareRowsOf, type ShareRow, type TimeAxis } from '@/core/lib/utils/dashboard-figures';
import { daysOfPeriod, type Period, type WeekStart } from '@/core/lib/utils/dashboard-period';
import { getDailyPlanDay } from '@/core/lib/helpers/daily-plan-day';
import { statusIdOf } from '@/core/lib/utils/kanban-board';
import { isDoneStatus, normalizedText, taskNumberLabel } from '@/core/lib/utils/team-tasks-view';
import { ERoleName } from '@/core/types/generics/enums/role';
import { ETimerStatus } from '@/core/types/generics/enums/timer';
import type { ITimeLogGroupedDailyReport } from '@/core/types/interfaces/activity/activity-report';
import type { TOrganizationTeam, TTaskStatus } from '@/core/types/schemas';
import type { TDailyPlan } from '@/core/types/schemas/task/daily-plan.schema';
import type { TTask } from '@/core/types/schemas/task/task.schema';

/** Weeks start on Monday on this dashboard, as its previous date picker did. */
export const TEAM_WEEK_STARTS_ON: WeekStart = 1;

export type TeamFigureKey = 'tracked' | 'activity' | 'members' | 'projects';
export type TeamTableView = 'member' | 'day';
export type ChartGranularity = 'day' | 'week' | 'month';
export type TeamSortKey = 'name' | 'tracked' | 'activity' | 'count' | 'projects' | 'share';
export type SortDirection = 'asc' | 'desc';
export type TeamFilterField = 'teams' | 'members';

export interface TeamSort {
	key: TeamSortKey;
	direction: SortDirection;
}

export const DEFAULT_TEAM_SORTS: Record<TeamTableView, TeamSort> = {
	member: { key: 'tracked', direction: 'desc' },
	day: { key: 'name', direction: 'desc' }
};

const REGROUPABLE_PERIOD_DAYS = 14;

const ORGANIZATION_WIDE_ROLES: ReadonlyArray<string> = [ERoleName.SUPER_ADMIN, ERoleName.ADMIN, ERoleName.MANAGER];

export function isOrganizationWideRole(roleName: string | null | undefined) {
	const normalizedName = roleName?.toUpperCase() ?? '';
	return ORGANIZATION_WIDE_ROLES.includes(normalizedName);
}

export interface TeamPerson {
	employeeId: string;
	name: string;
	imageUrl: string | null;
}

interface TeamMemberEmployee {
	id?: string | null;
	fullName?: string | null;
	user?: { name?: string | null; imageUrl?: string | null } | null;
}

function personOfTeamMember(member: NonNullable<TOrganizationTeam['members']>[number]): TeamPerson | null {
	const employee: TeamMemberEmployee | null | undefined = member?.employee;
	const employeeId = employee?.id ?? member?.employeeId;
	if (!employeeId) {
		return null;
	}
	const fullName = employee?.fullName?.trim();
	const userName = employee?.user?.name?.trim();
	const name = fullName || userName || '';
	return { employeeId, name, imageUrl: employee?.user?.imageUrl ?? null };
}

function teamsWithIds(teams: ReadonlyArray<TOrganizationTeam>, teamIds: ReadonlyArray<string>) {
	if (teamIds.length === 0) {
		return teams;
	}
	return teams.filter((team) => teamIds.includes(team.id ?? ''));
}

/** The members of the given teams (all of them when no id is given), once each, by name. */
export function membersOfTeams(
	teams: ReadonlyArray<TOrganizationTeam>,
	teamIds: ReadonlyArray<string> = []
): TeamPerson[] {
	const people = new Map<string, TeamPerson>();
	for (const team of teamsWithIds(teams, teamIds)) {
		for (const member of team.members ?? []) {
			const person = personOfTeamMember(member);
			if (!person) {
				continue;
			}
			people.set(person.employeeId, person);
		}
	}
	const sorted = [...people.values()];
	sorted.sort((first, second) => first.name.localeCompare(second.name));
	return sorted;
}

export interface TeamReportScope {
	teamIds: string[];
	employeeIds: string[];
}

export interface TeamReportScopeInput {
	isManage: boolean;
	isOrganizationWide: boolean;
	pickedTeamIds: string[];
	pickedMemberIds: string[];
	pageTeamId: string | null;
	managedTeams: ReadonlyArray<TOrganizationTeam>;
	ownEmployeeIds: string[];
}

function requestedTeamIdsOf(pickedTeamIds: string[], pageTeamId: string | null) {
	if (pickedTeamIds.length > 0) {
		return pickedTeamIds;
	}
	if (pageTeamId) {
		return [pageTeamId];
	}
	return [];
}

function managesEveryTeam(teamIds: ReadonlyArray<string>, managedTeams: ReadonlyArray<TOrganizationTeam>) {
	if (teamIds.length === 0) {
		return false;
	}
	return teamIds.every((teamId) => managedTeams.some((team) => team.id === teamId));
}

/**
 * Who the daily report covers. Gauzy's daily report narrows a caller without CHANGE_SELECTED_EMPLOYEE to their own
 * logs unless the request names employees they manage, while the counts endpoint resolves a manager's members from
 * the team alone. A team manager therefore sends the members of the teams the counts are scoped to, so the rows and
 * the figures above them describe the same people.
 */
export function teamReportScopeOf(input: TeamReportScopeInput): TeamReportScope {
	if (!input.isManage) {
		return { teamIds: input.pickedTeamIds, employeeIds: input.ownEmployeeIds };
	}
	const pickedScope = { teamIds: input.pickedTeamIds, employeeIds: input.pickedMemberIds };
	if (input.isOrganizationWide) {
		return pickedScope;
	}
	const requestedTeamIds = requestedTeamIdsOf(input.pickedTeamIds, input.pageTeamId);
	const isTeamScoped = managesEveryTeam(requestedTeamIds, input.managedTeams);
	if (!isTeamScoped) {
		return pickedScope;
	}
	const hasPickedMembers = input.pickedMemberIds.length > 0;
	if (hasPickedMembers) {
		return { teamIds: requestedTeamIds, employeeIds: input.pickedMemberIds };
	}
	const managedTeams = [...input.managedTeams];
	const employeeIds = getReportMemberIds(managedTeams, requestedTeamIds);
	return { teamIds: requestedTeamIds, employeeIds };
}

export interface MemberDay {
	key: string;
	dateKey: string;
	seconds: number;
	activity: number;
	projectCount: number;
	/** Share of the member's time over the period. */
	share: number;
}

export interface MemberSummary {
	key: string;
	name: string;
	imageUrl: string | null;
	seconds: number;
	activity: number;
	dayCount: number;
	projectCount: number;
	/** Share of the team's time over the period. */
	share: number;
	days: MemberDay[];
	tasks: DailyReportTask[];
}

export interface DayMember {
	key: string;
	name: string;
	imageUrl: string | null;
	seconds: number;
	activity: number;
	projectCount: number;
	/** Share of the day's time. */
	share: number;
}

export interface DaySummary {
	key: string;
	dateKey: string;
	seconds: number;
	activity: number;
	memberCount: number;
	projectCount: number;
	/** Share of the team's time over the period. */
	share: number;
	members: DayMember[];
}

export interface TeamTotals {
	seconds: number;
	activity: number;
	memberCount: number;
	dayCount: number;
	projectCount: number;
}

function distinctCount(rows: ReadonlyArray<DailyReportRow>, valueOf: (row: DailyReportRow) => string) {
	const values = new Set<string>();
	for (const row of rows) {
		values.add(valueOf(row));
	}
	return values.size;
}

function dateKeyOf(row: DailyReportRow) {
	return row.dateKey;
}

function employeeKeyOf(row: DailyReportRow) {
	return row.employeeId;
}

function firstRowOf(rows: ReadonlyArray<DailyReportRow>) {
	return rows[0];
}

function activityOf(totals: FigureTotals) {
	return activityPercentOf(totals);
}

function memberDaysOf(rows: ReadonlyArray<DailyReportRow>, memberSeconds: number): MemberDay[] {
	const days = groupRowsBy(rows, dateKeyOf);
	return days.map((day) => ({
		key: day.key,
		dateKey: day.key,
		seconds: day.seconds,
		activity: activityOf(day),
		projectCount: distinctCount(day.rows, projectKeyOf),
		share: percentOf(day.seconds, memberSeconds)
	}));
}

export function memberSummariesOf(rows: ReadonlyArray<DailyReportRow>, totalSeconds: number): MemberSummary[] {
	const members = groupRowsBy(rows, employeeKeyOf);
	return members.map((member) => {
		const first = firstRowOf(member.rows);
		const days = memberDaysOf(member.rows, member.seconds);
		days.sort((firstDay, secondDay) => secondDay.dateKey.localeCompare(firstDay.dateKey));
		return {
			key: member.key,
			name: first?.employeeName ?? '',
			imageUrl: first?.employeeImageUrl ?? null,
			seconds: member.seconds,
			activity: activityOf(member),
			dayCount: days.length,
			projectCount: distinctCount(member.rows, projectKeyOf),
			share: percentOf(member.seconds, totalSeconds),
			days,
			tasks: tasksOf(member.rows)
		};
	});
}

function dayMembersOf(rows: ReadonlyArray<DailyReportRow>, daySeconds: number): DayMember[] {
	const members = groupRowsBy(rows, employeeKeyOf);
	return members.map((member) => {
		const first = firstRowOf(member.rows);
		return {
			key: member.key,
			name: first?.employeeName ?? '',
			imageUrl: first?.employeeImageUrl ?? null,
			seconds: member.seconds,
			activity: activityOf(member),
			projectCount: distinctCount(member.rows, projectKeyOf),
			share: percentOf(member.seconds, daySeconds)
		};
	});
}

export function daySummariesOf(rows: ReadonlyArray<DailyReportRow>, totalSeconds: number): DaySummary[] {
	const days = groupRowsBy(rows, dateKeyOf);
	return days.map((day) => ({
		key: day.key,
		dateKey: day.key,
		seconds: day.seconds,
		activity: activityOf(day),
		memberCount: distinctCount(day.rows, employeeKeyOf),
		projectCount: distinctCount(day.rows, projectKeyOf),
		share: percentOf(day.seconds, totalSeconds),
		members: dayMembersOf(day.rows, day.seconds)
	}));
}

export function teamTotalsOf(rows: ReadonlyArray<DailyReportRow>): TeamTotals {
	let seconds = 0;
	let activeSeconds = 0;
	for (const row of rows) {
		seconds += row.seconds;
		activeSeconds += row.activeSeconds;
	}
	return {
		seconds,
		activity: activityPercentOf({ seconds, activeSeconds }),
		memberCount: distinctCount(rows, employeeKeyOf),
		dayCount: distinctCount(rows, dateKeyOf),
		projectCount: distinctCount(rows, projectKeyOf)
	};
}

type SortValue = number | string;

function compareValues(first: SortValue, second: SortValue) {
	const bothText = typeof first === 'string' && typeof second === 'string';
	if (bothText) {
		return first.localeCompare(second);
	}
	return Number(first) - Number(second);
}

function directionFactorOf(direction: SortDirection) {
	if (direction === 'asc') {
		return 1;
	}
	return -1;
}

function flippedDirectionOf(direction: SortDirection): SortDirection {
	if (direction === 'asc') {
		return 'desc';
	}
	return 'asc';
}

export function sortedBy<T>(
	items: ReadonlyArray<T>,
	sort: TeamSort,
	valueOf: (item: T, key: TeamSortKey) => SortValue
): T[] {
	const factor = directionFactorOf(sort.direction);
	const sorted = [...items];
	sorted.sort((first, second) => {
		const difference = compareValues(valueOf(first, sort.key), valueOf(second, sort.key));
		return difference * factor;
	});
	return sorted;
}

export function memberSortValueOf(member: MemberSummary, key: TeamSortKey): SortValue {
	switch (key) {
		case 'name':
			return member.name.toLocaleLowerCase();
		case 'activity':
			return member.activity;
		case 'count':
			return member.dayCount;
		case 'projects':
			return member.projectCount;
		default:
			return member.seconds;
	}
}

export function daySortValueOf(day: DaySummary, key: TeamSortKey): SortValue {
	switch (key) {
		case 'name':
			return day.dateKey;
		case 'activity':
			return day.activity;
		case 'count':
			return day.memberCount;
		case 'projects':
			return day.projectCount;
		default:
			return day.seconds;
	}
}

function firstDirectionOf(key: TeamSortKey, view: TeamTableView): SortDirection {
	const isName = key === 'name';
	const isMemberView = view === 'member';
	if (isName && isMemberView) {
		return 'asc';
	}
	return 'desc';
}

/** A click on the sorted column flips it; a click on another column starts with its natural order. */
export function nextSortOf(current: TeamSort, key: TeamSortKey, view: TeamTableView): TeamSort {
	if (current.key === key) {
		return { key, direction: flippedDirectionOf(current.direction) };
	}
	return { key, direction: firstDirectionOf(key, view) };
}

export interface ProjectShareItem {
	key: string;
	name: string | null;
	imageUrl: string | null;
	color: string | null;
	isNoProject: boolean;
	seconds: number;
}

const LEADING_PROJECTS = 4;

function projectItemOf(project: GroupSummary): ProjectShareItem {
	const first = firstRowOf(project.rows);
	return {
		key: project.key,
		name: first?.projectName ?? null,
		imageUrl: first?.projectImageUrl ?? null,
		color: first?.projectColor ?? null,
		isNoProject: isNoProjectKey(project.key),
		seconds: project.seconds
	};
}

export function projectSharesOf(
	rows: ReadonlyArray<DailyReportRow>,
	leadingCount = LEADING_PROJECTS
): ShareRow<ProjectShareItem>[] {
	const projects = groupRowsBy(rows, projectKeyOf);
	const items = projects.map(projectItemOf);
	return shareRowsOf(
		items,
		(item) => item.seconds,
		(item) => item.key,
		leadingCount
	);
}

export interface ChartBucket {
	key: string;
	/** The calendar start of the bucket (the Monday of a week, the 1st of a month), for its label. */
	start: Date;
	seconds: number;
	activeSeconds: number;
	memberCount: number;
	projectCount: number;
	isToday: boolean;
	isFuture: boolean;
}

interface BucketDraft {
	key: string;
	start: Date;
	firstDay: Date;
	lastDay: Date;
	seconds: number;
	activeSeconds: number;
	members: Set<string>;
	projects: Set<string>;
}

function bucketStartOf(day: Date, granularity: ChartGranularity) {
	if (granularity === 'week') {
		return startOfWeek(day, { weekStartsOn: TEAM_WEEK_STARTS_ON });
	}
	if (granularity === 'month') {
		return startOfMonth(day);
	}
	return day;
}

function emptyBucketOf(key: string, start: Date, day: Date): BucketDraft {
	return {
		key,
		start,
		firstDay: day,
		lastDay: day,
		seconds: 0,
		activeSeconds: 0,
		members: new Set<string>(),
		projects: new Set<string>()
	};
}

function finishedBucketOf(draft: BucketDraft, today: Date): ChartBucket {
	const isToday = isWithinInterval(today, { start: draft.firstDay, end: draft.lastDay });
	return {
		key: draft.key,
		start: draft.start,
		seconds: draft.seconds,
		activeSeconds: draft.activeSeconds,
		memberCount: draft.members.size,
		projectCount: draft.projects.size,
		isToday,
		isFuture: isAfter(draft.firstDay, today)
	};
}

/**
 * The period cut into days, weeks or months. Every slot of the period exists, worked or not, so the chart keeps its
 * width; members and projects are counted once per slot, not once per day.
 */
export function chartBucketsOf(
	rows: ReadonlyArray<DailyReportRow>,
	period: Period,
	granularity: ChartGranularity,
	now = new Date()
): ChartBucket[] {
	const today = startOfDay(now);
	const drafts = new Map<string, BucketDraft>();
	const bucketKeyByDay = new Map<string, string>();
	for (const day of daysOfPeriod(period)) {
		const start = bucketStartOf(day, granularity);
		const key = localDayKeyOf(start);
		bucketKeyByDay.set(localDayKeyOf(day), key);
		const existing = drafts.get(key);
		if (existing) {
			existing.lastDay = day;
			continue;
		}
		drafts.set(key, emptyBucketOf(key, start, day));
	}
	for (const row of rows) {
		const bucketKey = bucketKeyByDay.get(row.dateKey) ?? '';
		const draft = drafts.get(bucketKey);
		if (!draft) {
			continue;
		}
		draft.seconds += row.seconds;
		draft.activeSeconds += row.activeSeconds;
		draft.members.add(row.employeeId);
		draft.projects.add(projectKeyOf(row));
	}
	return [...drafts.values()].map((draft) => finishedBucketOf(draft, today));
}

export function periodAllowsRegrouping(periodDays: number) {
	return periodDays > REGROUPABLE_PERIOD_DAYS;
}

/** Month slots are offered only when the period reaches into a second month. */
export function periodSpansMonths(period: Period) {
	const startMonth = startOfMonth(period.from).getTime();
	const endMonth = startOfMonth(period.to).getTime();
	return startMonth !== endMonth;
}

export function chartValueOf(bucket: ChartBucket, figure: TeamFigureKey) {
	switch (figure) {
		case 'activity':
			return activityPercentOf(bucket);
		case 'members':
			return bucket.memberCount;
		case 'projects':
			return bucket.projectCount;
		default:
			return bucket.seconds;
	}
}

export const PERCENT_AXIS: TimeAxis = { max: 100, ticks: [0, 50, 100] };

const COUNT_STEPS = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000];
const MAX_COUNT_TICKS = 4;

/** Whole numbers only: a count axis never shows "2.5 members". */
export function countAxisOf(maxValue: number): TimeAxis {
	const safeMax = Math.max(maxValue, 1);
	const fittingStep = COUNT_STEPS.find((step) => safeMax <= step * MAX_COUNT_TICKS);
	const step = fittingStep ?? Math.ceil(safeMax / MAX_COUNT_TICKS);
	const tickCount = Math.ceil(safeMax / step);
	const ticks: number[] = [];
	for (let index = 0; index <= tickCount; index += 1) {
		ticks.push(index * step);
	}
	const max = ticks[ticks.length - 1];
	return { max, ticks };
}

/** `6:05`, the hours and minutes a spreadsheet reads as a duration. */
export function formatHoursMinutes(seconds: number) {
	const safeSeconds = Math.max(0, Math.round(seconds || 0));
	const hours = Math.floor(safeSeconds / 3600);
	const minutes = Math.floor((safeSeconds % 3600) / 60);
	const paddedMinutes = String(minutes).padStart(2, '0');
	return `${hours}:${paddedMinutes}`;
}

function exportOrderOf(first: DailyReportRow, second: DailyReportRow) {
	const byDate = first.dateKey.localeCompare(second.dateKey);
	if (byDate !== 0) {
		return byDate;
	}
	const byMember = first.employeeName.localeCompare(second.employeeName);
	if (byMember !== 0) {
		return byMember;
	}
	const firstProject = first.projectName ?? '';
	const secondProject = second.projectName ?? '';
	return firstProject.localeCompare(secondProject);
}

export function exportRowsOf(rows: ReadonlyArray<DailyReportRow>): DailyReportRow[] {
	const sorted = [...rows];
	sorted.sort(exportOrderOf);
	return sorted;
}

export function rowActivityOf(row: DailyReportRow) {
	return activityPercentOf(row);
}

/** `2026-11-02` read as that calendar day in the reader's time zone. */
export function localDateOfKey(dateKey: string) {
	const [year, month, day] = dateKey.split('-').map(Number);
	const monthIndex = (month || 1) - 1;
	const dayOfMonth = day || 1;
	return new Date(year, monthIndex, dayOfMonth);
}

export const OTHER_SERIES_KEY = 'other-projects';

const LEADING_SERIES_COUNT = 5;

/**
 * How a series is painted: a project keeps its own colour unless a larger project already wears it (two layers in
 * one hue would read as one), a project without a free colour takes the next step of the brand ramp, time without a
 * project and the merged rest stay neutral.
 */
export type SeriesPaint =
	| { kind: 'project'; color: string }
	| { kind: 'ramp'; step: number }
	| { kind: 'noProject' }
	| { kind: 'other' };

export interface ProjectSeries {
	key: string;
	item: ProjectShareItem | null;
	isOther: boolean;
	otherCount: number;
	seconds: number;
	share: number;
	paint: SeriesPaint;
}

interface PaintState {
	takenColors: Set<string>;
	nextRampStep: number;
}

function normalizedColorOf(color: string | null) {
	const trimmed = color?.trim().toLowerCase() ?? '';
	if (trimmed === 'transparent') {
		return '';
	}
	return trimmed;
}

function rampPaintOf(state: PaintState): SeriesPaint {
	const step = state.nextRampStep;
	state.nextRampStep += 1;
	return { kind: 'ramp', step };
}

function paintOf(row: ShareRow<ProjectShareItem>, state: PaintState): SeriesPaint {
	if (row.isOther) {
		return { kind: 'other' };
	}
	const item = row.item;
	if (!item) {
		return { kind: 'other' };
	}
	if (item.isNoProject) {
		return { kind: 'noProject' };
	}
	const color = normalizedColorOf(item.color);
	const hasColor = color !== '';
	const isColorFree = hasColor && !state.takenColors.has(color);
	if (!isColorFree) {
		return rampPaintOf(state);
	}
	state.takenColors.add(color);
	return { kind: 'project', color };
}

function seriesKeyOfShareRow(row: ShareRow<ProjectShareItem>) {
	if (row.isOther) {
		return OTHER_SERIES_KEY;
	}
	return row.key;
}

/** Largest first: the stack draws its layers and the legend lists its rows in this order. */
export function projectSeriesOf(rows: ReadonlyArray<DailyReportRow>): ProjectSeries[] {
	const shareRows = projectSharesOf(rows, LEADING_SERIES_COUNT);
	const state: PaintState = { takenColors: new Set<string>(), nextRampStep: 0 };
	return shareRows.map((row) => ({
		key: seriesKeyOfShareRow(row),
		item: row.item,
		isOther: row.isOther,
		otherCount: row.otherCount,
		seconds: row.value,
		share: row.share,
		paint: paintOf(row, state)
	}));
}

function leadingSeriesKeysOf(series: ReadonlyArray<ProjectSeries>) {
	const keys = new Set<string>();
	for (const entry of series) {
		if (entry.isOther) {
			continue;
		}
		keys.add(entry.key);
	}
	return keys;
}

function seriesKeyOfRow(row: DailyReportRow, leadingKeys: ReadonlySet<string>) {
	const projectKey = projectKeyOf(row);
	if (leadingKeys.has(projectKey)) {
		return projectKey;
	}
	return OTHER_SERIES_KEY;
}

/** The slot a worked day falls in, keyed like `chartBucketsOf` keys its buckets. */
function bucketKeyOfDay(dateKey: string, granularity: ChartGranularity) {
	const day = localDateOfKey(dateKey);
	const start = bucketStartOf(day, granularity);
	return localDayKeyOf(start);
}

export interface ColumnStack {
	key: string;
	bucket: ChartBucket;
	values: Record<string, number>;
}

function stacksBy(
	rows: ReadonlyArray<DailyReportRow>,
	buckets: ReadonlyArray<ChartBucket>,
	granularity: ChartGranularity,
	seriesKeyOf: (row: DailyReportRow) => string
): ColumnStack[] {
	const stacks = new Map<string, ColumnStack>();
	for (const bucket of buckets) {
		stacks.set(bucket.key, { key: bucket.key, bucket, values: {} });
	}
	for (const row of rows) {
		const bucketKey = bucketKeyOfDay(row.dateKey, granularity);
		const stack = stacks.get(bucketKey);
		if (!stack) {
			continue;
		}
		const seriesKey = seriesKeyOf(row);
		const current = stack.values[seriesKey] ?? 0;
		stack.values[seriesKey] = current + row.seconds;
	}
	return [...stacks.values()];
}

export function columnStacksOf(
	rows: ReadonlyArray<DailyReportRow>,
	buckets: ReadonlyArray<ChartBucket>,
	granularity: ChartGranularity,
	series: ReadonlyArray<ProjectSeries>
): ColumnStack[] {
	const leadingKeys = leadingSeriesKeysOf(series);
	return stacksBy(rows, buckets, granularity, (row) => seriesKeyOfRow(row, leadingKeys));
}

export function seriesValueOf(stack: ColumnStack, seriesKey: string) {
	return stack.values[seriesKey] ?? 0;
}

export function stackTotalOf(stack: ColumnStack) {
	return stack.bucket.seconds;
}

export function highestStackSecondsOf(stacks: ReadonlyArray<ColumnStack>) {
	let highest = 0;
	for (const stack of stacks) {
		highest = Math.max(highest, stackTotalOf(stack));
	}
	return highest;
}

export interface StripColumn {
	key: string;
	start: Date;
	seconds: number;
	isToday: boolean;
	isFuture: boolean;
}

function stripColumnsOf(
	memberRows: ReadonlyArray<DailyReportRow>,
	buckets: ReadonlyArray<ChartBucket>,
	granularity: ChartGranularity
): StripColumn[] {
	const secondsByBucket = new Map<string, number>();
	for (const row of memberRows) {
		const bucketKey = bucketKeyOfDay(row.dateKey, granularity);
		const current = secondsByBucket.get(bucketKey) ?? 0;
		secondsByBucket.set(bucketKey, current + row.seconds);
	}
	return buckets.map((bucket) => ({
		key: bucket.key,
		start: bucket.start,
		seconds: secondsByBucket.get(bucket.key) ?? 0,
		isToday: bucket.isToday,
		isFuture: bucket.isFuture
	}));
}

function peakColumnKeyOf(columns: ReadonlyArray<StripColumn>) {
	let peak: StripColumn | null = null;
	for (const column of columns) {
		const peakSeconds = peak?.seconds ?? 0;
		const isHigher = column.seconds > peakSeconds;
		if (isHigher) {
			peak = column;
		}
	}
	return peak?.key ?? null;
}

function topProjectOf(memberRows: ReadonlyArray<DailyReportRow>): ProjectShareItem | null {
	const projects = groupRowsBy(memberRows, projectKeyOf);
	const top = projects[0];
	if (!top) {
		return null;
	}
	return projectItemOf(top);
}

function rowsByEmployeeOf(rows: ReadonlyArray<DailyReportRow>) {
	const groups = new Map<string, DailyReportRow[]>();
	for (const row of rows) {
		const group = groups.get(row.employeeId) ?? [];
		group.push(row);
		groups.set(row.employeeId, group);
	}
	return groups;
}

export interface RosterMember {
	summary: MemberSummary;
	columns: StripColumn[];
	peakColumnKey: string | null;
	topProject: ProjectShareItem | null;
	/** The timesheet route takes a user id; null when neither the report nor the teams carry it. */
	userId: string | null;
}

export function rosterMembersOf(
	rows: ReadonlyArray<DailyReportRow>,
	members: ReadonlyArray<MemberSummary>,
	buckets: ReadonlyArray<ChartBucket>,
	granularity: ChartGranularity,
	userIds: ReadonlyMap<string, string>
): RosterMember[] {
	const rowsByEmployee = rowsByEmployeeOf(rows);
	return members.map((summary) => {
		const memberRows = rowsByEmployee.get(summary.key) ?? [];
		const columns = stripColumnsOf(memberRows, buckets, granularity);
		const peakColumnKey = peakColumnKeyOf(columns);
		const topProject = topProjectOf(memberRows);
		const userId = userIds.get(summary.key) ?? null;
		return { summary, columns, peakColumnKey, topProject, userId };
	});
}

export interface DaySegment {
	key: string;
	seconds: number;
	share: number;
}

export interface RosterDay {
	summary: DaySummary;
	segments: DaySegment[];
	isToday: boolean;
}

function rowsByDayOf(rows: ReadonlyArray<DailyReportRow>) {
	const groups = new Map<string, DailyReportRow[]>();
	for (const row of rows) {
		const group = groups.get(row.dateKey) ?? [];
		group.push(row);
		groups.set(row.dateKey, group);
	}
	return groups;
}

function daySegmentsOf(
	dayRows: ReadonlyArray<DailyReportRow>,
	daySeconds: number,
	series: ReadonlyArray<ProjectSeries>
): DaySegment[] {
	const leadingKeys = leadingSeriesKeysOf(series);
	const secondsBySeries = new Map<string, number>();
	for (const row of dayRows) {
		const seriesKey = seriesKeyOfRow(row, leadingKeys);
		const current = secondsBySeries.get(seriesKey) ?? 0;
		secondsBySeries.set(seriesKey, current + row.seconds);
	}
	const segments: DaySegment[] = [];
	for (const entry of series) {
		const seconds = secondsBySeries.get(entry.key) ?? 0;
		if (seconds <= 0) {
			continue;
		}
		const share = percentOf(seconds, daySeconds);
		segments.push({ key: entry.key, seconds, share });
	}
	return segments;
}

export function rosterDaysOf(
	rows: ReadonlyArray<DailyReportRow>,
	days: ReadonlyArray<DaySummary>,
	series: ReadonlyArray<ProjectSeries>,
	now = new Date()
): RosterDay[] {
	const todayKey = localDayKeyOf(now);
	const rowsByDay = rowsByDayOf(rows);
	return days.map((summary) => {
		const dayRows = rowsByDay.get(summary.dateKey) ?? [];
		const segments = daySegmentsOf(dayRows, summary.seconds, series);
		const isToday = summary.dateKey === todayKey;
		return { summary, segments, isToday };
	});
}

type ReportEmployee = ITimeLogGroupedDailyReport['logs'][number]['employeeLogs'][number]['employee'];

function userIdOfEmployee(employee: ReportEmployee | null | undefined) {
	const directId = employee?.userId;
	if (directId) {
		return directId;
	}
	return employee?.user?.id ?? null;
}

function addTeamUserIds(userIds: Map<string, string>, teams: ReadonlyArray<TOrganizationTeam>) {
	for (const team of teams) {
		for (const member of team.members ?? []) {
			const employeeId = member?.employee?.id ?? member?.employeeId;
			const userId = member?.employee?.userId;
			if (!employeeId || !userId) {
				continue;
			}
			userIds.set(employeeId, userId);
		}
	}
}

function addReportUserIds(userIds: Map<string, string>, report: ReadonlyArray<ITimeLogGroupedDailyReport>) {
	for (const day of report) {
		for (const projectLog of day?.logs ?? []) {
			for (const employeeLog of projectLog?.employeeLogs ?? []) {
				const employee = employeeLog?.employee;
				const employeeId = employee?.id;
				const userId = userIdOfEmployee(employee);
				if (!employeeId || !userId) {
					continue;
				}
				userIds.set(employeeId, userId);
			}
		}
	}
}

/**
 * The user id of each employee: the timesheet route is keyed by user id (the sidebar, the command palette and "My
 * work" link it so), while the daily report is keyed by employee. The report's own employee wins over the teams.
 */
export function userIdsByEmployeeOf(
	report: ReadonlyArray<ITimeLogGroupedDailyReport>,
	teams: ReadonlyArray<TOrganizationTeam>
): Map<string, string> {
	const userIds = new Map<string, string>();
	addTeamUserIds(userIds, teams);
	addReportUserIds(userIds, report);
	return userIds;
}

export function timesheetPathOf(userId: string, name: string) {
	const encodedName = encodeURIComponent(name);
	return `/reports/timesheet/${userId}?name=${encodedName}`;
}

const TIMESHEET_ADMIN_ROLES: ReadonlyArray<string> = [ERoleName.ADMIN, ERoleName.SUPER_ADMIN];

/** The roles the reports layout lets through besides a manager of the active team (`MustBeAManager`). */
export function isTenantAdminRole(roleName: string | null | undefined) {
	if (!roleName) {
		return false;
	}
	return TIMESHEET_ADMIN_ROLES.includes(roleName);
}

export interface ScopeMemberCountInput {
	isManage: boolean;
	isOrganizationWide: boolean;
	pickedTeamIds: string[];
	pickedMemberIds: string[];
	pageTeamId: string | null;
	teams: ReadonlyArray<TOrganizationTeam>;
	managedTeams: ReadonlyArray<TOrganizationTeam>;
}

function countOrNull(count: number) {
	if (count <= 0) {
		return null;
	}
	return count;
}

/**
 * How many members the counts are scoped to, the "of N members" under "Members worked". Known only when the scope
 * is a list of people the page holds: picked members, the members of picked teams, or the page team of its manager.
 * Organization-wide counts and a plain member's own counts have no such list.
 */
export function scopeMemberCountOf(input: ScopeMemberCountInput): number | null {
	if (!input.isManage) {
		return null;
	}
	const pickedMemberCount = input.pickedMemberIds.length;
	if (pickedMemberCount > 0) {
		return pickedMemberCount;
	}
	const hasPickedTeams = input.pickedTeamIds.length > 0;
	if (hasPickedTeams) {
		const pickedTeamMembers = membersOfTeams(input.teams, input.pickedTeamIds);
		return countOrNull(pickedTeamMembers.length);
	}
	if (input.isOrganizationWide) {
		return null;
	}
	const pageTeamIds = requestedTeamIdsOf([], input.pageTeamId);
	const isPageTeamManaged = managesEveryTeam(pageTeamIds, input.managedTeams);
	if (!isPageTeamManaged) {
		return null;
	}
	const pageTeamMembers = membersOfTeams(input.managedTeams, pageTeamIds);
	return countOrNull(pageTeamMembers.length);
}

export const OTHER_MEMBERS_KEY = 'other-members';

const LEADING_MEMBER_SERIES = 6;

interface MemberShareItem {
	key: string;
	name: string;
	imageUrl: string | null;
	seconds: number;
}

export interface MemberSeries {
	key: string;
	name: string;
	imageUrl: string | null;
	isOther: boolean;
	otherCount: number;
	seconds: number;
	share: number;
}

function memberShareItemOf(member: GroupSummary): MemberShareItem {
	const first = firstRowOf(member.rows);
	return {
		key: member.key,
		name: first?.employeeName ?? '',
		imageUrl: first?.employeeImageUrl ?? null,
		seconds: member.seconds
	};
}

function memberSeriesOfShareRow(row: ShareRow<MemberShareItem>): MemberSeries {
	const item = row.item;
	if (!item) {
		return {
			key: OTHER_MEMBERS_KEY,
			name: '',
			imageUrl: null,
			isOther: true,
			otherCount: row.otherCount,
			seconds: row.value,
			share: row.share
		};
	}
	return {
		key: item.key,
		name: item.name,
		imageUrl: item.imageUrl,
		isOther: false,
		otherCount: 0,
		seconds: row.value,
		share: row.share
	};
}

export function memberSeriesOf(rows: ReadonlyArray<DailyReportRow>): MemberSeries[] {
	const members = groupRowsBy(rows, employeeKeyOf);
	const items = members.map(memberShareItemOf);
	const shareRows = shareRowsOf(
		items,
		(item) => item.seconds,
		(item) => item.key,
		LEADING_MEMBER_SERIES
	);
	return shareRows.map(memberSeriesOfShareRow);
}

function leadingMemberKeysOf(series: ReadonlyArray<MemberSeries>) {
	const keys = new Set<string>();
	for (const entry of series) {
		if (entry.isOther) {
			continue;
		}
		keys.add(entry.key);
	}
	return keys;
}

function memberSeriesKeyOfRow(row: DailyReportRow, leadingKeys: ReadonlySet<string>) {
	if (leadingKeys.has(row.employeeId)) {
		return row.employeeId;
	}
	return OTHER_MEMBERS_KEY;
}

export function memberColumnStacksOf(
	rows: ReadonlyArray<DailyReportRow>,
	buckets: ReadonlyArray<ChartBucket>,
	granularity: ChartGranularity,
	series: ReadonlyArray<MemberSeries>
): ColumnStack[] {
	const leadingKeys = leadingMemberKeysOf(series);
	return stacksBy(rows, buckets, granularity, (row) => memberSeriesKeyOfRow(row, leadingKeys));
}

function carriesProjectTime(entry: ProjectSeries) {
	if (entry.isOther) {
		return true;
	}
	const item = entry.item;
	if (!item) {
		return false;
	}
	return !item.isNoProject;
}

/** False when all the period's time was logged without a project: a split by project would be one grey block. */
export function hasProjectTime(series: ReadonlyArray<ProjectSeries>) {
	return series.some(carriesProjectTime);
}

export type LiveState = 'working' | 'paused' | 'online' | 'stopped' | 'notStarted' | 'inactive';

export interface LiveStatusInput {
	/** The member's `timerStatus` as Gauzy sent it in the team detail. */
	gauzyStatus: string | null | undefined;
	/** The app's own reading (`getTimerStatusValue`), which knows presence and suspension. */
	localStatus: ETimerStatus;
	isReader: boolean;
	isReaderTimerRunning: boolean;
}

/**
 * The state a row shows. The reader's own timer is trusted only while it runs (it is ahead of the team detail);
 * otherwise Gauzy's timer status decides, and the app's reading adds only what Gauzy does not send: presence and
 * suspension. The app's reading alone would mark other members paused or running from the reader's last log.
 */
export function liveStatusOf(input: LiveStatusInput): ETimerStatus {
	if (input.localStatus === ETimerStatus.SUSPENDED) {
		return ETimerStatus.SUSPENDED;
	}
	const isReaderRunning = input.isReader && input.isReaderTimerRunning;
	if (isReaderRunning) {
		return ETimerStatus.RUNNING;
	}
	if (input.gauzyStatus === ETimerStatus.RUNNING) {
		return ETimerStatus.RUNNING;
	}
	if (input.gauzyStatus === ETimerStatus.PAUSE) {
		return ETimerStatus.PAUSE;
	}
	if (input.localStatus === ETimerStatus.ONLINE) {
		return ETimerStatus.ONLINE;
	}
	return ETimerStatus.IDLE;
}

function employeeIdOfMember(member: TeamMember) {
	return member?.employee?.id ?? member?.employeeId ?? null;
}

function withDetailOf(member: TeamMember, detailByEmployee: ReadonlyMap<string, TeamMember>): TeamMember {
	const employeeId = employeeIdOfMember(member);
	const detail = detailByEmployee.get(employeeId ?? '');
	if (!detail) {
		return member;
	}
	return {
		...member,
		totalTodayTasks: detail.totalTodayTasks ?? member.totalTodayTasks,
		timerStatus: detail.timerStatus ?? member.timerStatus,
		activeTaskId: detail.activeTaskId ?? member.activeTaskId,
		lastWorkedTask: detail.lastWorkedTask ?? member.lastWorkedTask
	};
}

/**
 * The team's members with the work statistics of the team detail. The teams list that refreshes the team state
 * carries no statistics and is merged over the detail's members, so the detail cached by the shell is the source
 * of each member's tasks of the day, timer status and active task.
 */
export function membersWithDetailOf(
	members: ReadonlyArray<TeamMember>,
	detailMembers: ReadonlyArray<TeamMember>
): TeamMember[] {
	if (members.length === 0) {
		return [...detailMembers];
	}
	const detailByEmployee = new Map<string, TeamMember>();
	for (const member of detailMembers) {
		const employeeId = employeeIdOfMember(member);
		if (!employeeId) {
			continue;
		}
		detailByEmployee.set(employeeId, member);
	}
	return members.map((member) => withDetailOf(member, detailByEmployee));
}

export interface LiveBoardRows {
	/** Working, paused, or with time today: a full row each. */
	active: LiveMember[];
	/** Everyone else, folded into one closing line. */
	notStarted: LiveMember[];
}

function isOnTheBoard(member: LiveMember) {
	const isWorking = member.state === 'working';
	const isPaused = member.state === 'paused';
	const hasTodayTime = member.todaySeconds > 0;
	return [isWorking, isPaused, hasTodayTime].some(Boolean);
}

export function liveBoardRowsOf(members: ReadonlyArray<LiveMember>): LiveBoardRows {
	const rows: LiveBoardRows = { active: [], notStarted: [] };
	for (const member of members) {
		if (isOnTheBoard(member)) {
			rows.active.push(member);
			continue;
		}
		rows.notStarted.push(member);
	}
	return rows;
}

export interface LiveTask {
	id: string;
	numberLabel: string;
	title: string;
}

export interface LiveTodayTask {
	key: string;
	numberLabel: string;
	title: string;
	seconds: number;
}

/** What the member sheet shows beyond the row: read from the team member, never requested. */
export interface LiveProfile {
	roleName: string | null;
	isManager: boolean;
	email: string | null;
	billRateValue: number | null;
	billRateCurrency: string | null;
	todayTasks: LiveTodayTask[];
}

export interface LiveMember {
	employeeId: string;
	profile: LiveProfile;
	userId: string | null;
	name: string;
	imageUrl: string | null;
	state: LiveState;
	todaySeconds: number;
	task: LiveTask | null;
	/** The latest day of the period with time, for a member with none today; the report holds no time of day. */
	lastTrackedDateKey: string | null;
}

type TeamMember = NonNullable<TOrganizationTeam['members']>[number];

function finiteSecondsOf(value: unknown) {
	const parsed = Number(value);
	if (!Number.isFinite(parsed)) {
		return 0;
	}
	return Math.max(parsed, 0);
}

/** The member's time today, the sum the team home cards show: their tasks of the day with their durations. */
export function todaySecondsOfMember(member: TeamMember) {
	let seconds = 0;
	for (const task of member?.totalTodayTasks ?? []) {
		seconds += finiteSecondsOf(task?.duration);
	}
	return seconds;
}

/** Gauzy reads a timer stopped within the last hours as paused, so "stopped" is rare: idle with time today. */
export function liveStateOf(status: ETimerStatus, todaySeconds: number): LiveState {
	switch (status) {
		case ETimerStatus.RUNNING:
			return 'working';
		case ETimerStatus.PAUSE:
			return 'paused';
		case ETimerStatus.SUSPENDED:
			return 'inactive';
		case ETimerStatus.ONLINE:
			return 'online';
		default:
			break;
	}
	if (todaySeconds > 0) {
		return 'stopped';
	}
	return 'notStarted';
}

function liveTaskOfTask(task: TTask): LiveTask {
	return { id: task.id, numberLabel: taskNumberLabel(task), title: task.title ?? '' };
}

function textOf(value: unknown) {
	if (typeof value === 'string') {
		return value;
	}
	if (typeof value === 'number') {
		return String(value);
	}
	return '';
}

/** The last worked task Gauzy attaches to a member is a bare task row, read field by field. */
function liveTaskOfUnknown(value: unknown): LiveTask | null {
	if (!value || typeof value !== 'object') {
		return null;
	}
	const record = value as Record<string, unknown>;
	const id = textOf(record.id);
	const title = textOf(record.title);
	if (!id || !title) {
		return null;
	}
	const number = textOf(record.taskNumber) || textOf(record.number);
	let numberLabel = '';
	if (number) {
		numberLabel = `#${number}`;
	}
	return { id, numberLabel, title };
}

interface LiveTaskSources {
	tasksById: ReadonlyMap<string, TTask>;
	authUserId: string | null;
	activeTeamTask: TTask | null;
}

function lastWorkedTaskIdOf(member: TeamMember) {
	const lastTask = liveTaskOfUnknown(member?.lastWorkedTask);
	return lastTask?.id ?? null;
}

/** The task a member is on: the signed-in member's active task first (it changes before the team refreshes). */
function liveTaskOfMember(member: TeamMember, sources: LiveTaskSources): LiveTask | null {
	const userId = member?.employee?.userId ?? null;
	const isAuthUser = Boolean(userId) && userId === sources.authUserId;
	if (isAuthUser && sources.activeTeamTask) {
		return liveTaskOfTask(sources.activeTeamTask);
	}
	const taskId = member?.activeTaskId ?? lastWorkedTaskIdOf(member);
	const knownTask = sources.tasksById.get(taskId ?? '');
	if (knownTask) {
		return liveTaskOfTask(knownTask);
	}
	return liveTaskOfUnknown(member?.lastWorkedTask);
}

const STATE_RANKS: Record<LiveState, number> = {
	working: 0,
	paused: 1,
	stopped: 2,
	online: 3,
	notStarted: 4,
	inactive: 5
};

const TRACKED_TODAY_RANK = 2;

/** Working first, then paused, then whoever tracked today, then the rest. */
function liveRankOf(member: LiveMember) {
	const rank = STATE_RANKS[member.state];
	const hasTodayTime = member.todaySeconds > 0;
	const isLaterThanTracked = rank > TRACKED_TODAY_RANK;
	if (hasTodayTime && isLaterThanTracked) {
		return TRACKED_TODAY_RANK;
	}
	return rank;
}

function compareLiveMembers(first: LiveMember, second: LiveMember) {
	const byRank = liveRankOf(first) - liveRankOf(second);
	if (byRank !== 0) {
		return byRank;
	}
	const byToday = second.todaySeconds - first.todaySeconds;
	if (byToday !== 0) {
		return byToday;
	}
	return first.name.localeCompare(second.name);
}

export interface LiveMembersInput {
	members: ReadonlyArray<TeamMember>;
	pickedMemberIds: ReadonlyArray<string>;
	statusOf: (member: TeamMember) => ETimerStatus;
	tasks: ReadonlyArray<TTask>;
	authUserId: string | null;
	activeTeamTask: TTask | null;
	lastTrackedByEmployee: ReadonlyMap<string, string>;
}

interface ProfileEmployee {
	billRateValue?: number | null;
	billRateCurrency?: string | null;
	user?: { email?: string | null } | null;
}

function todayTasksOfMember(member: TeamMember): LiveTodayTask[] {
	const tasks: LiveTodayTask[] = [];
	for (const task of member?.totalTodayTasks ?? []) {
		const seconds = finiteSecondsOf(task?.duration);
		if (seconds <= 0) {
			continue;
		}
		const liveTask = liveTaskOfUnknown(task);
		const key = liveTask?.id ?? `today-task:${tasks.length}`;
		tasks.push({
			key,
			numberLabel: liveTask?.numberLabel ?? '',
			title: liveTask?.title ?? '',
			seconds
		});
	}
	tasks.sort((first, second) => second.seconds - first.seconds);
	return tasks;
}

function finiteNumberOrNull(value: unknown) {
	const isMissing = value === null || value === undefined;
	if (isMissing) {
		return null;
	}
	const parsed = Number(value);
	if (!Number.isFinite(parsed)) {
		return null;
	}
	return parsed;
}

function profileOfMember(member: TeamMember): LiveProfile {
	const employee: ProfileEmployee | null | undefined = member?.employee;
	const email = employee?.user?.email?.trim();
	return {
		roleName: member?.role?.name ?? null,
		isManager: Boolean(member?.isManager),
		email: email || null,
		billRateValue: finiteNumberOrNull(employee?.billRateValue),
		billRateCurrency: employee?.billRateCurrency ?? null,
		todayTasks: todayTasksOfMember(member)
	};
}

function tasksByIdOf(tasks: ReadonlyArray<TTask>) {
	const byId = new Map<string, TTask>();
	for (const task of tasks) {
		byId.set(task.id, task);
	}
	return byId;
}

function isPickedMember(employeeId: string, picked: ReadonlySet<string>) {
	if (picked.size === 0) {
		return true;
	}
	return picked.has(employeeId);
}

export function liveMembersOf(input: LiveMembersInput): LiveMember[] {
	const picked = new Set(input.pickedMemberIds);
	const sources: LiveTaskSources = {
		tasksById: tasksByIdOf(input.tasks),
		authUserId: input.authUserId,
		activeTeamTask: input.activeTeamTask
	};
	const seen = new Set<string>();
	const liveMembers: LiveMember[] = [];
	for (const member of input.members) {
		const person = personOfTeamMember(member);
		if (!person) {
			continue;
		}
		const isRepeated = seen.has(person.employeeId);
		const isShown = isPickedMember(person.employeeId, picked);
		if (isRepeated || !isShown) {
			continue;
		}
		seen.add(person.employeeId);
		const todaySeconds = todaySecondsOfMember(member);
		const status = input.statusOf(member);
		liveMembers.push({
			employeeId: person.employeeId,
			profile: profileOfMember(member),
			userId: member?.employee?.userId ?? null,
			name: person.name,
			imageUrl: person.imageUrl,
			state: liveStateOf(status, todaySeconds),
			todaySeconds,
			task: liveTaskOfMember(member, sources),
			lastTrackedDateKey: input.lastTrackedByEmployee.get(person.employeeId) ?? null
		});
	}
	liveMembers.sort(compareLiveMembers);
	return liveMembers;
}

export interface LiveCounts {
	total: number;
	working: number;
	paused: number;
	notStarted: number;
}

function isOnTheTimer(member: LiveMember) {
	const isWorking = member.state === 'working';
	const isPaused = member.state === 'paused';
	return isWorking || isPaused;
}

export function liveCountsOf(members: ReadonlyArray<LiveMember>): LiveCounts {
	const counts: LiveCounts = { total: members.length, working: 0, paused: 0, notStarted: 0 };
	for (const member of members) {
		if (member.state === 'working') {
			counts.working += 1;
			continue;
		}
		if (member.state === 'paused') {
			counts.paused += 1;
			continue;
		}
		const hasTodayTime = member.todaySeconds > 0;
		const isOff = !isOnTheTimer(member);
		if (isOff && !hasTodayTime) {
			counts.notStarted += 1;
		}
	}
	return counts;
}

export function todayTotalSecondsOf(members: ReadonlyArray<LiveMember>) {
	let seconds = 0;
	for (const member of members) {
		seconds += member.todaySeconds;
	}
	return seconds;
}

export interface TodaySegment {
	key: string;
	name: string;
	seconds: number;
	share: number;
}

export function todaySegmentsOf(members: ReadonlyArray<LiveMember>): TodaySegment[] {
	const total = todayTotalSecondsOf(members);
	const segments: TodaySegment[] = [];
	for (const member of members) {
		if (member.todaySeconds <= 0) {
			continue;
		}
		const share = percentOf(member.todaySeconds, total);
		segments.push({ key: member.employeeId, name: member.name, seconds: member.todaySeconds, share });
	}
	segments.sort((first, second) => second.seconds - first.seconds);
	return segments;
}

function plannedSecondsOfPlan(plan: TDailyPlan) {
	const hours = finiteSecondsOf(plan.workTimePlanned);
	const seconds = hours * 3600;
	return Math.round(seconds);
}

/** The hours the shown members planned for today, read from their daily plans (`workTimePlanned` is in hours). */
export function todayPlannedSecondsOf(
	plans: ReadonlyArray<TDailyPlan>,
	employeeIds: ReadonlySet<string>,
	now = new Date()
) {
	const todayKey = localDayKeyOf(now);
	let seconds = 0;
	for (const plan of plans) {
		const employeeId = plan.employeeId;
		if (!employeeId) {
			continue;
		}
		const isShownMember = employeeIds.has(employeeId);
		if (!isShownMember) {
			continue;
		}
		const planDay = getDailyPlanDay(plan.date);
		if (planDay !== todayKey) {
			continue;
		}
		seconds += plannedSecondsOfPlan(plan);
	}
	return seconds;
}

export function lastTrackedDayByEmployeeOf(rows: ReadonlyArray<DailyReportRow>) {
	const lastDays = new Map<string, string>();
	for (const row of rows) {
		if (row.seconds <= 0) {
			continue;
		}
		const current = lastDays.get(row.employeeId) ?? '';
		const isLater = row.dateKey > current;
		if (isLater) {
			lastDays.set(row.employeeId, row.dateKey);
		}
	}
	return lastDays;
}

const DESCRIPTION_TASK_PREFIX = 'description:';

function taskIdOfReportTask(task: DailyReportTask) {
	const isDescriptionOnly = task.key.startsWith(DESCRIPTION_TASK_PREFIX);
	if (isDescriptionOnly) {
		return null;
	}
	return task.key;
}

export function periodTaskSecondsOf(rows: ReadonlyArray<DailyReportRow>) {
	const seconds = new Map<string, number>();
	for (const row of rows) {
		for (const task of row.tasks) {
			const taskId = taskIdOfReportTask(task);
			if (!taskId) {
				continue;
			}
			const current = seconds.get(taskId) ?? 0;
			seconds.set(taskId, current + task.seconds);
		}
	}
	return seconds;
}

export interface LaneTask {
	task: TTask;
	seconds: number;
}

export interface TaskLane {
	status: TTaskStatus;
	tasks: LaneTask[];
}

export interface TaskLanesInput {
	tasks: ReadonlyArray<TTask>;
	/** In the team's order. */
	statuses: TTaskStatus[];
	taskSeconds: ReadonlyMap<string, number>;
	pickedMemberIds: ReadonlyArray<string>;
}

function isAssignedToPicked(task: TTask, picked: ReadonlySet<string>) {
	if (picked.size === 0) {
		return true;
	}
	const members = task.members ?? [];
	return members.some((member) => picked.has(member.id));
}

function byWorkedTimeFirst(first: LaneTask, second: LaneTask) {
	return second.seconds - first.seconds;
}

/**
 * The team's tasks by status, in the team's status order: every open task, and a done one only when it was worked
 * in the period. A task whose status is in no lane lands in the first one, as on the board.
 */
export function taskLanesOf(input: TaskLanesInput): TaskLane[] {
	const picked = new Set(input.pickedMemberIds);
	const statusById = new Map<string, TTaskStatus>();
	const laneTasks = new Map<string, LaneTask[]>();
	for (const status of input.statuses) {
		statusById.set(status.id, status);
		laneTasks.set(status.id, []);
	}
	const firstStatusId = input.statuses[0]?.id;
	for (const task of input.tasks) {
		if (task.isDraft) {
			continue;
		}
		if (!isAssignedToPicked(task, picked)) {
			continue;
		}
		const statusId = statusIdOf(task, input.statuses) ?? firstStatusId;
		if (!statusId) {
			continue;
		}
		const seconds = input.taskSeconds.get(task.id) ?? 0;
		const isDone = isDoneStatus(statusById.get(statusId));
		const isWorked = seconds > 0;
		if (isDone && !isWorked) {
			continue;
		}
		laneTasks.get(statusId)?.push({ task, seconds });
	}
	const lanes: TaskLane[] = [];
	for (const status of input.statuses) {
		const tasks = laneTasks.get(status.id) ?? [];
		if (tasks.length === 0) {
			continue;
		}
		tasks.sort(byWorkedTimeFirst);
		lanes.push({ status, tasks });
	}
	return lanes;
}

export interface RecentLine {
	key: string;
	employeeId: string;
	name: string;
	imageUrl: string | null;
	seconds: number;
	taskId: string | null;
	taskTitle: string;
	taskNumberLabel: string;
	project: ProjectShareItem | null;
}

export interface RecentDay {
	dateKey: string;
	seconds: number;
	lines: RecentLine[];
}

function projectOfRow(row: DailyReportRow): ProjectShareItem | null {
	if (!row.projectId) {
		return null;
	}
	return {
		key: row.projectId,
		name: row.projectName,
		imageUrl: row.projectImageUrl,
		color: row.projectColor,
		isNoProject: false,
		seconds: row.seconds
	};
}

function numberLabelOfTaskId(taskId: string | null, tasksById: ReadonlyMap<string, TTask>) {
	const task = tasksById.get(taskId ?? '');
	if (!task) {
		return '';
	}
	return taskNumberLabel(task);
}

function recentLinesOfRow(row: DailyReportRow, tasksById: ReadonlyMap<string, TTask>): RecentLine[] {
	const project = projectOfRow(row);
	const base = {
		employeeId: row.employeeId,
		name: row.employeeName,
		imageUrl: row.employeeImageUrl,
		project
	};
	const workedTasks = row.tasks.filter((task) => task.seconds > 0);
	if (workedTasks.length === 0) {
		return [{ ...base, key: row.key, seconds: row.seconds, taskId: null, taskTitle: '', taskNumberLabel: '' }];
	}
	return workedTasks.map((task) => {
		const taskId = taskIdOfReportTask(task);
		return {
			...base,
			key: `${row.key}:${task.key}`,
			seconds: task.seconds,
			taskId,
			taskTitle: task.title,
			taskNumberLabel: numberLabelOfTaskId(taskId, tasksById)
		};
	});
}

/** The daily report can carry the same member, project and task twice on one day: those lines become one. */
function addRecentLine(linesByKey: Map<string, RecentLine>, line: RecentLine) {
	const existing = linesByKey.get(line.key);
	if (!existing) {
		linesByKey.set(line.key, { ...line });
		return;
	}
	existing.seconds += line.seconds;
}

/** The period's work, newest day first, each day's lines largest first: the daily report holds no time of day. */
export function recentWorkOf(rows: ReadonlyArray<DailyReportRow>, tasks: ReadonlyArray<TTask>): RecentDay[] {
	const tasksById = tasksByIdOf(tasks);
	const days = new Map<string, RecentDay>();
	const linesByDay = new Map<string, Map<string, RecentLine>>();
	for (const row of rows) {
		const day = days.get(row.dateKey) ?? { dateKey: row.dateKey, seconds: 0, lines: [] };
		day.seconds += row.seconds;
		days.set(row.dateKey, day);
		const linesByKey = linesByDay.get(row.dateKey) ?? new Map<string, RecentLine>();
		linesByDay.set(row.dateKey, linesByKey);
		const lines = recentLinesOfRow(row, tasksById);
		for (const line of lines) {
			addRecentLine(linesByKey, line);
		}
	}
	for (const day of days.values()) {
		const linesByKey = linesByDay.get(day.dateKey);
		day.lines = [...(linesByKey?.values() ?? [])];
	}
	const sortedDays = [...days.values()];
	sortedDays.sort((first, second) => second.dateKey.localeCompare(first.dateKey));
	for (const day of sortedDays) {
		day.lines.sort((first, second) => second.seconds - first.seconds);
	}
	return sortedDays;
}

export type TaskGroup = 'todo' | 'inProgress' | 'inReview' | 'done';

/** Gauzy's workflow flags first; statuses created before them fall back on the names Gauzy seeds. */
export function taskGroupOfStatus(status: TTaskStatus): TaskGroup {
	if (isDoneStatus(status)) {
		return 'done';
	}
	const name = normalizedText(status.name);
	if (name.includes('review')) {
		return 'inReview';
	}
	if (status.isInProgress) {
		return 'inProgress';
	}
	if (name === 'in progress') {
		return 'inProgress';
	}
	return 'todo';
}

export interface TaskGroupCounts {
	/** Every task that is not done. */
	open: number;
	inProgress: number;
	inReview: number;
	todo: number;
	/** Done tasks worked in the period: the lanes hold no other done task. */
	done: number;
}

export function taskGroupCountsOf(lanes: ReadonlyArray<TaskLane>): TaskGroupCounts {
	const counts: TaskGroupCounts = { open: 0, inProgress: 0, inReview: 0, todo: 0, done: 0 };
	for (const lane of lanes) {
		const group = taskGroupOfStatus(lane.status);
		const count = lane.tasks.length;
		counts[group] += count;
		if (group !== 'done') {
			counts.open += count;
		}
	}
	return counts;
}

export interface StatusRow {
	status: TTaskStatus;
	count: number;
	share: number;
}

export function statusRowsOf(lanes: ReadonlyArray<TaskLane>): StatusRow[] {
	let total = 0;
	for (const lane of lanes) {
		total += lane.tasks.length;
	}
	return lanes.map((lane) => {
		const count = lane.tasks.length;
		const share = percentOf(count, total);
		return { status: lane.status, count, share };
	});
}

/** The tasks in progress that were worked in the period, the most worked first. */
export function inProgressWorkedOf(lanes: ReadonlyArray<TaskLane>): LaneTask[] {
	const tasks: LaneTask[] = [];
	for (const lane of lanes) {
		const group = taskGroupOfStatus(lane.status);
		if (group !== 'inProgress') {
			continue;
		}
		for (const laneTask of lane.tasks) {
			if (laneTask.seconds > 0) {
				tasks.push(laneTask);
			}
		}
	}
	tasks.sort((first, second) => second.seconds - first.seconds);
	return tasks;
}

/** A member's time by project over the period, for the member sheet. */
export function memberProjectSharesOf(rows: ReadonlyArray<DailyReportRow>, employeeId: string) {
	const memberRows = rows.filter((row) => row.employeeId === employeeId);
	return projectSharesOf(memberRows);
}

export type MemberSortKey = 'status' | 'name' | 'today' | 'period' | 'days';

export interface MemberSort {
	key: MemberSortKey;
	direction: SortDirection;
}

/** The live order first: working, paused, tracked today, then the rest. */
export const DEFAULT_MEMBER_SORT: MemberSort = { key: 'status', direction: 'asc' };

export interface MemberTableRow {
	member: LiveMember;
	roster: RosterMember | null;
	/** The member's place in the live order, which the status column sorts by. */
	liveOrder: number;
}

export function memberTableRowsOf(
	members: ReadonlyArray<LiveMember>,
	rosterMembers: ReadonlyArray<RosterMember>
): MemberTableRow[] {
	const rosterByEmployee = new Map<string, RosterMember>();
	for (const roster of rosterMembers) {
		rosterByEmployee.set(roster.summary.key, roster);
	}
	return members.map((member, liveOrder) => ({
		member,
		roster: rosterByEmployee.get(member.employeeId) ?? null,
		liveOrder
	}));
}

function memberRowValueOf(row: MemberTableRow, key: MemberSortKey): SortValue {
	switch (key) {
		case 'name':
			return row.member.name.toLocaleLowerCase();
		case 'today':
			return row.member.todaySeconds;
		case 'period':
			return row.roster?.summary.seconds ?? 0;
		case 'days':
			return row.roster?.summary.dayCount ?? 0;
		default:
			return row.liveOrder;
	}
}

export function sortedMemberRows(rows: ReadonlyArray<MemberTableRow>, sort: MemberSort): MemberTableRow[] {
	const factor = directionFactorOf(sort.direction);
	const sorted = [...rows];
	sorted.sort((first, second) => {
		const firstValue = memberRowValueOf(first, sort.key);
		const secondValue = memberRowValueOf(second, sort.key);
		const difference = compareValues(firstValue, secondValue);
		return difference * factor;
	});
	return sorted;
}

function firstMemberDirectionOf(key: MemberSortKey): SortDirection {
	const isName = key === 'name';
	const isStatus = key === 'status';
	if (isName || isStatus) {
		return 'asc';
	}
	return 'desc';
}

/** A click on the sorted column flips it; another column starts with its natural order. */
export function nextMemberSortOf(current: MemberSort, key: MemberSortKey): MemberSort {
	if (current.key === key) {
		return { key, direction: flippedDirectionOf(current.direction) };
	}
	return { key, direction: firstMemberDirectionOf(key) };
}
