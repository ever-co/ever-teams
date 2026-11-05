import { isSameYear, isToday, isYesterday, startOfWeek } from 'date-fns';
import type { DayBarDatum } from '@/core/components/dashboards/kit/day-bars-chart';
import { localDayKeyOf } from '@/core/lib/utils/dashboard-export';
import { formatAmount } from '@/core/lib/utils/daily-report-figures';
import type { TOwedReportDay, TOwedReportEmployee } from '@/core/types/schemas/timer/time-log-reports.schema';

export type PaymentsGrouping = 'member' | 'day';

/** Which of the member's rates priced the line: their pay rate, or their billing rate while no pay rate is set. */
export type OwedRateSource = 'pay' | 'billing';

export const PAYMENTS_WEEK_START = 1;

const SECONDS_PER_HOUR = 3600;

const CURRENCY_KEY_PREFIX = 'currency:';

export type PaymentsChartKey = 'tracked' | 'unpriced' | `${typeof CURRENCY_KEY_PREFIX}${string}`;

export const MAX_CURRENCY_FIGURES = 3;

export interface PaymentsMember {
	employeeId: string;
	name: string;
	imageUrl: string | null;
}

/** One member on one day, as Gauzy returned it. `amount` is null when the member has no rate. */
export interface OwedLine {
	key: string;
	dateKey: string;
	day: Date;
	employeeId: string;
	name: string;
	imageUrl: string | null;
	seconds: number;
	rate: number | null;
	currency: string | null;
	amount: number | null;
	/** Null when the server does not say, as before pay rates existed: the billing rate priced it, with no note. */
	rateSource: OwedRateSource | null;
}

export interface OwedMemberGroup {
	key: string;
	employeeId: string;
	name: string;
	imageUrl: string | null;
	rate: number | null;
	currency: string | null;
	seconds: number;
	amount: number | null;
	rateSource: OwedRateSource | null;
	lines: OwedLine[];
}

export interface OwedCurrencyTotal {
	key: string;
	currency: string | null;
	amount: number;
	seconds: number;
	memberCount: number;
}

export interface OwedDayGroup {
	key: string;
	day: Date;
	seconds: number;
	subtotals: OwedCurrencyTotal[];
	unpricedSeconds: number;
	lines: OwedLine[];
}

export interface UnpricedTotal {
	seconds: number;
	memberCount: number;
}

export interface OwedFigures {
	currencies: OwedCurrencyTotal[];
	trackedSeconds: number;
	trackedMemberCount: number;
	unpriced: UnpricedTotal;
}

export interface OwedExportRow {
	member: string;
	dateKey: string | null;
	seconds: number;
	rate: number | null;
	currency: string | null;
	amount: number | null;
}

function finiteOrZero(value: unknown) {
	const parsed = Number(value);
	if (Number.isFinite(parsed)) {
		return parsed;
	}
	return 0;
}

/** Gauzy prices time with the rate as it is stored: a missing or zero rate means no amount, never `$0`. */
export function rateOf(value: number | null | undefined): number | null {
	const rate = finiteOrZero(value);
	if (rate <= 0) {
		return null;
	}
	return rate;
}

function trimmedOrNull(value: string | null | undefined) {
	const trimmed = value?.trim();
	if (!trimmed) {
		return null;
	}
	return trimmed;
}

/** The member's own rate currency, else the organisation's; with neither the amount stays a bare number. */
export function currencyOf(billRateCurrency: string | null | undefined, organizationCurrency: string | null) {
	const memberCurrency = trimmedOrNull(billRateCurrency);
	if (memberCurrency) {
		return memberCurrency;
	}
	return trimmedOrNull(organizationCurrency);
}

export function currencyKeyOf(currency: string | null) {
	return currency ?? '';
}

export function chartKeyOfCurrency(currency: string | null): PaymentsChartKey {
	const currencyKey = currencyKeyOf(currency);
	return `${CURRENCY_KEY_PREFIX}${currencyKey}`;
}

export function isCurrencyChartKey(key: PaymentsChartKey) {
	return key.startsWith(CURRENCY_KEY_PREFIX);
}

function currencyKeyOfChartKey(key: PaymentsChartKey) {
	return key.slice(CURRENCY_KEY_PREFIX.length);
}

export function dateOfDayKey(key: string): Date | null {
	const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(key);
	if (!match) {
		return null;
	}
	const year = Number(match[1]);
	const monthIndex = Number(match[2]) - 1;
	const day = Number(match[3]);
	return new Date(year, monthIndex, day);
}

function joinedName(firstName: string | null | undefined, lastName: string | null | undefined) {
	const parts = [firstName?.trim(), lastName?.trim()];
	const presentParts = parts.filter(Boolean);
	return presentParts.join(' ');
}

function reportNameOf(employee: TOwedReportEmployee) {
	const user = employee.user;
	const fullName = joinedName(user?.firstName, user?.lastName);
	if (fullName) {
		return fullName;
	}
	return user?.name?.trim() ?? '';
}

/** The team knows a member's name and picture even when the report's user lacks them. */
function nameOf(employee: TOwedReportEmployee, member: PaymentsMember | undefined, unnamedLabel: string) {
	const teamName = member?.name;
	if (teamName) {
		return teamName;
	}
	const reportName = reportNameOf(employee);
	if (reportName) {
		return reportName;
	}
	return unnamedLabel;
}

function imageOf(employee: TOwedReportEmployee, member: PaymentsMember | undefined) {
	const teamImage = member?.imageUrl;
	if (teamImage) {
		return teamImage;
	}
	return employee.user?.imageUrl ?? null;
}

function amountOf(rate: number | null, reportedAmount: number) {
	if (rate === null) {
		return null;
	}
	return finiteOrZero(reportedAmount);
}

export function rateSourceOf(value: unknown): OwedRateSource | null {
	if (value === 'pay') {
		return 'pay';
	}
	if (value === 'billing') {
		return 'billing';
	}
	return null;
}

/** The pay rate falls back to the billing rate, which the screen says, only when the server states it. */
export function fallsBackToBillingRate(rateSource: OwedRateSource | null) {
	return rateSource === 'billing';
}

type OwedReportEntry = TOwedReportDay['employees'][number];

function isPaidAtPayRate(entry: OwedReportEntry) {
	return rateSourceOf(entry.rateSource) === 'pay';
}

const CENTS = 100;

function roundedToCents(value: number) {
	return Math.round(value * CENTS) / CENTS;
}

/**
 * The pay rate behind each member's lines. The report states the amount and its currency, never the pay rate, which
 * no team or report read returns. One rate prices all of a member's lines, so it is their amount over their hours,
 * summed over the period so the rounding of each day's amount does not show.
 */
function payRatesOf(report: ReadonlyArray<TOwedReportDay>) {
	const totals = new Map<string, { amount: number; seconds: number }>();
	for (const reportDay of report) {
		for (const entry of reportDay.employees ?? []) {
			const employeeId = entry.employee?.id;
			const isPayLine = isPaidAtPayRate(entry);
			if (!employeeId || !isPayLine) {
				continue;
			}
			const total = totals.get(employeeId) ?? { amount: 0, seconds: 0 };
			total.amount += finiteOrZero(entry.amount);
			total.seconds += finiteOrZero(entry.duration);
			totals.set(employeeId, total);
		}
	}
	const rates = new Map<string, number>();
	for (const [employeeId, total] of totals) {
		if (total.seconds <= 0) {
			continue;
		}
		const hours = total.seconds / SECONDS_PER_HOUR;
		rates.set(employeeId, roundedToCents(total.amount / hours));
	}
	return rates;
}

function lineCurrencyOf(entry: OwedReportEntry, employee: TOwedReportEmployee, organizationCurrency: string | null) {
	const reportedCurrency = trimmedOrNull(entry.currency);
	if (reportedCurrency) {
		return reportedCurrency;
	}
	if (isPaidAtPayRate(entry)) {
		return null;
	}
	return currencyOf(employee.billRateCurrency, organizationCurrency);
}

export function owedLinesOf({
	report,
	members,
	organizationCurrency,
	unnamedLabel
}: Readonly<{
	report: ReadonlyArray<TOwedReportDay>;
	members: ReadonlyMap<string, PaymentsMember>;
	organizationCurrency: string | null;
	unnamedLabel: string;
}>): OwedLine[] {
	const lines: OwedLine[] = [];
	const payRates = payRatesOf(report);
	for (const reportDay of report) {
		const rawDate = String(reportDay.date ?? '');
		const dateKey = rawDate.slice(0, 10);
		const day = dateOfDayKey(dateKey);
		if (!day) {
			continue;
		}
		for (const entry of reportDay.employees ?? []) {
			const employee = entry.employee;
			if (!employee) {
				continue;
			}
			const member = members.get(employee.id);
			const rateSource = rateSourceOf(entry.rateSource);
			let rate = rateOf(employee.billRateValue);
			let amount = amountOf(rate, entry.amount);
			if (rateSource === 'pay') {
				rate = payRates.get(employee.id) ?? null;
				amount = finiteOrZero(entry.amount);
			}
			lines.push({
				key: `${dateKey}:${employee.id}`,
				dateKey,
				day,
				employeeId: employee.id,
				name: nameOf(employee, member, unnamedLabel),
				imageUrl: imageOf(employee, member),
				seconds: finiteOrZero(entry.duration),
				rate,
				currency: lineCurrencyOf(entry, employee, organizationCurrency),
				amount,
				rateSource
			});
		}
	}
	return lines;
}

function isPriced(line: OwedLine) {
	return line.amount !== null;
}

interface CurrencyAccumulator {
	key: string;
	currency: string | null;
	amount: number;
	seconds: number;
	members: Set<string>;
}

function currencyTotalOf(accumulator: CurrencyAccumulator): OwedCurrencyTotal {
	return {
		key: accumulator.key,
		currency: accumulator.currency,
		amount: accumulator.amount,
		seconds: accumulator.seconds,
		memberCount: accumulator.members.size
	};
}

/** Time is the one unit every currency shares, so currencies are ordered by the time they price. */
function compareCurrencyTotals(first: OwedCurrencyTotal, second: OwedCurrencyTotal) {
	const secondsDifference = second.seconds - first.seconds;
	if (secondsDifference !== 0) {
		return secondsDifference;
	}
	return first.key.localeCompare(second.key);
}

/** Amounts are summed per currency and never across currencies. */
function currencyTotalsOf(lines: ReadonlyArray<OwedLine>): OwedCurrencyTotal[] {
	const byCurrency = new Map<string, CurrencyAccumulator>();
	for (const line of lines) {
		if (line.amount === null) {
			continue;
		}
		const key = currencyKeyOf(line.currency);
		const current = byCurrency.get(key) ?? {
			key,
			currency: line.currency,
			amount: 0,
			seconds: 0,
			members: new Set<string>()
		};
		current.amount += line.amount;
		current.seconds += line.seconds;
		current.members.add(line.employeeId);
		byCurrency.set(key, current);
	}
	const totals = Array.from(byCurrency.values(), currencyTotalOf);
	totals.sort(compareCurrencyTotals);
	return totals;
}

function unpricedTotalOf(lines: ReadonlyArray<OwedLine>): UnpricedTotal {
	let seconds = 0;
	const members = new Set<string>();
	for (const line of lines) {
		if (isPriced(line)) {
			continue;
		}
		seconds += line.seconds;
		members.add(line.employeeId);
	}
	return { seconds, memberCount: members.size };
}

function trackedSecondsOf(lines: ReadonlyArray<OwedLine>) {
	let seconds = 0;
	for (const line of lines) {
		seconds += line.seconds;
	}
	return seconds;
}

export function owedFiguresOf(lines: ReadonlyArray<OwedLine>): OwedFigures {
	const employeeIds = lines.map((line) => line.employeeId);
	const trackedMembers = new Set(employeeIds);
	return {
		currencies: currencyTotalsOf(lines),
		trackedSeconds: trackedSecondsOf(lines),
		trackedMemberCount: trackedMembers.size,
		unpriced: unpricedTotalOf(lines)
	};
}

export type CurrencyRank = (currency: string | null) => number;

export function currencyRankOf(currencies: ReadonlyArray<OwedCurrencyTotal>): CurrencyRank {
	const ranks = new Map<string, number>();
	currencies.forEach((total, index) => ranks.set(total.key, index));
	const lastRank = currencies.length;
	return (currency) => {
		const key = currencyKeyOf(currency);
		return ranks.get(key) ?? lastRank;
	};
}

function compareByCurrencyRank(first: OwedCurrencyTotal, second: OwedCurrencyTotal, rankOf: CurrencyRank) {
	const firstRank = rankOf(first.currency);
	const secondRank = rankOf(second.currency);
	return firstRank - secondRank;
}

interface RankedFigure {
	name: string;
	currency: string | null;
	seconds: number;
	amount: number | null;
}

function compareByName(first: RankedFigure, second: RankedFigure) {
	return first.name.localeCompare(second.name);
}

function comparePricedFigures(first: RankedFigure, second: RankedFigure, rankOf: CurrencyRank) {
	const firstRank = rankOf(first.currency);
	const secondRank = rankOf(second.currency);
	const rankDifference = firstRank - secondRank;
	if (rankDifference !== 0) {
		return rankDifference;
	}
	const firstAmount = first.amount ?? 0;
	const secondAmount = second.amount ?? 0;
	const amountDifference = secondAmount - firstAmount;
	if (amountDifference !== 0) {
		return amountDifference;
	}
	return compareByName(first, second);
}

function compareUnpricedFigures(first: RankedFigure, second: RankedFigure) {
	const secondsDifference = second.seconds - first.seconds;
	if (secondsDifference !== 0) {
		return secondsDifference;
	}
	return compareByName(first, second);
}

/** Largest amount owed first, currency by currency; members without a rate last, by tracked time. */
function compareOwedFigures(first: RankedFigure, second: RankedFigure, rankOf: CurrencyRank) {
	const isFirstPriced = first.amount !== null;
	const isSecondPriced = second.amount !== null;
	const isOnlyFirstPriced = isFirstPriced && !isSecondPriced;
	const isOnlySecondPriced = isSecondPriced && !isFirstPriced;
	if (isOnlyFirstPriced) {
		return -1;
	}
	if (isOnlySecondPriced) {
		return 1;
	}
	if (isFirstPriced) {
		return comparePricedFigures(first, second, rankOf);
	}
	return compareUnpricedFigures(first, second);
}

function compareLinesByDay(first: OwedLine, second: OwedLine) {
	return first.dateKey.localeCompare(second.dateKey);
}

function memberGroupOf(firstLine: OwedLine): OwedMemberGroup {
	return {
		key: firstLine.employeeId,
		employeeId: firstLine.employeeId,
		name: firstLine.name,
		imageUrl: firstLine.imageUrl,
		rate: firstLine.rate,
		currency: firstLine.currency,
		seconds: 0,
		amount: null,
		rateSource: firstLine.rateSource,
		lines: []
	};
}

function addedAmount(current: number | null, amount: number | null) {
	if (amount === null) {
		return current;
	}
	const base = current ?? 0;
	return base + amount;
}

export function memberGroupsOf(lines: ReadonlyArray<OwedLine>, rankOf: CurrencyRank): OwedMemberGroup[] {
	const byMember = new Map<string, OwedMemberGroup>();
	for (const line of lines) {
		const group = byMember.get(line.employeeId) ?? memberGroupOf(line);
		group.seconds += line.seconds;
		group.amount = addedAmount(group.amount, line.amount);
		group.lines.push(line);
		byMember.set(line.employeeId, group);
	}
	const groups = [...byMember.values()];
	for (const group of groups) {
		group.lines.sort(compareLinesByDay);
	}
	groups.sort((first, second) => compareOwedFigures(first, second, rankOf));
	return groups;
}

function compareDayGroups(first: OwedDayGroup, second: OwedDayGroup) {
	return second.key.localeCompare(first.key);
}

export function dayGroupsOf(lines: ReadonlyArray<OwedLine>, rankOf: CurrencyRank): OwedDayGroup[] {
	const byDay = new Map<string, OwedLine[]>();
	for (const line of lines) {
		const dayLines = byDay.get(line.dateKey) ?? [];
		dayLines.push(line);
		byDay.set(line.dateKey, dayLines);
	}
	const groups: OwedDayGroup[] = [];
	for (const [dateKey, dayLines] of byDay) {
		const firstLine = dayLines[0];
		if (!firstLine) {
			continue;
		}
		const rankedLines = [...dayLines].sort((first, second) => compareOwedFigures(first, second, rankOf));
		const subtotals = currencyTotalsOf(dayLines);
		subtotals.sort((first, second) => compareByCurrencyRank(first, second, rankOf));
		groups.push({
			key: dateKey,
			day: firstLine.day,
			seconds: trackedSecondsOf(dayLines),
			subtotals,
			unpricedSeconds: unpricedTotalOf(dayLines).seconds,
			lines: rankedLines
		});
	}
	groups.sort(compareDayGroups);
	return groups;
}

export interface ChartDayLabels {
	label: (day: Date) => string;
	axisLabel: (day: Date) => string;
}

function chartValueOf(line: OwedLine, chartKey: PaymentsChartKey) {
	if (chartKey === 'tracked') {
		return line.seconds;
	}
	if (chartKey === 'unpriced') {
		if (isPriced(line)) {
			return 0;
		}
		return line.seconds;
	}
	const lineCurrencyKey = currencyKeyOf(line.currency);
	const pickedCurrencyKey = currencyKeyOfChartKey(chartKey);
	const isPickedCurrency = lineCurrencyKey === pickedCurrencyKey;
	if (!isPriced(line) || !isPickedCurrency) {
		return 0;
	}
	return line.amount ?? 0;
}

function chartValuesByDayOf(lines: ReadonlyArray<OwedLine>, chartKey: PaymentsChartKey) {
	const byDay = new Map<string, number>();
	for (const line of lines) {
		const value = chartValueOf(line, chartKey);
		const current = byDay.get(line.dateKey) ?? 0;
		byDay.set(line.dateKey, current + value);
	}
	return byDay;
}

export function chartDaysOf(
	days: ReadonlyArray<Date>,
	lines: ReadonlyArray<OwedLine>,
	chartKey: PaymentsChartKey,
	labels: ChartDayLabels,
	now = new Date()
): DayBarDatum[] {
	const todayKey = localDayKeyOf(now);
	const valuesByDay = chartValuesByDayOf(lines, chartKey);
	return days.map((day) => {
		const key = localDayKeyOf(day);
		return {
			key,
			label: labels.label(day),
			axisLabel: labels.axisLabel(day),
			value: valuesByDay.get(key) ?? 0,
			isToday: key === todayKey,
			isFuture: key > todayKey
		};
	});
}

export function maxValueOf(days: ReadonlyArray<DayBarDatum>) {
	let maxValue = 0;
	for (const day of days) {
		maxValue = Math.max(maxValue, day.value);
	}
	return maxValue;
}

const BARE_AMOUNT_OPTIONS: Intl.NumberFormatOptions = { minimumFractionDigits: 2, maximumFractionDigits: 2 };

export function formatOwed(amount: number, currency: string | null, locale: string) {
	if (currency) {
		return formatAmount({ currency, amount }, locale);
	}
	return new Intl.NumberFormat(locale, BARE_AMOUNT_OPTIONS).format(amount);
}

function compactOptionsOf(currency: string | null): Intl.NumberFormatOptions {
	if (currency) {
		return { style: 'currency', currency, notation: 'compact', maximumFractionDigits: 1 };
	}
	return { notation: 'compact', maximumFractionDigits: 1 };
}

/** Axis ticks stay narrow ("$250", "$1.5K") so they fit the chart's gutter; the tooltip keeps the cents. */
export function formatOwedTick(value: number, currency: string | null, locale: string) {
	try {
		return new Intl.NumberFormat(locale, compactOptionsOf(currency)).format(value);
	} catch {
		return formatOwed(value, currency, locale);
	}
}

export function decimalHoursOf(seconds: number) {
	const hours = seconds / SECONDS_PER_HOUR;
	const hundredths = Math.round(hours * 100);
	return hundredths / 100;
}

export function roundedAmountOf(amount: number) {
	const cents = Math.round(amount * 100);
	return cents / 100;
}

function dayNameFormatOf(locale: string) {
	return new Intl.DateTimeFormat(locale, { weekday: 'short' });
}

function dayDateFormatOf(day: Date, locale: string) {
	const isCurrentYear = isSameYear(day, new Date());
	if (isCurrentYear) {
		return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' });
	}
	return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', year: 'numeric' });
}

export interface DayNameLabels {
	today: string;
	yesterday: string;
}

export function dayNameOf(day: Date, locale: string, labels: DayNameLabels) {
	if (isToday(day)) {
		return labels.today;
	}
	if (isYesterday(day)) {
		return labels.yesterday;
	}
	return dayNameFormatOf(locale).format(day);
}

export function dayDateOf(day: Date, locale: string) {
	return dayDateFormatOf(day, locale).format(day);
}

function exportRowOfLine(line: OwedLine, member: string): OwedExportRow {
	return {
		member,
		dateKey: line.dateKey,
		seconds: line.seconds,
		rate: line.rate,
		currency: line.currency,
		amount: line.amount
	};
}

function exportTotalRowOf(group: OwedMemberGroup): OwedExportRow {
	return {
		member: group.name,
		dateKey: null,
		seconds: group.seconds,
		rate: group.rate,
		currency: group.currency,
		amount: group.amount
	};
}

export function owedExportRowsOf(groups: ReadonlyArray<OwedMemberGroup>): OwedExportRow[] {
	const rows: OwedExportRow[] = [];
	for (const group of groups) {
		for (const line of group.lines) {
			rows.push(exportRowOfLine(line, group.name));
		}
		rows.push(exportTotalRowOf(group));
	}
	return rows;
}

/** Past a month a tile's columns are weeks, so a long custom range still fits the width of one tile. */
export const MAX_DAY_COLUMNS = 31;

export interface OwedColumn {
	key: string;
	/** The first day of the period the column covers: the day itself, or the first day of its week in the period. */
	firstDay: Date;
	amount: number;
	isToday: boolean;
	isFuture: boolean;
}

export interface OwedTile {
	key: string;
	currency: string | null;
	amount: number;
	seconds: number;
	memberCount: number;
	isWeekly: boolean;
	columns: OwedColumn[];
	maxColumnAmount: number;
}

type AmountsByColumn = Map<string, number>;

interface ColumnSlot {
	key: string;
	firstDay: Date;
	isToday: boolean;
	isFuture: boolean;
}

function columnStartOf(day: Date, isWeekly: boolean) {
	if (!isWeekly) {
		return day;
	}
	return startOfWeek(day, { weekStartsOn: PAYMENTS_WEEK_START });
}

function columnKeyOf(day: Date, isWeekly: boolean) {
	const start = columnStartOf(day, isWeekly);
	return localDayKeyOf(start);
}

function columnSlotsOf(days: ReadonlyArray<Date>, isWeekly: boolean, now: Date): ColumnSlot[] {
	const todayKey = columnKeyOf(now, isWeekly);
	const seenKeys = new Set<string>();
	const slots: ColumnSlot[] = [];
	for (const day of days) {
		const key = columnKeyOf(day, isWeekly);
		if (seenKeys.has(key)) {
			continue;
		}
		seenKeys.add(key);
		const isToday = key === todayKey;
		const isFuture = key > todayKey;
		slots.push({ key, firstDay: day, isToday, isFuture });
	}
	return slots;
}

function amountsByCurrencyOf(lines: ReadonlyArray<OwedLine>, isWeekly: boolean) {
	const byCurrency = new Map<string, AmountsByColumn>();
	for (const line of lines) {
		if (line.amount === null) {
			continue;
		}
		const currencyKey = currencyKeyOf(line.currency);
		const columnKey = columnKeyOf(line.day, isWeekly);
		const byColumn = byCurrency.get(currencyKey) ?? new Map<string, number>();
		const current = byColumn.get(columnKey) ?? 0;
		byColumn.set(columnKey, current + line.amount);
		byCurrency.set(currencyKey, byColumn);
	}
	return byCurrency;
}

function tileOf(
	total: OwedCurrencyTotal,
	slots: ReadonlyArray<ColumnSlot>,
	byColumn: AmountsByColumn | undefined,
	isWeekly: boolean
): OwedTile {
	let maxColumnAmount = 0;
	const columns: OwedColumn[] = [];
	for (const slot of slots) {
		const amount = byColumn?.get(slot.key) ?? 0;
		maxColumnAmount = Math.max(maxColumnAmount, amount);
		columns.push({ ...slot, amount });
	}
	return {
		key: total.key,
		currency: total.currency,
		amount: total.amount,
		seconds: total.seconds,
		memberCount: total.memberCount,
		isWeekly,
		columns,
		maxColumnAmount
	};
}

export function owedTilesOf({
	currencies,
	lines,
	days,
	now = new Date()
}: Readonly<{
	currencies: ReadonlyArray<OwedCurrencyTotal>;
	lines: ReadonlyArray<OwedLine>;
	days: ReadonlyArray<Date>;
	now?: Date;
}>): OwedTile[] {
	const isWeekly = days.length > MAX_DAY_COLUMNS;
	const slots = columnSlotsOf(days, isWeekly, now);
	const amountsByCurrency = amountsByCurrencyOf(lines, isWeekly);
	return currencies.map((total) => {
		const byColumn = amountsByCurrency.get(total.key);
		return tileOf(total, slots, byColumn, isWeekly);
	});
}

export interface StatementSection {
	key: string;
	currency: string | null;
	isPriced: boolean;
	memberCount: number;
	seconds: number;
	groups: OwedMemberGroup[];
}

const UNPRICED_SECTION_KEY = 'unpriced';

function sectionKeyOf(group: OwedMemberGroup) {
	if (group.amount === null) {
		return UNPRICED_SECTION_KEY;
	}
	const currencyKey = currencyKeyOf(group.currency);
	return `${CURRENCY_KEY_PREFIX}${currencyKey}`;
}

function emptySectionOf(group: OwedMemberGroup, key: string): StatementSection {
	const isPriced = group.amount !== null;
	const section: StatementSection = { key, currency: null, isPriced, memberCount: 0, seconds: 0, groups: [] };
	if (isPriced) {
		section.currency = group.currency;
	}
	return section;
}

/** Members split by the currency they are owed in, in the amount order; members without a rate close the list. */
export function statementSectionsOf(groups: ReadonlyArray<OwedMemberGroup>): StatementSection[] {
	const byKey = new Map<string, StatementSection>();
	for (const group of groups) {
		const key = sectionKeyOf(group);
		const section = byKey.get(key) ?? emptySectionOf(group, key);
		section.memberCount += 1;
		section.seconds += group.seconds;
		section.groups.push(group);
		byKey.set(key, section);
	}
	return [...byKey.values()];
}

export interface AmountSegment {
	text: string;
	isMinor: boolean;
}

function amountFormatOf(currency: string | null, locale: string) {
	if (currency) {
		return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 2 });
	}
	return new Intl.NumberFormat(locale, BARE_AMOUNT_OPTIONS);
}

function amountPartsOf(amount: number, currency: string | null, locale: string): Intl.NumberFormatPart[] | null {
	try {
		const format = amountFormatOf(currency, locale);
		return format.formatToParts(amount);
	} catch {
		return null;
	}
}

function isMinorPart(part: Intl.NumberFormatPart) {
	const isDecimal = part.type === 'decimal';
	const isFraction = part.type === 'fraction';
	return isDecimal || isFraction;
}

/** The amount as `formatOwed` writes it, split so the decimal separator and the cents can take a lighter tone. */
export function owedSegmentsOf(amount: number, currency: string | null, locale: string): AmountSegment[] {
	const parts = amountPartsOf(amount, currency, locale);
	if (!parts) {
		return [{ text: formatOwed(amount, currency, locale), isMinor: false }];
	}
	const segments: AmountSegment[] = [];
	for (const part of parts) {
		const isMinor = isMinorPart(part);
		const lastSegment = segments.at(-1);
		const continuesLast = lastSegment?.isMinor === isMinor;
		if (lastSegment !== undefined && continuesLast) {
			lastSegment.text += part.value;
			continue;
		}
		segments.push({ text: part.value, isMinor });
	}
	return segments;
}
