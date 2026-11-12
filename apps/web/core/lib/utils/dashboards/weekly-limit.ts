import { addDays, endOfDay, endOfWeek, isAfter, isSameYear, startOfDay, startOfWeek } from 'date-fns';
import type { TTimeLimitReportList } from '@/core/types/schemas';
import {
	durationPartsOf,
	type LimitVerdict,
	limitVerdictOf,
	NEAR_LIMIT_SHARE,
	percentOf
} from '@/core/lib/utils/dashboard-figures';
import { localDayKeyOf } from '@/core/lib/utils/dashboard-export';
import { formatPeriod, type Period } from '@/core/lib/utils/dashboard-period';
import { dateFormatOf, localeKeyOf, type FormatLocale } from '@/core/lib/utils/workspace-formats';

export type LimitDuration = 'day' | 'week';

export type LimitGrouping = 'period' | 'member';

export type LimitReportEmployee = TTimeLimitReportList['employees'][number]['employee'];

/** Gauzy starts its weeks on Monday (`moment.updateLocale` in its app module), so weekly rows are keyed by Mondays. */
export const LIMIT_WEEK_START = 1;

const SECONDS_PER_HOUR = 3600;
/** A day is measured against a fifth of the week: Gauzy's rule for a weekly limit, and the standard week's five days. */
export const WORK_DAYS_PER_WEEK = 5;
const DAYS_PER_WEEK = 7;
const FULL_SHARE = 100;

export interface LimitMember {
	employeeId: string;
	name: string;
	imageUrl: string | null;
}

export interface LimitEntry {
	key: string;
	periodKey: string;
	periodStart: Date;
	employeeId: string;
	name: string;
	imageUrl: string | null;
	employee: LimitReportEmployee;
	used: number;
	limit: number;
	/** The member has no weekly limit of their own, so the organisation's standard day is the measure. */
	isStandardLimit: boolean;
	hasLimit: boolean;
	share: number;
	verdict: LimitVerdict;
	remaining: number;
}

export interface LimitTotals {
	used: number;
	limit: number;
	hasLimit: boolean;
	share: number;
	verdict: LimitVerdict;
	remaining: number;
	overCount: number;
	nearCount: number;
}

export interface LimitGroup {
	key: string;
	periodStart: Date | null;
	member: LimitMember | null;
	isStandardLimit: boolean;
	entries: LimitEntry[];
	totals: LimitTotals;
}

export interface LimitFigures {
	overCount: number;
	overMembers: number;
	nearCount: number;
	nearMembers: number;
	trackedMembers: number;
	totals: LimitTotals;
}

/** Week reports cover whole Monday-to-Sunday weeks, so a week's limit is never compared with part of a week. */
export function requestPeriodOf(period: Period, duration: LimitDuration): Period {
	if (duration === 'week') {
		const from = startOfWeek(period.from, { weekStartsOn: LIMIT_WEEK_START });
		const to = endOfWeek(period.to, { weekStartsOn: LIMIT_WEEK_START });
		return { from, to };
	}
	return { from: startOfDay(period.from), to: endOfDay(period.to) };
}

/**
 * The time-log service sets every bound to midnight UTC of the date's UTC day. Passing the local calendar day as that
 * UTC day keeps the bound on the day the reader picked; a local midnight east of UTC fell on the previous UTC day.
 */
export function serviceDayOf(date: Date): Date {
	return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}

export function localDateOfKey(key: string): Date | null {
	const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(key);
	if (!match) {
		return null;
	}
	const year = Number(match[1]);
	const monthIndex = Number(match[2]) - 1;
	const day = Number(match[3]);
	return new Date(year, monthIndex, day);
}

export function periodEndOf(periodStart: Date, duration: LimitDuration): Date {
	if (duration === 'week') {
		return addDays(periodStart, DAYS_PER_WEEK - 1);
	}
	return periodStart;
}

export function standardLimitOf(duration: LimitDuration, standardHoursPerDay: number): number {
	const dayLimit = standardHoursPerDay * SECONDS_PER_HOUR;
	if (duration === 'week') {
		return dayLimit * WORK_DAYS_PER_WEEK;
	}
	return dayLimit;
}

function isWithinPeriod(date: Date, period: Period) {
	const startsAfterFrom = date.getTime() >= startOfDay(period.from).getTime();
	const startsBeforeTo = date.getTime() <= period.to.getTime();
	return startsAfterFrom && startsBeforeTo;
}

function isLimitPeriodStart(date: Date, duration: LimitDuration) {
	if (duration === 'week') {
		return date.getDay() === LIMIT_WEEK_START;
	}
	return true;
}

function finiteOrZero(value: unknown) {
	const parsed = Number(value);
	if (Number.isFinite(parsed)) {
		return parsed;
	}
	return 0;
}

function userNameOf(employee: LimitReportEmployee) {
	const firstName = employee?.user?.firstName ?? '';
	const lastName = employee?.user?.lastName ?? '';
	return `${firstName} ${lastName}`.trim();
}

function nameOf(employee: LimitReportEmployee, member: LimitMember | undefined, unnamedLabel: string) {
	const memberName = member?.name.trim();
	if (memberName) {
		return memberName;
	}
	const fullName = employee?.fullName?.trim();
	if (fullName) {
		return fullName;
	}
	const userName = userNameOf(employee);
	if (userName) {
		return userName;
	}
	return unnamedLabel;
}

function imageUrlOf(employee: LimitReportEmployee, member: LimitMember | undefined) {
	const memberImage = member?.imageUrl;
	if (memberImage) {
		return memberImage;
	}
	return employee?.user?.imageUrl ?? null;
}

function measuredLimitOf(apiLimit: number, standardLimit: number) {
	if (apiLimit > 0) {
		return apiLimit;
	}
	return standardLimit;
}

function shareOf(used: number, limit: number) {
	if (limit <= 0) {
		return 0;
	}
	return percentOf(used, limit);
}

export interface LimitEntriesInput {
	reports: ReadonlyArray<TTimeLimitReportList>;
	duration: LimitDuration;
	period: Period;
	standardLimit: number;
	members: ReadonlyMap<string, LimitMember>;
	unnamedLabel: string;
}

function employeeIdOf(employee: LimitReportEmployee, itemIndex: number) {
	const employeeId = employee?.id;
	if (employeeId) {
		return employeeId;
	}
	return `unknown-${itemIndex}`;
}

function entryOf(
	item: TTimeLimitReportList['employees'][number],
	itemIndex: number,
	periodKey: string,
	periodStart: Date,
	input: LimitEntriesInput
): LimitEntry {
	const employee = item.employee;
	const employeeId = employeeIdOf(employee, itemIndex);
	const member = input.members.get(employeeId);
	const apiLimit = finiteOrZero(item.limit);
	const reportedDuration = finiteOrZero(item.duration);
	const used = Math.max(0, reportedDuration);
	const limit = measuredLimitOf(apiLimit, input.standardLimit);
	const hasLimit = limit > 0;
	return {
		key: `${periodKey}:${employeeId}`,
		periodKey,
		periodStart,
		employeeId,
		name: nameOf(employee, member, input.unnamedLabel),
		imageUrl: imageUrlOf(employee, member),
		employee,
		used,
		limit,
		isStandardLimit: apiLimit <= 0,
		hasLimit,
		share: shareOf(used, limit),
		verdict: limitVerdictOf(used, limit),
		remaining: limit - used
	};
}

/** Gauzy lists the days of the UTC range in the reader's zone, so a day just outside the period can come back. */
export function limitEntriesOf(input: LimitEntriesInput): LimitEntry[] {
	const entries: LimitEntry[] = [];
	for (const report of input.reports) {
		const periodStart = localDateOfKey(report.date);
		if (!periodStart) {
			continue;
		}
		const isInPeriod = isWithinPeriod(periodStart, input.period);
		const isPeriodStart = isLimitPeriodStart(periodStart, input.duration);
		const isKept = isInPeriod && isPeriodStart;
		if (!isKept) {
			continue;
		}
		report.employees.forEach((item, itemIndex) => {
			const entry = entryOf(item, itemIndex, report.date, periodStart, input);
			entries.push(entry);
		});
	}
	return entries;
}

export function limitTotalsOf(entries: ReadonlyArray<LimitEntry>): LimitTotals {
	let used = 0;
	let limit = 0;
	let overCount = 0;
	let nearCount = 0;
	for (const entry of entries) {
		used += entry.used;
		limit += entry.limit;
		if (entry.verdict === 'over') {
			overCount += 1;
		}
		if (entry.verdict === 'near') {
			nearCount += 1;
		}
	}
	return {
		used,
		limit,
		hasLimit: limit > 0,
		share: shareOf(used, limit),
		verdict: limitVerdictOf(used, limit),
		remaining: limit - used,
		overCount,
		nearCount
	};
}

function byShareThenName(first: LimitEntry, second: LimitEntry) {
	const shareGap = second.share - first.share;
	if (shareGap !== 0) {
		return shareGap;
	}
	return first.name.localeCompare(second.name);
}

function byPeriodStart(first: LimitEntry, second: LimitEntry) {
	return first.periodStart.getTime() - second.periodStart.getTime();
}

function groupTimeOf(group: LimitGroup) {
	return group.periodStart?.getTime() ?? 0;
}

function byGroupPeriod(first: LimitGroup, second: LimitGroup) {
	return groupTimeOf(first) - groupTimeOf(second);
}

function groupNameOf(group: LimitGroup) {
	return group.member?.name ?? '';
}

function byGroupName(first: LimitGroup, second: LimitGroup) {
	return groupNameOf(first).localeCompare(groupNameOf(second));
}

function entriesByKey(entries: ReadonlyArray<LimitEntry>, keyOf: (entry: LimitEntry) => string) {
	const buckets = new Map<string, LimitEntry[]>();
	for (const entry of entries) {
		const key = keyOf(entry);
		const bucket = buckets.get(key);
		if (bucket) {
			bucket.push(entry);
			continue;
		}
		buckets.set(key, [entry]);
	}
	return buckets;
}

function someUseStandardLimit(entries: ReadonlyArray<LimitEntry>) {
	return entries.some((entry) => entry.isStandardLimit);
}

export function groupsByPeriodOf(entries: ReadonlyArray<LimitEntry>): LimitGroup[] {
	const buckets = entriesByKey(entries, (entry) => entry.periodKey);
	const groups: LimitGroup[] = [];
	for (const [key, bucket] of buckets) {
		const sorted = [...bucket].sort(byShareThenName);
		groups.push({
			key,
			periodStart: sorted[0]?.periodStart ?? null,
			member: null,
			isStandardLimit: false,
			entries: sorted,
			totals: limitTotalsOf(sorted)
		});
	}
	groups.sort(byGroupPeriod);
	return groups;
}

export function groupsByMemberOf(entries: ReadonlyArray<LimitEntry>): LimitGroup[] {
	const buckets = entriesByKey(entries, (entry) => entry.employeeId);
	const groups: LimitGroup[] = [];
	for (const [key, bucket] of buckets) {
		const sorted = [...bucket].sort(byPeriodStart);
		const first = sorted[0];
		const member: LimitMember = {
			employeeId: key,
			name: first?.name ?? '',
			imageUrl: first?.imageUrl ?? null
		};
		groups.push({
			key,
			periodStart: null,
			member,
			isStandardLimit: someUseStandardLimit(sorted),
			entries: sorted,
			totals: limitTotalsOf(sorted)
		});
	}
	groups.sort(byGroupName);
	return groups;
}

function distinctMembersWith(entries: ReadonlyArray<LimitEntry>, verdict: LimitVerdict) {
	const ids = new Set<string>();
	for (const entry of entries) {
		if (entry.verdict === verdict) {
			ids.add(entry.employeeId);
		}
	}
	return ids.size;
}

function distinctMembersOf(entries: ReadonlyArray<LimitEntry>) {
	const ids = new Set<string>();
	for (const entry of entries) {
		ids.add(entry.employeeId);
	}
	return ids.size;
}

export function limitFiguresOf(entries: ReadonlyArray<LimitEntry>): LimitFigures {
	const totals = limitTotalsOf(entries);
	return {
		overCount: totals.overCount,
		overMembers: distinctMembersWith(entries, 'over'),
		nearCount: totals.nearCount,
		nearMembers: distinctMembersWith(entries, 'near'),
		trackedMembers: distinctMembersOf(entries),
		totals
	};
}

/** Gauzy reports a member only on the days they logged time, so a requested member who logged none has no row. */
export function membersWithoutTimeCountOf(
	requestedEmployeeIds: ReadonlyArray<string>,
	entries: ReadonlyArray<LimitEntry>
): number {
	const reportedIds = new Set<string>();
	for (const entry of entries) {
		reportedIds.add(entry.employeeId);
	}
	const requestedIds = new Set(requestedEmployeeIds);
	let count = 0;
	for (const employeeId of requestedIds) {
		const isReported = reportedIds.has(employeeId);
		if (!isReported) {
			count += 1;
		}
	}
	return count;
}

function stepDaysOf(duration: LimitDuration) {
	if (duration === 'week') {
		return DAYS_PER_WEEK;
	}
	return 1;
}

export function emptyPastPeriodCountOf(
	period: Period,
	duration: LimitDuration,
	reportedKeys: ReadonlySet<string>,
	now = new Date()
): number {
	const step = stepDaysOf(duration);
	let count = 0;
	let start = startOfDay(period.from);
	while (!isAfter(start, period.to)) {
		const hasBegun = !isAfter(start, now);
		if (!hasBegun) {
			break;
		}
		const dayKey = localDayKeyOf(start);
		const hasTime = reportedKeys.has(dayKey);
		if (!hasTime) {
			count += 1;
		}
		start = addDays(start, step);
	}
	return count;
}

function tenthTowardVerdict(share: number, roundsUp: boolean) {
	const tenths = share * 10;
	if (roundsUp) {
		return Math.floor(tenths) / 10;
	}
	return Math.ceil(tenths) / 10;
}

/**
 * The share of the limit as a whole percent, unless rounding would carry it across a threshold (100.3% shown as
 * 100% next to "Over limit"): then one decimal, rounded toward the verdict it really has.
 */
export function limitShareLabelOf(share: number, verdict: LimitVerdict): string {
	const rounded = Math.round(share);
	const roundedVerdict = limitVerdictOf(rounded, FULL_SHARE);
	if (roundedVerdict === verdict) {
		return `${rounded}%`;
	}
	const roundsUp = rounded > share;
	const tenth = tenthTowardVerdict(share, roundsUp);
	return `${tenth.toFixed(1)}%`;
}

export function clockHoursOf(seconds: number): string {
	const absoluteSeconds = Math.abs(seconds);
	const { hours, minutes } = durationPartsOf(absoluteSeconds);
	const paddedMinutes = String(minutes).padStart(2, '0');
	return `${hours}:${paddedMinutes}`;
}

export function overrunOf(remaining: number) {
	if (remaining < 0) {
		return -remaining;
	}
	return 0;
}

export function leftOf(remaining: number) {
	if (remaining > 0) {
		return remaining;
	}
	return 0;
}

const dayFormatters = new Map<string, Intl.DateTimeFormat>();

function dayFormatterOf(locale: FormatLocale, showsYear: boolean) {
	const cacheKey = `${localeKeyOf(locale)}:${showsYear}`;
	const cached = dayFormatters.get(cacheKey);
	if (cached) {
		return cached;
	}
	const options: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' };
	if (showsYear) {
		options.year = 'numeric';
	}
	const formatter = dateFormatOf(locale, options);
	dayFormatters.set(cacheKey, formatter);
	return formatter;
}

export function periodLabelOf(periodStart: Date, duration: LimitDuration, locale: FormatLocale): string {
	if (duration === 'week') {
		const periodEnd = periodEndOf(periodStart, duration);
		return formatPeriod({ from: periodStart, to: periodEnd }, locale);
	}
	const showsYear = !isSameYear(periodStart, new Date());
	return dayFormatterOf(locale, showsYear).format(periodStart);
}

export function isCurrentPeriod(periodStart: Date, duration: LimitDuration, now = new Date()) {
	const periodEnd = endOfDay(periodEndOf(periodStart, duration));
	const hasStarted = !isAfter(periodStart, now);
	const hasEnded = isAfter(now, periodEnd);
	return hasStarted && !hasEnded;
}

export type LimitHeatStep = 'empty' | 'low' | 'medium' | 'high' | 'full' | 'over' | 'unmeasured';

const HEAT_MEDIUM_SHARE = 50;
const HEAT_HIGH_SHARE = 75;

export function limitHeatStepOf(entry: LimitEntry | undefined): LimitHeatStep {
	if (!entry) {
		return 'empty';
	}
	const hasTime = entry.used > 0;
	if (!hasTime) {
		return 'empty';
	}
	if (!entry.hasLimit) {
		return 'unmeasured';
	}
	if (entry.verdict === 'over') {
		return 'over';
	}
	if (entry.share >= NEAR_LIMIT_SHARE) {
		return 'full';
	}
	if (entry.share >= HEAT_HIGH_SHARE) {
		return 'high';
	}
	if (entry.share >= HEAT_MEDIUM_SHARE) {
		return 'medium';
	}
	return 'low';
}

export interface LimitColumn {
	key: string;
	start: Date;
	isWeekend: boolean;
	isCurrent: boolean;
	isFuture: boolean;
}

const SATURDAY = 6;
const SUNDAY = 0;
const ISO_SUNDAY = 7;

export const DEFAULT_WEEKEND_DAYS: ReadonlySet<number> = new Set([SATURDAY, SUNDAY]);

function weekInfoOf(locale: Intl.Locale): unknown {
	const getWeekInfo: unknown = Reflect.get(locale, 'getWeekInfo');
	if (typeof getWeekInfo === 'function') {
		return Reflect.apply(getWeekInfo, locale, []);
	}
	return Reflect.get(locale, 'weekInfo');
}

function weekendOfWeekInfo(weekInfo: unknown): number[] | null {
	const isObject = typeof weekInfo === 'object' && weekInfo !== null;
	if (!isObject) {
		return null;
	}
	const weekend: unknown = Reflect.get(weekInfo, 'weekend');
	if (!Array.isArray(weekend)) {
		return null;
	}
	const days: number[] = [];
	for (const day of weekend) {
		if (typeof day === 'number') {
			days.push(day);
		}
	}
	return days;
}

function jsWeekdayOf(isoWeekday: number) {
	if (isoWeekday === ISO_SUNDAY) {
		return SUNDAY;
	}
	return isoWeekday;
}

/** The reader's weekend (Friday and Saturday in some locales), Saturday and Sunday where the browser cannot say. */
export function weekendDaysOf(locale: string): ReadonlySet<number> {
	try {
		const intlLocale = new Intl.Locale(locale);
		const weekInfo = weekInfoOf(intlLocale);
		const weekend = weekendOfWeekInfo(weekInfo);
		if (!weekend) {
			return DEFAULT_WEEKEND_DAYS;
		}
		const hasWeekend = weekend.length > 0;
		if (!hasWeekend) {
			return DEFAULT_WEEKEND_DAYS;
		}
		const jsWeekdays = weekend.map(jsWeekdayOf);
		return new Set(jsWeekdays);
	} catch {
		return DEFAULT_WEEKEND_DAYS;
	}
}

/** One column per day or per Monday-to-Sunday week of the shown period, future ones included as empty slots. */
export function limitColumnsOf(
	period: Period,
	duration: LimitDuration,
	weekendDays: ReadonlySet<number>,
	now = new Date()
): LimitColumn[] {
	const step = stepDaysOf(duration);
	const isDayColumn = duration === 'day';
	const columns: LimitColumn[] = [];
	let start = startOfDay(period.from);
	while (!isAfter(start, period.to)) {
		const isWeekendDay = weekendDays.has(start.getDay());
		columns.push({
			key: localDayKeyOf(start),
			start,
			isWeekend: isDayColumn && isWeekendDay,
			isCurrent: isCurrentPeriod(start, duration, now),
			isFuture: isAfter(start, now)
		});
		start = addDays(start, step);
	}
	return columns;
}

export interface LimitMonthSegment {
	key: string;
	start: Date;
	firstIndex: number;
	length: number;
}

export function limitMonthSegmentsOf(columns: ReadonlyArray<LimitColumn>): LimitMonthSegment[] {
	const segments: LimitMonthSegment[] = [];
	columns.forEach((column, index) => {
		const last = segments.at(-1);
		const monthKey = column.key.slice(0, 7);
		const isSameMonth = last?.key === monthKey;
		if (last && isSameMonth) {
			last.length += 1;
			return;
		}
		segments.push({ key: monthKey, start: column.start, firstIndex: index, length: 1 });
	});
	return segments;
}

export interface LimitMatrixRow {
	key: string;
	member: LimitMember;
	isStandardLimit: boolean;
	entriesByColumn: ReadonlyMap<string, LimitEntry>;
	totals: LimitTotals;
}

function entriesByColumnOf(entries: ReadonlyArray<LimitEntry>) {
	const byColumn = new Map<string, LimitEntry>();
	for (const entry of entries) {
		const columnKey = localDayKeyOf(entry.periodStart);
		byColumn.set(columnKey, entry);
	}
	return byColumn;
}

/** The heatmap reads the member groups: one row per member who tracked time, the days or weeks as columns. */
export function limitMatrixRowsOf(memberGroups: ReadonlyArray<LimitGroup>): LimitMatrixRow[] {
	const rows: LimitMatrixRow[] = [];
	for (const group of memberGroups) {
		const member = group.member;
		if (!member) {
			continue;
		}
		rows.push({
			key: group.key,
			member,
			isStandardLimit: group.isStandardLimit,
			entriesByColumn: entriesByColumnOf(group.entries),
			totals: group.totals
		});
	}
	return rows;
}

export type AttentionVerdict = Exclude<LimitVerdict, 'within'>;

export interface LimitAttention {
	key: string;
	member: LimitMember;
	verdict: AttentionVerdict;
	/** Summed over the periods that raise the flag only: the over ones, or the near ones when none is over. */
	used: number;
	limit: number;
	share: number;
	overrun: number;
	flaggedCount: number;
	nearCount: number;
}

function entriesWithVerdict(entries: ReadonlyArray<LimitEntry>, verdict: LimitVerdict) {
	return entries.filter((entry) => entry.verdict === verdict);
}

function flaggedEntriesOf(overEntries: LimitEntry[], nearEntries: LimitEntry[]) {
	if (overEntries.length > 0) {
		return overEntries;
	}
	return nearEntries;
}

function attentionVerdictOf(overEntries: LimitEntry[]): AttentionVerdict {
	if (overEntries.length > 0) {
		return 'over';
	}
	return 'near';
}

function attentionOf(group: LimitGroup): LimitAttention | null {
	const member = group.member;
	if (!member) {
		return null;
	}
	const overEntries = entriesWithVerdict(group.entries, 'over');
	const nearEntries = entriesWithVerdict(group.entries, 'near');
	const hasOver = overEntries.length > 0;
	const hasNear = nearEntries.length > 0;
	const needsAttention = hasOver || hasNear;
	if (!needsAttention) {
		return null;
	}
	const flagged = flaggedEntriesOf(overEntries, nearEntries);
	const flaggedTotals = limitTotalsOf(flagged);
	return {
		key: group.key,
		member,
		verdict: attentionVerdictOf(overEntries),
		used: flaggedTotals.used,
		limit: flaggedTotals.limit,
		share: flaggedTotals.share,
		overrun: overrunOf(flaggedTotals.remaining),
		flaggedCount: flagged.length,
		nearCount: nearEntries.length
	};
}

function verdictRankOf(attention: LimitAttention) {
	if (attention.verdict === 'over') {
		return 0;
	}
	return 1;
}

function byAttention(first: LimitAttention, second: LimitAttention) {
	const rankGap = verdictRankOf(first) - verdictRankOf(second);
	if (rankGap !== 0) {
		return rankGap;
	}
	const overrunGap = second.overrun - first.overrun;
	if (overrunGap !== 0) {
		return overrunGap;
	}
	const shareGap = second.share - first.share;
	if (shareGap !== 0) {
		return shareGap;
	}
	return first.member.name.localeCompare(second.member.name);
}

/** Members over or near their limit on at least one day or week of the period, the largest overrun first. */
export function limitAttentionOf(memberGroups: ReadonlyArray<LimitGroup>): LimitAttention[] {
	const items: LimitAttention[] = [];
	for (const group of memberGroups) {
		const attention = attentionOf(group);
		if (attention) {
			items.push(attention);
		}
	}
	items.sort(byAttention);
	return items;
}

function byMemberName(first: LimitMember, second: LimitMember) {
	return first.name.localeCompare(second.name);
}

/** The requested members Gauzy did not report, by name: they tracked no time in the period. */
export function membersWithoutTimeOf(
	requestedEmployeeIds: ReadonlyArray<string>,
	entries: ReadonlyArray<LimitEntry>,
	members: ReadonlyMap<string, LimitMember>
): LimitMember[] {
	const reportedIds = new Set<string>();
	for (const entry of entries) {
		reportedIds.add(entry.employeeId);
	}
	const requestedIds = new Set(requestedEmployeeIds);
	const missing: LimitMember[] = [];
	for (const employeeId of requestedIds) {
		const isReported = reportedIds.has(employeeId);
		const member = members.get(employeeId);
		if (isReported) {
			continue;
		}
		if (member) {
			missing.push(member);
		}
	}
	missing.sort(byMemberName);
	return missing;
}
