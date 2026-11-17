import type { ITimeLogGroupedDailyReport } from '@/core/types/interfaces/activity/activity-report';
import { flattenDailyReport } from '@/core/lib/utils/daily-report-figures';
import {
	breakdownFactsOf,
	breakdownTreeOf,
	clientExportLinesOf,
	effectiveGroupingOf,
	exportGroupsOf,
	exportRowsOf,
	groupingOfParam,
	labelGroupsOverlap,
	offeredGroupingsOf
} from './time-activity';

const meeting = { id: 'tag-meeting', name: 'meeting', color: '#2563eb' };
const support = { id: 'tag-support', name: 'support', color: '#16a34a' };
const design = { id: 'tag-design', name: 'design', color: '#db2777' };

const HOUR = 3600;

// Marie's Tuesday on "Q4 support" (#5368): one row per entry, each with its own labels
const entry = (duration: number, tags?: Array<typeof meeting>) => ({
	task: { id: 'task-q4', title: 'Q4 support' },
	description: '',
	duration,
	client: null,
	...(tags ? { tags } : {})
});

const reportOf = (entries: ReturnType<typeof entry>[]) =>
	[
		{
			date: '2026-11-03',
			logs: [
				{
					project: { id: 'project-portal', name: 'Client Portal' },
					employeeLogs: [
						{ employee: { id: 'marie', fullName: 'Marie' }, sum: 0, activity: 0, tasks: entries }
					]
				}
			]
		}
	] as unknown as ITimeLogGroupedDailyReport[];

const MARIE = reportOf([entry(2 * HOUR, [meeting]), entry(3 * HOUR, [support, design]), entry(HOUR, [])]);

describe('the Time & activity Label grouping (#5368)', () => {
	const facts = breakdownFactsOf(flattenDailyReport(MARIE));
	const tree = breakdownTreeOf(facts, 'label');

	it('counts an entry under each of its labels, and the time without one under "No label"', () => {
		const groups = tree.nodes.map((node) => [node.subject, node.seconds]);

		expect(groups).toEqual([
			[{ kind: 'label', label: support }, 3 * HOUR],
			[{ kind: 'label', label: design }, 3 * HOUR],
			[{ kind: 'label', label: meeting }, 2 * HOUR],
			[{ kind: 'label', label: null }, HOUR]
		]);
	});

	it('keeps the total of the period: an entry with two labels is counted once there', () => {
		expect(tree.totals.seconds).toBe(6 * HOUR);
	});

	it('says that its groups overlap only when an entry carries two labels', () => {
		expect(labelGroupsOverlap(facts)).toBe(true);
		const single = breakdownFactsOf(flattenDailyReport(reportOf([entry(HOUR, [meeting]), entry(HOUR)])));
		expect(labelGroupsOverlap(single)).toBe(false);
	});

	it('reads a report of an API without labels on entries as before: no label on any row', () => {
		const rows = flattenDailyReport(reportOf([entry(HOUR)]));

		expect(rows[0].tasks[0]).not.toHaveProperty('labels');
	});

	it('writes each entry once in a file, grouped by its set of labels, with the names in a Labels column', () => {
		const rows = exportRowsOf(MARIE, null);
		const groups = exportGroupsOf(rows, 'label').map((group) => [group.key, group.seconds]);

		expect(rows.map((row) => row.labels)).toEqual(['design, support', 'meeting', '']);
		expect(groups).toEqual([
			['design, support', 3 * HOUR],
			['meeting', 2 * HOUR],
			['', HOUR]
		]);
	});

	it('names in a client line of the PDF every label of the entries it adds up', () => {
		const lines = clientExportLinesOf(exportRowsOf(MARIE, null));

		expect(lines.map((line) => line.labels)).toEqual(['design, support, meeting']);
	});
});

describe('the offer of the Label grouping (#5368)', () => {
	it('is offered last, only where the API stores the labels of entries', () => {
		expect(offeredGroupingsOf('granted', 'date', true)).toEqual([
			'date',
			'member',
			'project',
			'task',
			'week',
			'client',
			'label'
		]);
		expect(offeredGroupingsOf('granted', 'date', false)).not.toContain('label');
	});

	it('reads back from a link, and falls back to the date grouping where the API has no labels', () => {
		expect(groupingOfParam('label')).toBe('label');
		expect(effectiveGroupingOf('label', 'granted', true)).toBe('label');
		expect(effectiveGroupingOf('label', 'granted', false)).toBe('date');
	});
});
