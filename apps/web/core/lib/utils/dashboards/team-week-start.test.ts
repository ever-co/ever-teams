import { describe, expect, it } from '@jest/globals';
import type { DailyReportRow } from '@/core/lib/utils/daily-report-figures';
import { chartBucketsOf, columnStacksOf, memberColumnStacksOf, projectSeriesOf, rosterMembersOf } from './team';

jest.mock('@/core/hooks/activities/use-activity-filters', () => ({ getReportMemberIds: () => [] }));

const SUNDAY = 0;

const PERIOD = { from: new Date(2026, 10, 1), to: new Date(2026, 10, 14) };

const NOW = new Date(2026, 10, 20);

function rowOf(dateKey: string, hours: number): DailyReportRow {
	return {
		key: `ana-${dateKey}`,
		dateKey,
		employeeId: 'ana',
		employeeName: 'Ana',
		employeeImageUrl: null,
		billRateValue: null,
		billRateCurrency: null,
		projectId: 'site',
		projectName: 'Site',
		projectImageUrl: null,
		projectColor: null,
		seconds: hours * 3600,
		activeSeconds: 0,
		tasks: []
	};
}

const ROWS = [rowOf('2026-11-07', 2), rowOf('2026-11-08', 4)];

describe('the Team weekly slots follow the workspace week start', () => {
	it('cuts Sunday 1 to Saturday 14 November into two Sunday weeks', () => {
		const buckets = chartBucketsOf(ROWS, PERIOD, 'week', SUNDAY, NOW);

		expect(buckets.map((bucket) => bucket.key)).toEqual(['2026-11-01', '2026-11-08']);
		expect(buckets.map((bucket) => bucket.seconds)).toEqual([2 * 3600, 4 * 3600]);
	});

	it('puts Sunday 8 November in the second week of every chart and of the roster', () => {
		const buckets = chartBucketsOf(ROWS, PERIOD, 'week', SUNDAY, NOW);
		const series = projectSeriesOf(ROWS);

		const projectStacks = columnStacksOf(ROWS, buckets, 'week', series, SUNDAY);
		const memberStacks = memberColumnStacksOf(ROWS, buckets, 'week', [], SUNDAY);
		const [roster] = rosterMembersOf(ROWS, [{ key: 'ana' } as never], buckets, 'week', new Map(), SUNDAY);

		expect(projectStacks.map((stack) => Object.values(stack.values)[0])).toEqual([2 * 3600, 4 * 3600]);
		expect(memberStacks.map((stack) => Object.values(stack.values)[0])).toEqual([2 * 3600, 4 * 3600]);
		expect(roster.columns.map((column) => column.seconds)).toEqual([2 * 3600, 4 * 3600]);
	});

	it('keeps Monday weeks when no week start is given', () => {
		const buckets = chartBucketsOf(ROWS, PERIOD, 'week');

		expect(buckets.map((bucket) => bucket.key)).toEqual(['2026-10-26', '2026-11-02', '2026-11-09']);
	});
});
