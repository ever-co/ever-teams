import type { DurationRoundingRule } from '@/core/lib/utils/duration-rounding';
import type { ITimeLogGroupedDailyReport, ITimerTaskLog } from '@/core/types/interfaces/activity/activity-report';
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
