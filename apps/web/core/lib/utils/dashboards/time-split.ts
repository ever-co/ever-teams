import type { ShareRow } from '@/core/lib/utils/dashboard-figures';
import { type DailyReportRow, groupRowsBy, isNoProjectKey, projectKeyOf } from '@/core/lib/utils/daily-report-figures';
import { hasClient, NO_CLIENT, type ReportClientRef, type TimeActivityRow } from './time-activity';

/** What "Where the time went" splits the time in view by. */
export type TimeSplitMode = 'project' | 'client';

export interface TimeSplitItem {
	key: string;
	/** `null` for the time without a project or a client, and for a client no list names. */
	name: string | null;
	imageUrl: string | null;
	color: string | null;
	/** The time without a project, or without a client. */
	isNone: boolean;
	seconds: number;
}

/** The projects or clients named before the smallest ones are gathered into "N other ...". */
const SPLIT_LEADING_COUNT = 4;

const OTHER_KEY = 'other';

const WHOLE = 100;

interface ShareDraft {
	index: number;
	value: number;
	floor: number;
	remainder: number;
}

function byLargestRemainder(first: ShareDraft, second: ShareDraft) {
	const remainderGap = second.remainder - first.remainder;
	if (remainderGap !== 0) {
		return remainderGap;
	}
	const valueGap = second.value - first.value;
	if (valueGap !== 0) {
		return valueGap;
	}
	return first.index - second.index;
}

/**
 * Whole percents that add up to exactly 100: each share is rounded down, then the points still missing go to the
 * largest remainders. Rounding each share on its own can show 99 or 101 in total.
 */
export function wholeSharesOf(values: readonly number[]): number[] {
	const total = values.reduce((sum, value) => sum + value, 0);
	if (total <= 0) {
		return values.map(() => 0);
	}
	const drafts: ShareDraft[] = values.map((value, index) => {
		const exact = (value * WHOLE) / total;
		const floor = Math.floor(exact);
		return { index, value, floor, remainder: exact - floor };
	});
	const floorSum = drafts.reduce((sum, draft) => sum + draft.floor, 0);
	const missingPoints = WHOLE - floorSum;
	const shares = drafts.map((draft) => draft.floor);
	const byRemainder = [...drafts].sort(byLargestRemainder);
	for (const draft of byRemainder.slice(0, missingPoints)) {
		shares[draft.index] += 1;
	}
	return shares;
}

/** The time of each project; the time logged without a team keeps its own "No team" group, as everywhere else. */
export function projectSplitItemsOf(rows: ReadonlyArray<DailyReportRow>): TimeSplitItem[] {
	return groupRowsBy(rows, projectKeyOf).map((group) => {
		const first = group.rows[0];
		return {
			key: group.key,
			name: first?.projectName ?? null,
			imageUrl: first?.projectImageUrl ?? null,
			color: first?.projectColor ?? null,
			isNone: isNoProjectKey(group.key),
			seconds: group.seconds
		};
	});
}

function clientOfRow(row: TimeActivityRow): ReportClientRef {
	return row.client ?? NO_CLIENT;
}

/** The time of each client, the time on projects without a client (or without a project) in one group. */
export function clientSplitItemsOf(rows: ReadonlyArray<TimeActivityRow>): TimeSplitItem[] {
	const clients = new Map<string, ReportClientRef>();
	for (const row of rows) {
		const client = clientOfRow(row);
		const known = clients.get(client.key);
		// A row whose project names no client keeps the name another row of the same client gave
		const keepsKnownName = Boolean(known?.name) && !client.name;
		if (!keepsKnownName) {
			clients.set(client.key, client);
		}
	}
	const groups = groupRowsBy(rows, (row) => clientOfRow(row).key);
	return groups.map((group) => {
		const client = clients.get(group.key) ?? NO_CLIENT;
		return {
			key: group.key,
			name: client.name,
			imageUrl: null,
			color: null,
			isNone: !hasClient(client),
			seconds: group.seconds
		};
	});
}

function bySecondsDescending(first: TimeSplitItem, second: TimeSplitItem) {
	return second.seconds - first.seconds;
}

function holdsTime(item: TimeSplitItem) {
	return item.seconds > 0;
}

function isNamed(item: TimeSplitItem) {
	return !item.isNone;
}

interface SplitDraft {
	key: string;
	item: TimeSplitItem | null;
	value: number;
	otherCount: number;
}

function draftOf(item: TimeSplitItem): SplitDraft {
	return { key: item.key, item, value: item.seconds, otherCount: 0 };
}

/** One item left after the leading ones keeps its own row: "1 other project" would say less than its name. */
function leadingAndRestOf(named: TimeSplitItem[], leadingCount: number) {
	const fitsWithoutBucket = named.length <= leadingCount + 1;
	if (fitsWithoutBucket) {
		return { shown: named, rest: [] };
	}
	return { shown: named.slice(0, leadingCount), rest: named.slice(leadingCount) };
}

/**
 * Ranked rows of a split. The leading projects (or clients) by time, the time without one on its own row whatever its
 * size, and the smallest ones gathered into one closing "N other ..." row; one remaining item keeps its own row.
 * The shares are whole percents that add up to 100 of the time in view.
 */
export function splitRowsOf(
	items: ReadonlyArray<TimeSplitItem>,
	leadingCount = SPLIT_LEADING_COUNT
): ShareRow<TimeSplitItem>[] {
	const withTime = items.filter(holdsTime);
	const named = withTime.filter(isNamed).sort(bySecondsDescending);
	const none = withTime.filter((item) => item.isNone);
	const { shown, rest } = leadingAndRestOf(named, leadingCount);
	const ranked = [...shown, ...none].sort(bySecondsDescending).map(draftOf);
	const hasRest = rest.length > 0;
	if (hasRest) {
		const restValue = rest.reduce((sum, item) => sum + item.seconds, 0);
		ranked.push({ key: OTHER_KEY, item: null, value: restValue, otherCount: rest.length });
	}
	const shares = wholeSharesOf(ranked.map((draft) => draft.value));
	return ranked.map((draft, index) => ({
		key: draft.key,
		item: draft.item,
		value: draft.value,
		share: shares[index] ?? 0,
		isOther: draft.item === null,
		otherCount: draft.otherCount
	}));
}

export function splitTotalOf(items: ReadonlyArray<TimeSplitItem>) {
	return items.reduce((sum, item) => sum + item.seconds, 0);
}

/** The projects (or clients) that hold time, not counting the time without one. */
export function namedSplitCountOf(items: ReadonlyArray<TimeSplitItem>) {
	return items.filter(holdsTime).filter(isNamed).length;
}
