import { isAfter, isSameDay, startOfDay } from 'date-fns';
import type { DayBarDatum } from '@/core/components/dashboards/kit/day-bars-chart';
import type { DailyReportRow } from '@/core/lib/utils/daily-report-figures';
import { formatPercent, type ShareRow, shareRowsOf } from '@/core/lib/utils/dashboard-figures';
import { localDayKeyOf } from '@/core/lib/utils/dashboard-export';
import { daysOfPeriod, type Period, type WeekStart } from '@/core/lib/utils/dashboard-period';
import {
	clockTimeOf,
	endOfLog,
	logDurationSeconds,
	NO_PROJECT_VALUE,
	projectValueOf,
	startOfLog,
	statusOfLog,
	workDayOfLog
} from '@/core/lib/utils/dashboards/timesheets';
import { dateFormatOf, hasDateFormat, type FormatLocale } from '@/core/lib/utils/workspace-formats';
import { ETimeLogType } from '@/core/types/generics/enums/timer';
import type { ETimesheetStatus } from '@/core/types/generics/enums/timesheet';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import type { TOrganizationTeam } from '@/core/types/schemas';

export const MANUAL_EDITS_WEEK_START: WeekStart = 1;

export type ChangeAction = 'all' | 'added' | 'edited';

export type EditsGrouping = 'day' | 'member';

export type BillableValue = 'billable' | 'non-billable';

export const BILLABLE_VALUES: ReadonlyArray<BillableValue> = ['billable', 'non-billable'];

export interface EditsFilters {
	members: string[];
	projects: string[];
	billable: string[];
}

export type EditsFilterField = keyof EditsFilters;

export const EMPTY_EDITS_FILTERS: EditsFilters = { members: [], projects: [], billable: [] };

export interface EditsMember {
	employeeId: string;
	name: string;
	imageUrl: string | null;
}

/** One log changed by hand: added (the MANUAL log type), edited after it was recorded, or both. */
export interface ManualTimeEntry {
	key: string;
	log: ITimeLog;
	day: Date;
	dayKey: string;
	employeeId: string;
	memberName: string;
	memberImageUrl: string | null;
	projectValue: string;
	projectName: string | null;
	projectColor: string | null;
	taskTitle: string | null;
	start: Date | null;
	end: Date | null;
	seconds: number;
	isAdded: boolean;
	isEdited: boolean;
	editedAt: Date | null;
	isBillable: boolean;
	status: ETimesheetStatus | null;
	reason: string | null;
}

type TeamMember = NonNullable<TOrganizationTeam['members']>[number];

function memberNameOf(member: TeamMember) {
	const employeeName = member.employee?.fullName?.trim();
	if (employeeName) {
		return employeeName;
	}
	const userName = member.employee?.user?.name?.trim();
	if (userName) {
		return userName;
	}
	return member.fullName?.trim() ?? '';
}

function memberImageOf(member: TeamMember) {
	const employeeImage = member.employee?.user?.imageUrl;
	if (employeeImage) {
		return employeeImage;
	}
	return member.user?.imageUrl ?? null;
}

function byMemberName(first: EditsMember, second: EditsMember) {
	return first.name.localeCompare(second.name);
}

export function teamMembersOf(members: TOrganizationTeam['members']): EditsMember[] {
	const byEmployee = new Map<string, EditsMember>();
	for (const member of members ?? []) {
		const employeeId = member.employeeId;
		const isKnown = !employeeId || byEmployee.has(employeeId);
		if (isKnown) {
			continue;
		}
		byEmployee.set(employeeId, {
			employeeId,
			name: memberNameOf(member),
			imageUrl: memberImageOf(member)
		});
	}
	const list = [...byEmployee.values()];
	list.sort(byMemberName);
	return list;
}

export function membersByIdOf(members: ReadonlyArray<EditsMember>) {
	const byId = new Map<string, EditsMember>();
	for (const member of members) {
		byId.set(member.employeeId, member);
	}
	return byId;
}

function validDateOf(value: Date | string | null | undefined): Date | null {
	if (!value) {
		return null;
	}
	const date = new Date(value);
	const isInvalid = Number.isNaN(date.getTime());
	if (isInvalid) {
		return null;
	}
	return date;
}

function employeeIdOfLog(log: ITimeLog) {
	return log.employee?.id ?? log.employeeId ?? '';
}

function logMemberNameOf(log: ITimeLog, member: EditsMember | undefined, unnamedLabel: string) {
	const teamName = member?.name;
	if (teamName) {
		return teamName;
	}
	const employeeName = log.employee?.fullName?.trim();
	if (employeeName) {
		return employeeName;
	}
	const userName = log.employee?.user?.name?.trim();
	if (userName) {
		return userName;
	}
	return unnamedLabel;
}

function logMemberImageOf(log: ITimeLog, member: EditsMember | undefined) {
	const teamImage = member?.imageUrl;
	if (teamImage) {
		return teamImage;
	}
	return log.employee?.user?.imageUrl ?? null;
}

function reasonOf(log: ITimeLog) {
	const reason = log.reason?.trim();
	if (!reason) {
		return null;
	}
	return reason;
}

function taskTitleOf(log: ITimeLog) {
	const title = log.task?.title?.trim();
	if (!title) {
		return null;
	}
	return title;
}

interface ChangedLog {
	log: ITimeLog;
	isListedAdded: boolean;
	isListedEdited: boolean;
}

function entryOf(
	changed: ChangedLog,
	members: ReadonlyMap<string, EditsMember>,
	unnamedLabel: string
): ManualTimeEntry | null {
	const { log } = changed;
	const day = workDayOfLog(log);
	if (!day) {
		return null;
	}
	const employeeId = employeeIdOfLog(log);
	const member = members.get(employeeId);
	const editedAt = validDateOf(log.editedAt);
	const isManualType = log.logType === ETimeLogType.MANUAL;
	const hasEditDate = editedAt !== null;
	return {
		key: log.id,
		log,
		day,
		dayKey: localDayKeyOf(day),
		employeeId,
		memberName: logMemberNameOf(log, member, unnamedLabel),
		memberImageUrl: logMemberImageOf(log, member),
		projectValue: projectValueOf(log),
		projectName: log.project?.name ?? null,
		projectColor: log.project?.color ?? null,
		taskTitle: taskTitleOf(log),
		start: startOfLog(log),
		end: endOfLog(log),
		seconds: logDurationSeconds(log),
		isAdded: changed.isListedAdded || isManualType,
		isEdited: changed.isListedEdited || hasEditDate,
		editedAt,
		isBillable: Boolean(log.isBillable),
		status: statusOfLog(log),
		reason: reasonOf(log)
	};
}

/** The two reads merged by log id: a log added by hand and edited later is one entry carrying both marks. */
export function changedEntriesOf({
	addedLogs,
	editedLogs,
	members,
	unnamedLabel
}: Readonly<{
	addedLogs: ReadonlyArray<ITimeLog>;
	editedLogs: ReadonlyArray<ITimeLog>;
	members: ReadonlyMap<string, EditsMember>;
	unnamedLabel: string;
}>): ManualTimeEntry[] {
	const byId = new Map<string, ChangedLog>();
	for (const log of addedLogs) {
		byId.set(log.id, { log, isListedAdded: true, isListedEdited: false });
	}
	for (const log of editedLogs) {
		const existing = byId.get(log.id);
		if (existing) {
			existing.isListedEdited = true;
			continue;
		}
		byId.set(log.id, { log, isListedAdded: false, isListedEdited: true });
	}
	const entries: ManualTimeEntry[] = [];
	for (const changed of byId.values()) {
		const entry = entryOf(changed, members, unnamedLabel);
		if (entry) {
			entries.push(entry);
		}
	}
	return entries;
}

function matchesPicked(value: string, picked: ReadonlyArray<string>) {
	if (picked.length === 0) {
		return true;
	}
	return picked.includes(value);
}

function billableValueOf(entry: ManualTimeEntry): BillableValue {
	if (entry.isBillable) {
		return 'billable';
	}
	return 'non-billable';
}

/** Projects and billable narrow the loaded entries (logs without a project cannot be asked of Gauzy by id). */
export function entryMatchesFilters(entry: ManualTimeEntry, filters: EditsFilters) {
	const matchesProject = matchesPicked(entry.projectValue, filters.projects);
	const matchesBillable = matchesPicked(billableValueOf(entry), filters.billable);
	return matchesProject && matchesBillable;
}

export function entryMatchesAction(entry: ManualTimeEntry, action: ChangeAction) {
	if (action === 'added') {
		return entry.isAdded;
	}
	if (action === 'edited') {
		return entry.isEdited;
	}
	return true;
}

export interface EditsFigures {
	entryCount: number;
	manualSeconds: number;
	addedCount: number;
	addedSeconds: number;
	editedCount: number;
	editedSeconds: number;
	memberCount: number;
}

/** Added and edited are counted apart and never netted: an entry that is both counts in each. */
export function editsFiguresOf(entries: ReadonlyArray<ManualTimeEntry>): EditsFigures {
	const figures: EditsFigures = {
		entryCount: 0,
		manualSeconds: 0,
		addedCount: 0,
		addedSeconds: 0,
		editedCount: 0,
		editedSeconds: 0,
		memberCount: 0
	};
	const members = new Set<string>();
	for (const entry of entries) {
		figures.entryCount += 1;
		figures.manualSeconds += entry.seconds;
		members.add(entry.employeeId);
		if (entry.isAdded) {
			figures.addedCount += 1;
			figures.addedSeconds += entry.seconds;
		}
		if (entry.isEdited) {
			figures.editedCount += 1;
			figures.editedSeconds += entry.seconds;
		}
	}
	figures.memberCount = members.size;
	return figures;
}

export function totalSecondsOfEntries(entries: ReadonlyArray<ManualTimeEntry>) {
	let total = 0;
	for (const entry of entries) {
		total += entry.seconds;
	}
	return total;
}

function rowProjectValueOf(row: DailyReportRow) {
	if (row.projectId) {
		return row.projectId;
	}
	return NO_PROJECT_VALUE;
}

/** All the time of the daily report (every log type) on the picked projects, the base of the manual share. */
export function trackedSecondsOf(rows: ReadonlyArray<DailyReportRow>, projects: ReadonlyArray<string>) {
	let total = 0;
	for (const row of rows) {
		const projectValue = rowProjectValueOf(row);
		const isPicked = matchesPicked(projectValue, projects);
		if (isPicked) {
			total += row.seconds;
		}
	}
	return total;
}

function startTimeOf(entry: ManualTimeEntry) {
	if (!entry.start) {
		return 0;
	}
	return entry.start.getTime();
}

function byStartAscending(first: ManualTimeEntry, second: ManualTimeEntry) {
	return startTimeOf(first) - startTimeOf(second);
}

function byDayDescendingThenStart(first: ManualTimeEntry, second: ManualTimeEntry) {
	const dayDifference = second.day.getTime() - first.day.getTime();
	if (dayDifference !== 0) {
		return dayDifference;
	}
	return byStartAscending(first, second);
}

export interface EditsGroup {
	key: string;
	day: Date | null;
	member: EditsMember | null;
	entries: ManualTimeEntry[];
	seconds: number;
}

export function groupsByDayOf(entries: ReadonlyArray<ManualTimeEntry>): EditsGroup[] {
	const byDay = new Map<string, EditsGroup>();
	for (const entry of entries) {
		const existing = byDay.get(entry.dayKey);
		if (existing) {
			existing.entries.push(entry);
			continue;
		}
		byDay.set(entry.dayKey, { key: entry.dayKey, day: entry.day, member: null, entries: [entry], seconds: 0 });
	}
	const groups = [...byDay.values()];
	for (const group of groups) {
		group.entries.sort(byStartAscending);
		group.seconds = totalSecondsOfEntries(group.entries);
	}
	groups.sort(byGroupDayDescending);
	return groups;
}

function groupTimeOf(group: EditsGroup) {
	if (!group.day) {
		return 0;
	}
	return group.day.getTime();
}

function byGroupDayDescending(first: EditsGroup, second: EditsGroup) {
	return groupTimeOf(second) - groupTimeOf(first);
}

function groupMemberOf(entry: ManualTimeEntry): EditsMember {
	return { employeeId: entry.employeeId, name: entry.memberName, imageUrl: entry.memberImageUrl };
}

function byGroupMemberName(first: EditsGroup, second: EditsGroup) {
	const firstName = first.member?.name ?? '';
	const secondName = second.member?.name ?? '';
	return firstName.localeCompare(secondName);
}

export function groupsByMemberOf(entries: ReadonlyArray<ManualTimeEntry>): EditsGroup[] {
	const byMember = new Map<string, EditsGroup>();
	for (const entry of entries) {
		const existing = byMember.get(entry.employeeId);
		if (existing) {
			existing.entries.push(entry);
			continue;
		}
		const member = groupMemberOf(entry);
		byMember.set(entry.employeeId, { key: entry.employeeId, day: null, member, entries: [entry], seconds: 0 });
	}
	const groups = [...byMember.values()];
	for (const group of groups) {
		group.entries.sort(byDayDescendingThenStart);
		group.seconds = totalSecondsOfEntries(group.entries);
	}
	groups.sort(byGroupMemberName);
	return groups;
}

export function groupsOf(entries: ReadonlyArray<ManualTimeEntry>, grouping: EditsGrouping) {
	if (grouping === 'member') {
		return groupsByMemberOf(entries);
	}
	return groupsByDayOf(entries);
}

export interface ChartDayLabels {
	label: (day: Date) => string;
	axisLabel: (day: Date) => string;
}

interface DaySums {
	seconds: number;
	editedSeconds: number;
}

function daySumsOf(entries: ReadonlyArray<ManualTimeEntry>) {
	const byDay = new Map<string, DaySums>();
	for (const entry of entries) {
		const sums = byDay.get(entry.dayKey) ?? { seconds: 0, editedSeconds: 0 };
		sums.seconds += entry.seconds;
		if (entry.isEdited) {
			sums.editedSeconds += entry.seconds;
		}
		byDay.set(entry.dayKey, sums);
	}
	return byDay;
}

export function chartDaysOf(
	period: Period,
	entries: ReadonlyArray<ManualTimeEntry>,
	labels: ChartDayLabels,
	now = new Date()
): DayBarDatum[] {
	const sums = daySumsOf(entries);
	const today = startOfDay(now);
	return daysOfPeriod(period).map((day) => {
		const key = localDayKeyOf(day);
		const daySums = sums.get(key);
		return {
			key,
			label: labels.label(day),
			axisLabel: labels.axisLabel(day),
			value: daySums?.seconds ?? 0,
			part: daySums?.editedSeconds ?? 0,
			isToday: isSameDay(day, today),
			isFuture: isAfter(day, today)
		};
	});
}

export function maxChartSecondsOf(days: ReadonlyArray<DayBarDatum>) {
	let max = 0;
	for (const day of days) {
		max = Math.max(max, day.value);
	}
	return max;
}

export function selectedEntriesOf(entries: ReadonlyArray<ManualTimeEntry>, selectedIds: ReadonlySet<string>) {
	return entries.filter((entry) => selectedIds.has(entry.key));
}

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const MONTH_MS = 30 * DAY_MS;
const YEAR_MS = 365 * DAY_MS;

interface RelativeUnit {
	unit: Intl.RelativeTimeFormatUnit;
	milliseconds: number;
}

function relativeUnitOf(distance: number): RelativeUnit {
	if (distance < HOUR_MS) {
		return { unit: 'minute', milliseconds: MINUTE_MS };
	}
	if (distance < DAY_MS) {
		return { unit: 'hour', milliseconds: HOUR_MS };
	}
	if (distance < MONTH_MS) {
		return { unit: 'day', milliseconds: DAY_MS };
	}
	if (distance < YEAR_MS) {
		return { unit: 'month', milliseconds: MONTH_MS };
	}
	return { unit: 'year', milliseconds: YEAR_MS };
}

export function relativeTimeTextOf(date: Date, locale: string, now = new Date()) {
	const format = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
	const elapsed = date.getTime() - now.getTime();
	const distance = Math.abs(elapsed);
	const { unit, milliseconds } = relativeUnitOf(distance);
	const amount = Math.round(elapsed / milliseconds);
	return format.format(amount, unit);
}

/** `2026-11-04 10:12`, local and 24-hour, for files read by spreadsheets. */
export function clockDateTimeOf(date: Date | null) {
	if (!date) {
		return '';
	}
	const day = localDayKeyOf(date);
	const hours = String(date.getHours()).padStart(2, '0');
	const minutes = String(date.getMinutes()).padStart(2, '0');
	return `${day} ${hours}:${minutes}`;
}

const PDF_DAY_OPTIONS: Intl.DateTimeFormatOptions = { year: 'numeric', month: '2-digit', day: '2-digit' };

/**
 * The day of a line of the PDF, which people read: `04/11/2026` in the date format the workspace chose, and
 * `2026-11-04`, as in the files, while it chose none.
 */
export function pdfDayOf(day: Date, locale: FormatLocale) {
	if (!hasDateFormat(locale)) {
		return localDayKeyOf(day);
	}
	const format = dateFormatOf(locale, PDF_DAY_OPTIONS);
	return format.format(day);
}

/** The same for a moment of a line of the PDF: its day, then the local 24-hour time the files write. */
export function pdfDateTimeOf(date: Date | null, locale: FormatLocale) {
	if (!date) {
		return '';
	}
	const day = pdfDayOf(date, locale);
	const time = clockTimeOf(date);
	return `${day} ${time}`;
}

export const FEED_VISIBLE_ENTRIES = 8;

export type RailPosition = 'only' | 'first' | 'middle' | 'last';

export function railPositionOf(index: number, count: number): RailPosition {
	const isFirst = index === 0;
	const isLast = index === count - 1;
	const isOnly = isFirst && isLast;
	if (isOnly) {
		return 'only';
	}
	if (isFirst) {
		return 'first';
	}
	if (isLast) {
		return 'last';
	}
	return 'middle';
}

export interface ManualRankItem {
	key: string;
	name: string | null;
	imageUrl: string | null;
	color: string | null;
	seconds: number;
	count: number;
}

export interface ManualRankRow {
	key: string;
	item: ManualRankItem | null;
	seconds: number;
	count: number;
	share: number;
	/** How many members or projects the closing "N other" row holds. */
	otherCount: number;
}

export interface ManualRankings {
	members: ManualRankRow[];
	projects: ManualRankRow[];
}

export const RANKED_ROW_COUNT = 5;

function addToRank(byKey: Map<string, ManualRankItem>, seed: ManualRankItem, seconds: number) {
	const existing = byKey.get(seed.key);
	if (existing) {
		existing.seconds += seconds;
		existing.count += 1;
		return;
	}
	byKey.set(seed.key, { ...seed, seconds, count: 1 });
}

function memberSeedOf(entry: ManualTimeEntry): ManualRankItem {
	return {
		key: entry.employeeId,
		name: entry.memberName,
		imageUrl: entry.memberImageUrl,
		color: null,
		seconds: 0,
		count: 0
	};
}

function projectSeedOf(entry: ManualTimeEntry): ManualRankItem {
	return {
		key: entry.projectValue,
		name: entry.projectName,
		imageUrl: null,
		color: entry.projectColor,
		seconds: 0,
		count: 0
	};
}

function rankSecondsOf(item: ManualRankItem) {
	return item.seconds;
}

function rankKeyOf(item: ManualRankItem) {
	return item.key;
}

function entryCountOf(items: ReadonlyArray<ManualRankItem>) {
	let total = 0;
	for (const item of items) {
		total += item.count;
	}
	return total;
}

function rankRowsOf(items: ReadonlyArray<ManualRankItem>): ManualRankRow[] {
	const shareRows: ShareRow<ManualRankItem>[] = shareRowsOf(items, rankSecondsOf, rankKeyOf, RANKED_ROW_COUNT);
	const totalCount = entryCountOf(items);
	let leadingCount = 0;
	const rows: ManualRankRow[] = [];
	for (const row of shareRows) {
		const item = row.item;
		if (item) {
			leadingCount += item.count;
			rows.push({ key: row.key, item, seconds: row.value, count: item.count, share: row.share, otherCount: 0 });
			continue;
		}
		const restCount = totalCount - leadingCount;
		rows.push({
			key: row.key,
			item: null,
			seconds: row.value,
			count: restCount,
			share: row.share,
			otherCount: row.otherCount
		});
	}
	return rows;
}

export function manualRankingsOf(entries: ReadonlyArray<ManualTimeEntry>): ManualRankings {
	const byMember = new Map<string, ManualRankItem>();
	const byProject = new Map<string, ManualRankItem>();
	for (const entry of entries) {
		const memberSeed = memberSeedOf(entry);
		const projectSeed = projectSeedOf(entry);
		addToRank(byMember, memberSeed, entry.seconds);
		addToRank(byProject, projectSeed, entry.seconds);
	}
	const memberItems = [...byMember.values()];
	const projectItems = [...byProject.values()];
	return { members: rankRowsOf(memberItems), projects: rankRowsOf(projectItems) };
}

const ONE_PERCENT = 1;

/** A share under one percent reads "<1%", never "0%", so a small but real amount of manual time does not vanish. */
export function sharePercentTextOf(percent: number, locale: string) {
	const isBelowOnePercent = percent > 0 && percent < ONE_PERCENT;
	if (isBelowOnePercent) {
		const onePercent = formatPercent(ONE_PERCENT, locale);
		return `<${onePercent}`;
	}
	return formatPercent(percent, locale);
}
