import type { DailyReportRow } from '@/core/lib/utils/daily-report-figures';
import { NO_CLIENT, type TimeActivityRow } from './time-activity';
import {
	clientSplitItemsOf,
	namedSplitCountOf,
	projectSplitItemsOf,
	splitRowsOf,
	splitTotalOf,
	type TimeSplitItem,
	wholeSharesOf
} from './time-split';

const HOUR = 3600;

function rowOf(projectId: string | null, seconds: number, extra: Partial<DailyReportRow> = {}): DailyReportRow {
	return {
		key: `${projectId}-${seconds}`,
		dateKey: '2026-11-10',
		employeeId: 'employee-1',
		employeeName: 'Marie',
		employeeImageUrl: null,
		billRateValue: null,
		billRateCurrency: null,
		projectId,
		projectName: projectId ? `Project ${projectId}` : null,
		projectImageUrl: null,
		projectColor: null,
		seconds,
		activeSeconds: 0,
		tasks: [],
		...extra
	};
}

function itemOf(key: string, seconds: number, isNone = false): TimeSplitItem {
	return { key, name: key, imageUrl: null, color: null, isNone, seconds };
}

describe('wholeSharesOf', () => {
	it('rounds to whole percents that add up to 100', () => {
		const shares = wholeSharesOf([30 * HOUR, 10 * HOUR, 2 * HOUR]);

		expect(shares).toEqual([71, 24, 5]);
		expect(shares.reduce((sum, share) => sum + share, 0)).toBe(100);
	});

	it('gives the missing points to the largest remainders, the first one on a tie', () => {
		expect(wholeSharesOf([1, 1, 1])).toEqual([34, 33, 33]);
	});

	it('answers zeros when nothing is tracked', () => {
		expect(wholeSharesOf([0, 0])).toEqual([0, 0]);
		expect(wholeSharesOf([])).toEqual([]);
	});
});

describe('projectSplitItemsOf', () => {
	it('sums the time of each project and flags the time without a project', () => {
		const items = projectSplitItemsOf([
			rowOf('a', 20 * HOUR),
			rowOf('b', 10 * HOUR),
			rowOf('a', 10 * HOUR),
			rowOf(null, 2 * HOUR)
		]);

		expect(items).toEqual([
			{ key: 'a', name: 'Project a', imageUrl: null, color: null, isNone: false, seconds: 30 * HOUR },
			{ key: 'b', name: 'Project b', imageUrl: null, color: null, isNone: false, seconds: 10 * HOUR },
			{ key: 'no-project', name: null, imageUrl: null, color: null, isNone: true, seconds: 2 * HOUR }
		]);
	});
});

describe('clientSplitItemsOf', () => {
	it('sums the time of each client and gathers the time without a client', () => {
		const acme = { key: 'acme', name: 'Acme' };
		const rows: TimeActivityRow[] = [
			{ ...rowOf('a', 30 * HOUR), client: acme },
			{ ...rowOf('b', 10 * HOUR), client: NO_CLIENT },
			{ ...rowOf(null, 2 * HOUR) }
		];

		const items = clientSplitItemsOf(rows);

		expect(items).toEqual([
			{ key: 'acme', name: 'Acme', imageUrl: null, color: null, isNone: false, seconds: 30 * HOUR },
			{ key: NO_CLIENT.key, name: null, imageUrl: null, color: null, isNone: true, seconds: 12 * HOUR }
		]);
	});
});

describe('clientSplitItemsOf, names', () => {
	it('keeps a client name a row gave when a later row of the same client has none', () => {
		const rows: TimeActivityRow[] = [
			{ ...rowOf('a', HOUR), client: { key: 'acme', name: 'Acme' } },
			{ ...rowOf('c', HOUR), client: { key: 'acme', name: null } }
		];

		expect(clientSplitItemsOf(rows).map((item) => item.name)).toEqual(['Acme']);
	});
});

describe('splitRowsOf', () => {
	it('ranks the time by value, with shares that add up to 100 of the time in view', () => {
		const rows = splitRowsOf([itemOf('b', 10 * HOUR), itemOf('none', 2 * HOUR, true), itemOf('a', 30 * HOUR)]);

		expect(rows.map((row) => [row.key, row.share, row.value])).toEqual([
			['a', 71, 30 * HOUR],
			['b', 24, 10 * HOUR],
			['none', 5, 2 * HOUR]
		]);
	});

	it('keeps the time without a project on its own row and closes with the smallest projects in one bucket', () => {
		const named = [7, 6, 5, 4, 3, 2].map((hours) => itemOf(`p${hours}`, hours * HOUR));
		const rows = splitRowsOf([...named, itemOf('none', HOUR / 2, true)], 4);

		expect(rows.map((row) => row.key)).toEqual(['p7', 'p6', 'p5', 'p4', 'none', 'other']);
		const other = rows[rows.length - 1];
		expect(other.isOther).toBe(true);
		expect(other.otherCount).toBe(2);
		expect(other.value).toBe(5 * HOUR);
		expect(rows.reduce((sum, row) => sum + row.share, 0)).toBe(100);
	});

	it('shows a single remaining project by name rather than as "1 other"', () => {
		const named = [5, 4, 3, 2, 1].map((hours) => itemOf(`p${hours}`, hours * HOUR));

		const rows = splitRowsOf(named, 4);

		expect(rows.map((row) => row.key)).toEqual(['p5', 'p4', 'p3', 'p2', 'p1']);
		expect(rows.some((row) => row.isOther)).toBe(false);
	});

	it('leaves out what holds no time, and answers nothing when nothing is tracked', () => {
		expect(splitRowsOf([itemOf('a', HOUR), itemOf('b', 0)]).map((row) => row.key)).toEqual(['a']);
		expect(splitRowsOf([itemOf('a', 0)])).toEqual([]);
	});
});

describe('totals of a split', () => {
	it('adds every item and counts the named ones only', () => {
		const items = [itemOf('a', 3 * HOUR), itemOf('none', HOUR, true), itemOf('b', 0)];

		expect(splitTotalOf(items)).toBe(4 * HOUR);
		expect(namedSplitCountOf(items)).toBe(1);
	});
});
