import { activityPercentOf, dayFiguresOf, flattenDailyReport } from '@/core/lib/utils/daily-report-figures';
import type { DurationRoundingRule } from '@/core/lib/utils/duration-rounding';
import type { ITimeLogGroupedDailyReport, ITimerTaskLog } from '@/core/types/interfaces/activity/activity-report';
import {
	breakdownFactsOf,
	breakdownTreeOf,
	chartDaysOf,
	clientExportLinesOf,
	dayActivityPercentOf,
	exportGroupsOf,
	exportRowsOf,
	reportGroupsOf,
	reportTotalsOf
} from './time-activity';
import { roundedDailyReportOf } from './time-activity-rounding';

const QUARTER_UP: DurationRoundingRule = { intervalMinutes: 15, direction: 'UP' };
const MINUTE = 60;

/** One row of the daily report: the report lists one per entry. */
function entryRowOf(id: string | null, minutes: number, extra: Partial<ITimerTaskLog> = {}): ITimerTaskLog {
	return {
		task: id ? { id, title: `Task ${id}` } : null,
		description: '',
		duration: minutes * MINUTE,
		...extra
	} as unknown as ITimerTaskLog;
}

function reportOf(sumMinutes: number, tasks: ITimerTaskLog[]) {
	return [
		{
			date: '2026-11-10',
			logs: [
				{
					project: { id: 'project-a', name: 'Project A' },
					employeeLogs: [{ employee: { id: 'marie' }, sum: sumMinutes * MINUTE, activity: 50, tasks }]
				}
			]
		}
	] as unknown as ITimeLogGroupedDailyReport[];
}

function employeeLogOf(report: ReadonlyArray<ITimeLogGroupedDailyReport>) {
	return report[0].logs[0].employeeLogs[0];
}

const SEVEN_EIGHT_TWENTY_TWO = [entryRowOf('task-1', 7), entryRowOf('task-1', 8), entryRowOf('task-1', 22)];

describe('roundedDailyReportOf', () => {
	it('leaves the report as the API gives it without a rule', () => {
		const report = reportOf(37, SEVEN_EIGHT_TWENTY_TWO);

		expect(roundedDailyReportOf(report, null)).toBe(report);
	});

	it('rounds each entry before adding: 7, 8 and 22 min of one task make 1 h at 15 min up', () => {
		const rounded = employeeLogOf(roundedDailyReportOf(reportOf(37, SEVEN_EIGHT_TWENTY_TWO), QUARTER_UP));

		expect(rounded.tasks.map((task) => task.duration)).toEqual([15 * MINUTE, 15 * MINUTE, 30 * MINUTE]);
		expect(rounded.sum).toBe(60 * MINUTE);
	});

	it('shows an entry of 1 h 07 min as 1 h 15 min', () => {
		const rounded = employeeLogOf(roundedDailyReportOf(reportOf(67, [entryRowOf(null, 67)]), QUARTER_UP));

		expect(rounded.sum).toBe(75 * MINUTE);
	});

	it('rounds down and to the nearest with the rule', () => {
		const report = reportOf(67, [entryRowOf(null, 67)]);

		const down = employeeLogOf(roundedDailyReportOf(report, { intervalMinutes: 15, direction: 'DOWN' }));
		const nearest = employeeLogOf(roundedDailyReportOf(report, { intervalMinutes: 6, direction: 'NEAREST' }));

		expect(down.sum).toBe(60 * MINUTE);
		expect(nearest.sum).toBe(66 * MINUTE);
	});

	it('keeps the activity percent of a member', () => {
		const rounded = employeeLogOf(roundedDailyReportOf(reportOf(37, SEVEN_EIGHT_TWENTY_TWO), QUARTER_UP));

		expect(rounded.activity).toBe(50);
	});

	it('rounds the time a member logged outside the listed entries as one entry', () => {
		const rounded = employeeLogOf(roundedDailyReportOf(reportOf(47, SEVEN_EIGHT_TWENTY_TWO), QUARTER_UP));

		expect(rounded.sum).toBe(60 * MINUTE + 15 * MINUTE);
	});

	it('rounds a member without listed entries as one entry', () => {
		const rounded = employeeLogOf(roundedDailyReportOf(reportOf(37, []), QUARTER_UP));

		expect(rounded.sum).toBe(45 * MINUTE);
	});

	it('keeps the team of an entry logged without a team', () => {
		const report = reportOf(7, [entryRowOf('task-1', 7, { organizationTeamId: null })]);

		const rounded = employeeLogOf(roundedDailyReportOf(report, QUARTER_UP));

		expect(rounded.tasks[0]).toEqual(expect.objectContaining({ organizationTeamId: null, duration: 15 * MINUTE }));
	});
});

describe('the activity of a report with each entry rounded', () => {
	// Gauzy measures activity on the time as tracked: 1 min at 100% and 14 min at 0% is 1 min active in 15, 6.7%
	const TRACKED_ACTIVITY = (1 / 15) * 100;

	function memberLogOf(id: string, minutes: number, activity: number) {
		return { employee: { id }, sum: minutes * MINUTE, activity, tasks: [entryRowOf('task-1', minutes)] };
	}

	function twoMembersOf(first: [number, number], second: [number, number]) {
		return [
			{
				date: '2026-11-10',
				logs: [
					{
						project: { id: 'project-a', name: 'Project A' },
						employeeLogs: [memberLogOf('marie', ...first), memberLogOf('jo', ...second)]
					}
				]
			}
		] as unknown as ITimeLogGroupedDailyReport[];
	}

	const ONE_ACTIVE_MINUTE_IN_FIFTEEN = twoMembersOf([1, 100], [14, 0]);

	function roundedRowsOf(report: ReadonlyArray<ITimeLogGroupedDailyReport>, rule: DurationRoundingRule) {
		return flattenDailyReport(roundedDailyReportOf(report, rule));
	}

	it('stays a share of the tracked time in the totals while the time shown is rounded', () => {
		const rows = roundedRowsOf(ONE_ACTIVE_MINUTE_IN_FIFTEEN, QUARTER_UP);

		const totals = reportTotalsOf(rows);

		expect(totals.seconds).toBe(30 * MINUTE);
		expect(activityPercentOf(totals)).toBeCloseTo(TRACKED_ACTIVITY);
	});

	it('keeps the activity of the time as tracked in the table, the chart and the breakdown', () => {
		const rows = roundedRowsOf(ONE_ACTIVE_MINUTE_IN_FIFTEEN, QUARTER_UP);

		const [day] = reportGroupsOf(rows, 'date');
		const [chartDay] = chartDaysOf([new Date(2026, 10, 10)], dayFiguresOf(rows), '2026-11-10', {
			label: () => '',
			axisLabel: () => ''
		});
		const breakdown = breakdownTreeOf(breakdownFactsOf(rows), 'member');

		expect(activityPercentOf(day)).toBeCloseTo(TRACKED_ACTIVITY);
		expect(day.lines.map((line) => Math.round(activityPercentOf(line)))).toEqual([100, 0]);
		expect(chartDay.value).toBe(30 * MINUTE);
		expect(dayActivityPercentOf(chartDay)).toBeCloseTo(TRACKED_ACTIVITY);
		expect(activityPercentOf(breakdown.totals)).toBeCloseTo(TRACKED_ACTIVITY);
	});

	it('keeps the activity of the time as tracked in the exports', () => {
		const exportRows = exportRowsOf(roundedDailyReportOf(ONE_ACTIVE_MINUTE_IN_FIFTEEN, QUARTER_UP), null);

		const [group] = exportGroupsOf(exportRows, 'date');
		const lines = clientExportLinesOf(exportRows);

		expect(group.seconds).toBe(30 * MINUTE);
		expect(activityPercentOf(group)).toBeCloseTo(TRACKED_ACTIVITY);
		expect(lines.map((line) => Math.round(activityPercentOf(line)))).toEqual([100, 0]);
	});

	it('counts the activity of an entry rounded down to nothing, in the totals as in the breakdown', () => {
		// 1 min at 100% rounds down to nothing and 20 min at 0% to 15 min: 1 min active in 21 tracked
		const rows = roundedRowsOf(twoMembersOf([1, 100], [20, 0]), { intervalMinutes: 15, direction: 'DOWN' });

		const totals = reportTotalsOf(rows);
		const breakdown = breakdownTreeOf(breakdownFactsOf(rows), 'date');

		expect(totals.seconds).toBe(15 * MINUTE);
		expect(activityPercentOf(totals)).toBeCloseTo((1 / 21) * 100);
		expect(activityPercentOf(breakdown.totals)).toBeCloseTo((1 / 21) * 100);
	});

	it('leaves the rows of time as tracked as they were without a rule', () => {
		const rows = flattenDailyReport(roundedDailyReportOf(ONE_ACTIVE_MINUTE_IN_FIFTEEN, null));

		expect(rows.map((row) => row.trackedSeconds)).toEqual([undefined, undefined]);
		expect(rows.map((row) => row.activeSeconds)).toEqual([MINUTE, 0]);
	});
});
