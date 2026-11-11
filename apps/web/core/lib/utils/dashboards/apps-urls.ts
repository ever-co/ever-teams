import type { ActivityKind } from '@/core/lib/utils/activity-icons';
import { durationPartsOf, percentOf } from '@/core/lib/utils/dashboard-figures';

export type AppsUrlsView = 'date' | 'employee' | 'project' | 'application';

export const APPS_URLS_VIEWS: ReadonlyArray<AppsUrlsView> = ['date', 'employee', 'project', 'application'];

/**
 * Values that older versions of the page stored under `group-by-type`. Daily and weekly were never accepted by
 * Gauzy (400), so they open on the date view.
 */
const STORED_VIEWS = new Map<string, AppsUrlsView>([
	['date', 'date'],
	['daily', 'date'],
	['weekly', 'date'],
	['employee', 'employee'],
	['member', 'employee'],
	['project', 'project'],
	['application', 'application']
]);

export interface ViewColumns {
	showsMember: boolean;
	showsProject: boolean;
}

/** The column a view groups by is the group header itself, so its rows do not repeat it. */
export const VIEW_COLUMNS: Record<AppsUrlsView, ViewColumns> = {
	date: { showsMember: true, showsProject: true },
	employee: { showsMember: false, showsProject: true },
	project: { showsMember: true, showsProject: false },
	application: { showsMember: true, showsProject: true }
};

export function appsUrlsViewOf(stored: unknown): AppsUrlsView {
	if (typeof stored !== 'string') {
		return 'date';
	}
	return STORED_VIEWS.get(stored) ?? 'date';
}

/**
 * Gauzy keeps the 200 longest entries of a period (`limit(200)` in `ActivityService.getDailyActivitiesReport`), so a
 * report of that size may be missing its shortest entries.
 */
export const ACTIVITY_REPORT_ROW_CAP = 200;

export function isCappedReport(rowCount: number) {
	return rowCount >= ACTIVITY_REPORT_ROW_CAP;
}

export interface UsagePerson {
	id: string;
	name: string;
	imageUrl: string | null;
}

export interface UsageProject {
	id: string | null;
	name: string | null;
	imageUrl: string | null;
	color: string | null;
}

/** One app or site used by one member on one project on one day: the grain of Gauzy's activity report. */
export interface AppUsageRow {
	key: string;
	dateKey: string;
	title: string;
	/** `url` for a visited site, `app` for a desktop app, where the report says so (#5023). */
	kind?: ActivityKind | null;
	/** A visited address of the site, where the report carries one (#5023). */
	url?: string | null;
	employee: UsagePerson;
	project: UsageProject;
	seconds: number;
}

type UnknownRecord = Record<string, unknown>;

function recordOf(value: unknown): UnknownRecord | null {
	const isObject = typeof value === 'object';
	const isPresent = value !== null;
	const isRecord = isObject && isPresent;
	if (!isRecord) {
		return null;
	}
	return value as UnknownRecord;
}

function arrayOf(value: unknown): unknown[] {
	if (Array.isArray(value)) {
		return value;
	}
	return [];
}

function textOf(value: unknown): string {
	if (typeof value === 'string') {
		return value.trim();
	}
	return '';
}

/** Gauzy's activity type (`APP` or `URL`), when the report carries it. */
function kindOf(value: unknown): ActivityKind | null {
	const type = textOf(value).toUpperCase();
	if (type === 'URL') {
		return 'url';
	}
	if (type === 'APP') {
		return 'app';
	}
	return null;
}

function textOrNullOf(value: unknown): string | null {
	const text = textOf(value);
	if (text) {
		return text;
	}
	return null;
}

/** Gauzy sums durations in SQL, so they arrive as strings. */
function secondsOf(value: unknown): number {
	const parsed = Number(value);
	const isCountable = Number.isFinite(parsed);
	if (!isCountable) {
		return 0;
	}
	return Math.max(parsed, 0);
}

function joinedName(user: UnknownRecord | null) {
	const firstName = textOf(user?.firstName);
	const lastName = textOf(user?.lastName);
	return [firstName, lastName].filter(Boolean).join(' ');
}

function personNameOf(employee: UnknownRecord | null) {
	const fullName = textOf(employee?.fullName);
	if (fullName) {
		return fullName;
	}
	const user = recordOf(employee?.user);
	const userName = textOf(user?.name);
	if (userName) {
		return userName;
	}
	return joinedName(user);
}

function personOf(employeeValue: unknown, fallbackId: unknown): UsagePerson | null {
	const employee = recordOf(employeeValue);
	const user = recordOf(employee?.user);
	const id = textOf(employee?.id) || textOf(fallbackId);
	if (!id) {
		return null;
	}
	return { id, name: personNameOf(employee), imageUrl: textOrNullOf(user?.imageUrl) };
}

function imageUrlOfProject(project: UnknownRecord | null) {
	const imageUrl = textOrNullOf(project?.imageUrl);
	if (imageUrl) {
		return imageUrl;
	}
	const image = recordOf(project?.image);
	return textOrNullOf(image?.thumbUrl);
}

function projectOf(projectValue: unknown, fallbackId: unknown): UsageProject {
	const project = recordOf(projectValue);
	const id = textOrNullOf(project?.id) ?? textOrNullOf(fallbackId);
	return {
		id,
		name: textOrNullOf(project?.name),
		imageUrl: imageUrlOfProject(project),
		color: textOrNullOf(project?.color)
	};
}

export const NO_PROJECT_KEY = 'no-project';

export function projectKeyOf(project: UsageProject) {
	return project.id ?? NO_PROJECT_KEY;
}

export function isNoProject(project: UsageProject) {
	return project.id === null;
}

function usageRowOf(
	activityValue: unknown,
	dateKey: string,
	groupEmployee: unknown,
	groupProject: unknown
): AppUsageRow | null {
	const activity = recordOf(activityValue);
	if (!activity) {
		return null;
	}
	const employeeSource = activity.employee ?? groupEmployee;
	const employee = personOf(employeeSource, activity.employeeId);
	if (!employee) {
		return null;
	}
	const projectSource = activity.project ?? groupProject;
	const project = projectOf(projectSource, activity.projectId);
	const ownDateKey = textOf(activity.date).slice(0, 10);
	const rowDateKey = dateKey || ownDateKey;
	const title = textOf(activity.title);
	const projectKey = projectKeyOf(project);
	const key = [rowDateKey, employee.id, projectKey, title].join('|');
	const seconds = secondsOf(activity.duration);
	const kind = kindOf(activity.type);
	const url = textOf(activity.url) || null;
	return { key, dateKey: rowDateKey, title, kind, url, employee, project, seconds };
}

function addUsageRow(rowsByKey: Map<string, AppUsageRow>, row: AppUsageRow) {
	const existing = rowsByKey.get(row.key);
	if (!existing) {
		rowsByKey.set(row.key, row);
		return;
	}
	// The kind and address of either row: the first may lack what the second carries
	rowsByKey.set(row.key, {
		...existing,
		kind: existing.kind ?? row.kind ?? null,
		url: existing.url ?? row.url ?? null,
		seconds: existing.seconds + row.seconds
	});
}

/**
 * The report grouped by date (`date > employees > projects > activity`), read defensively: Gauzy returns the same
 * rows for every `groupBy` and only shapes them differently, so the page asks for one shape and builds every view.
 */
export function flattenActivityReport(report: ReadonlyArray<unknown>): AppUsageRow[] {
	const rowsByKey = new Map<string, AppUsageRow>();
	for (const dayValue of report) {
		const day = recordOf(dayValue);
		const dateKey = textOf(day?.date).slice(0, 10);
		for (const employeeValue of arrayOf(day?.employees)) {
			const employeeGroup = recordOf(employeeValue);
			for (const projectValue of arrayOf(employeeGroup?.projects)) {
				const projectGroup = recordOf(projectValue);
				for (const activityValue of arrayOf(projectGroup?.activity)) {
					const row = usageRowOf(activityValue, dateKey, employeeGroup?.employee, projectGroup?.project);
					if (row) {
						addUsageRow(rowsByKey, row);
					}
				}
			}
		}
	}
	return [...rowsByKey.values()];
}

function sumOfSeconds(rows: ReadonlyArray<{ seconds: number }>) {
	let total = 0;
	for (const row of rows) {
		total += row.seconds;
	}
	return total;
}

function distinctCount<T>(rows: ReadonlyArray<AppUsageRow>, valueOf: (row: AppUsageRow) => T) {
	const values = new Set(rows.map(valueOf));
	return values.size;
}

export interface TitleTotal {
	key: string;
	title: string;
	/** `url` for a visited site, `app` for a desktop app, where the report says so (#5023). */
	kind?: ActivityKind | null;
	/** A visited address of the site, where the report carries one (#5023). */
	url?: string | null;
	seconds: number;
}

function bySecondsDescending(first: { seconds: number }, second: { seconds: number }) {
	return second.seconds - first.seconds;
}

/** Every app or site of the period with its time, the longest first. */
export function titleTotalsOf(rows: ReadonlyArray<AppUsageRow>): TitleTotal[] {
	const totals = new Map<string, TitleTotal>();
	for (const row of rows) {
		const existing = totals.get(row.title);
		const seconds = (existing?.seconds ?? 0) + row.seconds;
		const kind = existing?.kind ?? row.kind ?? null;
		const url = existing?.url ?? row.url ?? null;
		totals.set(row.title, { key: row.title, title: row.title, kind, url, seconds });
	}
	const sorted = [...totals.values()];
	sorted.sort(bySecondsDescending);
	return sorted;
}

/** The share bar colours this many titles; the rest is one grey segment. */
export const LEADING_TITLE_COUNT = 3;

export interface UsageFigures {
	totalSeconds: number;
	dayCount: number;
	titleCount: number;
	memberCount: number;
	projectCount: number;
	top: TitleTotal | null;
	topShare: number;
	leadingShare: number;
}

export function usageFiguresOf(rows: ReadonlyArray<AppUsageRow>, titleTotals: ReadonlyArray<TitleTotal>): UsageFigures {
	const totalSeconds = sumOfSeconds(rows);
	const top = titleTotals[0] ?? null;
	const leading = titleTotals.slice(0, LEADING_TITLE_COUNT);
	const leadingSeconds = sumOfSeconds(leading);
	return {
		totalSeconds,
		dayCount: distinctCount(rows, (row) => row.dateKey),
		titleCount: titleTotals.length,
		memberCount: distinctCount(rows, (row) => row.employee.id),
		projectCount: distinctCount(rows, (row) => projectKeyOf(row.project)),
		top,
		topShare: percentOf(top?.seconds ?? 0, totalSeconds),
		leadingShare: percentOf(leadingSeconds, totalSeconds)
	};
}

/** A line inside a group: what one app or site, member, project or day adds up to over the group. */
export interface UsageGroupRow {
	key: string;
	dateKey: string;
	title: string;
	/** `url` for a visited site, `app` for a desktop app, where the report says so (#5023). */
	kind?: ActivityKind | null;
	/** A visited address of the site, where the report carries one (#5023). */
	url?: string | null;
	employee: UsagePerson;
	project: UsageProject;
	seconds: number;
	/** Share of the group's time. */
	share: number;
}

export interface UsageGroup {
	key: string;
	view: AppsUrlsView;
	/** The row the group was opened from, for its label: its day, member, project or title. */
	sample: AppUsageRow;
	seconds: number;
	/** Share of the period's time. */
	share: number;
	dayCount: number;
	titleCount: number;
	memberCount: number;
	projectCount: number;
	rows: UsageGroupRow[];
}

function groupKeyOf(row: AppUsageRow, view: AppsUrlsView) {
	switch (view) {
		case 'date':
			return row.dateKey;
		case 'employee':
			return row.employee.id;
		case 'project':
			return projectKeyOf(row.project);
		case 'application':
			return row.title;
	}
}

/** Rows that read the same in a view merge: a member's app on a project over several days is one line. */
function lineKeyOf(row: AppUsageRow, view: AppsUrlsView) {
	switch (view) {
		case 'employee':
			return [row.title, projectKeyOf(row.project)].join('|');
		case 'project':
			return [row.title, row.employee.id].join('|');
		default:
			return row.key;
	}
}

function byLineOrder(view: AppsUrlsView) {
	if (view !== 'application') {
		return bySecondsDescending;
	}
	return (first: UsageGroupRow, second: UsageGroupRow) => {
		const byDay = second.dateKey.localeCompare(first.dateKey);
		if (byDay !== 0) {
			return byDay;
		}
		return bySecondsDescending(first, second);
	};
}

function linesOf(rows: ReadonlyArray<AppUsageRow>, view: AppsUrlsView, groupSeconds: number): UsageGroupRow[] {
	const lines = new Map<string, UsageGroupRow>();
	for (const row of rows) {
		const key = lineKeyOf(row, view);
		const existing = lines.get(key);
		if (existing) {
			existing.seconds += row.seconds;
			continue;
		}
		lines.set(key, { ...row, key, share: 0 });
	}
	const sorted = [...lines.values()];
	for (const line of sorted) {
		line.share = percentOf(line.seconds, groupSeconds);
	}
	sorted.sort(byLineOrder(view));
	return sorted;
}

function groupOf(key: string, view: AppsUrlsView, rows: AppUsageRow[], totalSeconds: number): UsageGroup {
	const seconds = sumOfSeconds(rows);
	return {
		key,
		view,
		sample: rows[0],
		seconds,
		share: percentOf(seconds, totalSeconds),
		dayCount: distinctCount(rows, (row) => row.dateKey),
		titleCount: distinctCount(rows, (row) => row.title),
		memberCount: distinctCount(rows, (row) => row.employee.id),
		projectCount: distinctCount(rows, (row) => projectKeyOf(row.project)),
		rows: linesOf(rows, view, seconds)
	};
}

export function usageGroupsOf(rows: ReadonlyArray<AppUsageRow>, view: AppsUrlsView): UsageGroup[] {
	const rowsByGroup = new Map<string, AppUsageRow[]>();
	for (const row of rows) {
		const key = groupKeyOf(row, view);
		const groupRows = rowsByGroup.get(key);
		if (groupRows) {
			groupRows.push(row);
			continue;
		}
		rowsByGroup.set(key, [row]);
	}
	const totalSeconds = sumOfSeconds(rows);
	const groups: UsageGroup[] = [];
	for (const [key, groupRows] of rowsByGroup) {
		groups.push(groupOf(key, view, groupRows, totalSeconds));
	}
	return groups;
}

export type GroupSortColumn = 'name' | 'time';

export type SortDirection = 'asc' | 'desc';

export interface GroupSort {
	column: GroupSortColumn;
	direction: SortDirection;
}

function groupNameOf(group: UsageGroup) {
	switch (group.view) {
		case 'date':
			return group.sample.dateKey;
		case 'employee':
			return group.sample.employee.name;
		case 'project':
			return group.sample.project.name ?? '';
		case 'application':
			return group.sample.title;
	}
}

function compareByName(first: UsageGroup, second: UsageGroup) {
	return groupNameOf(first).localeCompare(groupNameOf(second), undefined, { sensitivity: 'base' });
}

function compareByTime(first: UsageGroup, second: UsageGroup) {
	return first.seconds - second.seconds;
}

/** Without a picked column, days read newest first and everything else longest first. */
function naturalComparator(view: AppsUrlsView) {
	if (view === 'date') {
		return (left: UsageGroup, right: UsageGroup) => compareByName(right, left);
	}
	return (left: UsageGroup, right: UsageGroup) => compareByTime(right, left);
}

const COLUMN_COMPARATORS: Record<GroupSortColumn, (first: UsageGroup, second: UsageGroup) => number> = {
	name: compareByName,
	time: compareByTime
};

function pickedComparator(sort: GroupSort) {
	const compare = COLUMN_COMPARATORS[sort.column];
	if (sort.direction === 'asc') {
		return compare;
	}
	return (left: UsageGroup, right: UsageGroup) => compare(right, left);
}

function comparatorOf(view: AppsUrlsView, sort: GroupSort | null) {
	if (!sort) {
		return naturalComparator(view);
	}
	return pickedComparator(sort);
}

function isUnassignedGroup(group: UsageGroup) {
	const isProjectView = group.view === 'project';
	const hasNoProject = isNoProject(group.sample.project);
	return isProjectView && hasNoProject;
}

/** Groups in the picked order; the "No project" group always closes the project view. */
export function sortUsageGroups(groups: ReadonlyArray<UsageGroup>, view: AppsUrlsView, sort: GroupSort | null) {
	const compare = comparatorOf(view, sort);
	const assigned = groups.filter((group) => !isUnassignedGroup(group));
	const unassigned = groups.filter(isUnassignedGroup);
	assigned.sort(compare);
	return [...assigned, ...unassigned];
}

/** `2:58`, the duration a spreadsheet reads as hours and minutes. */
export function formatHoursMinutes(seconds: number): string {
	const { hours, minutes } = durationPartsOf(seconds);
	const paddedMinutes = String(minutes).padStart(2, '0');
	return `${hours}:${paddedMinutes}`;
}

/** A `YYYY-MM-DD` day as a local calendar date, never shifted by the time zone. */
export function localDateOfKey(dateKey: string): Date {
	const parts = dateKey.split('-');
	const [year, month, day] = parts.map(Number);
	return new Date(year, month - 1, day);
}

function isInCurrentYear(date: Date) {
	const currentYear = new Date().getFullYear();
	return date.getFullYear() === currentYear;
}

function formatDayKey(dateKey: string, locale: string, options: Intl.DateTimeFormatOptions) {
	const date = localDateOfKey(dateKey);
	const isValidDate = Number.isFinite(date.getTime());
	if (!isValidDate) {
		return dateKey;
	}
	const withYear: Intl.DateTimeFormatOptions = { ...options };
	if (!isInCurrentYear(date)) {
		withYear.year = 'numeric';
	}
	const dayFormat = new Intl.DateTimeFormat(locale, withYear);
	return dayFormat.format(date);
}

/** "Monday, Nov 2", with the year only outside the current one. */
export function formatDayLabel(dateKey: string, locale: string): string {
	return formatDayKey(dateKey, locale, { weekday: 'long', month: 'short', day: 'numeric' });
}

export interface UsageTotals {
	seconds: number;
	memberCount: number;
	projectCount: number;
}

export function usageTotalsOf(rows: ReadonlyArray<AppUsageRow>): UsageTotals {
	return {
		seconds: sumOfSeconds(rows),
		memberCount: distinctCount(rows, (row) => row.employee.id),
		projectCount: distinctCount(rows, (row) => projectKeyOf(row.project))
	};
}

export function rowsWithTitles(rows: ReadonlyArray<AppUsageRow>, titles: ReadonlyArray<string>): AppUsageRow[] {
	const picked = new Set(titles);
	return rows.filter((row) => picked.has(row.title));
}

/** Each group's place by time, from 1, whatever order the list is read in. */
export function timeRanksOf(groups: ReadonlyArray<UsageGroup>): ReadonlyMap<string, number> {
	const byTime = [...groups];
	byTime.sort(bySecondsDescending);
	const ranks = new Map<string, number>();
	for (const [index, group] of byTime.entries()) {
		ranks.set(group.key, index + 1);
	}
	return ranks;
}

export interface MosaicRect {
	x: number;
	y: number;
	width: number;
	height: number;
}

function sumOf(values: ReadonlyArray<number>) {
	let total = 0;
	for (const value of values) {
		total += value;
	}
	return total;
}

/** How far the least square tile of a strip is from a square, laid along a side of this length. */
function worstAspectOf(areas: ReadonlyArray<number>, side: number) {
	const stripArea = sumOf(areas);
	const largest = Math.max(...areas);
	const smallest = Math.min(...areas);
	const sideSquared = side * side;
	const stripAreaSquared = stripArea * stripArea;
	const stretched = (sideSquared * largest) / stripAreaSquared;
	const squashed = stripAreaSquared / (sideSquared * smallest);
	return Math.max(stretched, squashed);
}

function areasAt(areas: ReadonlyArray<number>, indices: ReadonlyArray<number>) {
	return indices.map((index) => areas[index]);
}

/** An empty strip always takes the next tile; a strip with tiles takes it only if its worst tile gets squarer. */
function improvesStrip(stripAreas: ReadonlyArray<number>, nextArea: number, side: number) {
	if (stripAreas.length === 0) {
		return true;
	}
	const currentAspect = worstAspectOf(stripAreas, side);
	const grownAspect = worstAspectOf([...stripAreas, nextArea], side);
	return grownAspect <= currentAspect;
}

/** Lays one strip against the shorter side of the free space and returns the space left beside it. */
function placeStrip(
	indices: ReadonlyArray<number>,
	areas: ReadonlyArray<number>,
	free: MosaicRect,
	placed: MosaicRect[]
): MosaicRect {
	const stripArea = sumOf(areasAt(areas, indices));
	const isWide = free.width >= free.height;
	if (isWide) {
		const stripWidth = stripArea / free.height;
		let top = free.y;
		for (const index of indices) {
			const height = areas[index] / stripWidth;
			placed[index] = { x: free.x, y: top, width: stripWidth, height };
			top += height;
		}
		const widthLeft = Math.max(free.width - stripWidth, 0);
		return { x: free.x + stripWidth, y: free.y, width: widthLeft, height: free.height };
	}
	const stripHeight = stripArea / free.width;
	let left = free.x;
	for (const index of indices) {
		const width = areas[index] / stripHeight;
		placed[index] = { x: left, y: free.y, width, height: stripHeight };
		left += width;
	}
	const heightLeft = Math.max(free.height - stripHeight, 0);
	return { x: free.x, y: free.y + stripHeight, width: free.width, height: heightLeft };
}

function emptyRectAt(bounds: MosaicRect): MosaicRect {
	return { x: bounds.x, y: bounds.y, width: 0, height: 0 };
}

/**
 * The squarified treemap (Bruls, Huizing and van Wijk, 2000): the values, largest first, are laid in strips against
 * the shorter side of the space still free, and a strip takes the next value only while that makes its tiles
 * squarer. One rectangle per value, in the order given; a value of zero or less gets an empty one.
 */
export function squarify(values: ReadonlyArray<number>, bounds: MosaicRect): MosaicRect[] {
	const placed = values.map(() => emptyRectAt(bounds));
	const positiveValues = values.map((value) => Math.max(value, 0));
	const valueTotal = sumOf(positiveValues);
	const boundsArea = bounds.width * bounds.height;
	const hasRoom = boundsArea > 0;
	const hasValue = valueTotal > 0;
	if (!hasRoom || !hasValue) {
		return placed;
	}
	const scale = boundsArea / valueTotal;
	const areas = positiveValues.map((value) => value * scale);
	const pending: number[] = [];
	for (const [index, area] of areas.entries()) {
		if (area > 0) {
			pending.push(index);
		}
	}

	let free: MosaicRect = { ...bounds };
	let strip: number[] = [];
	let cursor = 0;
	while (cursor < pending.length) {
		const index = pending[cursor];
		const side = Math.min(free.width, free.height);
		const stripAreas = areasAt(areas, strip);
		const keepsGrowing = improvesStrip(stripAreas, areas[index], side);
		if (keepsGrowing) {
			strip.push(index);
			cursor += 1;
			continue;
		}
		free = placeStrip(strip, areas, free, placed);
		strip = [];
	}
	if (strip.length > 0) {
		placeStrip(strip, areas, free, placed);
	}
	return placed;
}

/** The mosaic names at most this many apps and sites; the rest share one closing "N others" tile. */
const MOSAIC_MAX_NAMED = 18;

/** Below this share of the period (percent) a title joins the others tile... */
const MOSAIC_MIN_SHARE = 1.5;

/** ...except the longest ones, so a period made of many short entries still names its leaders. */
const MOSAIC_ALWAYS_NAMED = 6;

export const MOSAIC_OTHERS_KEY = 'others';

export interface MosaicItem {
	key: string;
	/** The app or site; empty for the others tile. */
	title: string;
	/** The app or site's kind and a visited address, where the report gives them (#5023). */
	kind?: ActivityKind | null;
	url?: string | null;
	/** Every app or site the tile holds: its own title, or the titles merged into the others tile. */
	titles: string[];
	seconds: number;
	/** Share of the period's time. */
	share: number;
	/** Place by time among the tiles, from 0; the others tile comes last whatever its size. */
	rank: number;
	isOthers: boolean;
}

function earnsOwnTile(index: number, total: TitleTotal, share: number) {
	const isWithinCap = index < MOSAIC_MAX_NAMED;
	const isLeader = index < MOSAIC_ALWAYS_NAMED;
	const isLargeEnough = share >= MOSAIC_MIN_SHARE;
	const hasTime = total.seconds > 0;
	const isWorthNaming = isLeader || isLargeEnough;
	return isWithinCap && hasTime && isWorthNaming;
}

function titleItemOf(total: TitleTotal, rank: number, totalSeconds: number): MosaicItem {
	return {
		key: `title:${total.title}`,
		title: total.title,
		kind: total.kind ?? null,
		url: total.url ?? null,
		titles: [total.title],
		seconds: total.seconds,
		share: percentOf(total.seconds, totalSeconds),
		rank,
		isOthers: false
	};
}

function othersItemOf(rest: ReadonlyArray<TitleTotal>, rank: number, totalSeconds: number): MosaicItem {
	const seconds = sumOfSeconds(rest);
	return {
		key: MOSAIC_OTHERS_KEY,
		title: '',
		titles: rest.map((total) => total.title),
		seconds,
		share: percentOf(seconds, totalSeconds),
		rank,
		isOthers: true
	};
}

/**
 * The tiles of the mosaic, longest first: the leading apps and sites each get a tile, the smallest are merged into
 * one others tile at the end. A single leftover title keeps its own tile rather than a "1 other" tile.
 */
export function mosaicItemsOf(titleTotals: ReadonlyArray<TitleTotal>, totalSeconds: number): MosaicItem[] {
	const named: MosaicItem[] = [];
	const rest: TitleTotal[] = [];
	for (const [index, total] of titleTotals.entries()) {
		const share = percentOf(total.seconds, totalSeconds);
		if (earnsOwnTile(index, total, share)) {
			named.push(titleItemOf(total, named.length, totalSeconds));
			continue;
		}
		rest.push(total);
	}
	const hasSingleLeftover = rest.length === 1;
	if (hasSingleLeftover) {
		named.push(titleItemOf(rest[0], named.length, totalSeconds));
		return named;
	}
	if (rest.length > 1) {
		named.push(othersItemOf(rest, named.length, totalSeconds));
	}
	return named;
}

/** What a tile has room to show, from the hero tile with a large figure down to a bare tile behind its tooltip. */
export type MosaicDensity = 'hero' | 'full' | 'label' | 'mark' | 'bare';

interface TileSize {
	width: number;
	height: number;
}

const HERO_TILE: TileSize = { width: 200, height: 136 };

const FULL_TILE: TileSize = { width: 112, height: 76 };

const LABEL_TILE: TileSize = { width: 76, height: 40 };

const MARK_TILE: TileSize = { width: 28, height: 28 };

function fitsTile(rect: MosaicRect, size: TileSize) {
	const isWideEnough = rect.width >= size.width;
	const isTallEnough = rect.height >= size.height;
	return isWideEnough && isTallEnough;
}

export function mosaicDensityOf(rect: MosaicRect): MosaicDensity {
	if (fitsTile(rect, HERO_TILE)) {
		return 'hero';
	}
	if (fitsTile(rect, FULL_TILE)) {
		return 'full';
	}
	if (fitsTile(rect, LABEL_TILE)) {
		return 'label';
	}
	if (fitsTile(rect, MARK_TILE)) {
		return 'mark';
	}
	return 'bare';
}

/** Half the gap between two tiles; the mosaic's own padding gives the same gap at its edges. */
const TILE_INSET = 2;

function insetRect(rect: MosaicRect, inset: number): MosaicRect {
	const width = Math.max(rect.width - inset * 2, 0);
	const height = Math.max(rect.height - inset * 2, 0);
	return { x: rect.x + inset, y: rect.y + inset, width, height };
}

export interface MosaicTile {
	item: MosaicItem;
	rect: MosaicRect;
	density: MosaicDensity;
}

/** Tiles are buttons, so they follow the reading order: top to bottom, then left to right. */
function byReadingOrder(first: MosaicTile, second: MosaicTile) {
	const firstTop = Math.round(first.rect.y);
	const secondTop = Math.round(second.rect.y);
	if (firstTop !== secondTop) {
		return firstTop - secondTop;
	}
	return first.rect.x - second.rect.x;
}

function placedTileOf(item: MosaicItem, rect: MosaicRect): MosaicTile {
	const insetTile = insetRect(rect, TILE_INSET);
	return { item, rect: insetTile, density: mosaicDensityOf(insetTile) };
}

export function mosaicTilesOf(items: ReadonlyArray<MosaicItem>, width: number, height: number): MosaicTile[] {
	const bounds: MosaicRect = { x: 0, y: 0, width, height };
	const values = items.map((item) => item.seconds);
	const rects = squarify(values, bounds);
	const tiles = items.map((item, index) => placedTileOf(item, rects[index]));
	tiles.sort(byReadingOrder);
	return tiles;
}

export interface TeamMemberSource {
	employeeId?: string | null;
	employee?: {
		id?: string | null;
		fullName?: string | null;
		user?: { name?: string | null; imageUrl?: string | null } | null;
	} | null;
}

function teamMemberNameOf(employee: TeamMemberSource['employee']) {
	const fullName = employee?.fullName?.trim();
	if (fullName) {
		return fullName;
	}
	return employee?.user?.name?.trim() ?? '';
}

function teamMemberPersonOf(member: TeamMemberSource): UsagePerson | null {
	const employee = member.employee;
	const id = employee?.id ?? member.employeeId;
	if (!id) {
		return null;
	}
	return { id, name: teamMemberNameOf(employee), imageUrl: employee?.user?.imageUrl ?? null };
}

function byPersonName(first: UsagePerson, second: UsagePerson) {
	return first.name.localeCompare(second.name, undefined, { sensitivity: 'base' });
}

/**
 * The people a manager can narrow the report to: the members of the teams they see, plus anyone who appears in the
 * report itself (someone outside every team), each once, by name.
 */
export function filterPeopleOf(
	teamMembers: ReadonlyArray<TeamMemberSource>,
	rows: ReadonlyArray<AppUsageRow>
): UsagePerson[] {
	const people = new Map<string, UsagePerson>();
	for (const member of teamMembers) {
		const person = teamMemberPersonOf(member);
		if (!person) {
			continue;
		}
		if (people.has(person.id)) {
			continue;
		}
		people.set(person.id, person);
	}
	for (const row of rows) {
		const isKnown = people.has(row.employee.id);
		if (!isKnown) {
			people.set(row.employee.id, row.employee);
		}
	}
	const sorted = [...people.values()];
	sorted.sort(byPersonName);
	return sorted;
}
