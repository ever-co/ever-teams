import type { ITimeLogGroupedDailyReport } from '@/core/types/interfaces/activity/activity-report';
import type { DailyReportRow } from '@/core/lib/utils/daily-report-figures';
import { exportRowsOf, weekColumnTotalsOf, weekGridRowsOfDailyRows } from './time-activity';

const employee = { id: 'employee-a', fullName: 'Ada Lovelace' };

// Gauzy states the team only for a report that counts the time without a team
function teamFieldOf(team?: string | null) {
	if (team === undefined) {
		return {};
	}
	return { organizationTeamId: team };
}

const task = (title: string, duration: number, team?: string | null) => ({
	task: { id: `task-${title}`, title },
	description: '',
	duration,
	client: null,
	...teamFieldOf(team)
});

const reportOf = (tasks: ReturnType<typeof task>[]) =>
	[
		{
			date: '2026-11-05',
			logs: [
				{
					project: { id: 'project-a', name: 'Website' },
					employeeLogs: [{ employee, sum: 0, activity: 0, tasks }]
				}
			]
		}
	] as unknown as ITimeLogGroupedDailyReport[];

describe('Time & Activity export rows', () => {
	it('lists the time without a team under "No team", as the page groups it', () => {
		const report = reportOf([task('home', 600, 'team-a'), task('desktop', 1200, null)]);

		const rows = exportRowsOf(report, null, 'No team');

		const projectsByTask = rows.map((row) => [row.task, row.project]);
		expect(projectsByTask).toEqual([
			['desktop', 'No team'],
			['home', 'Website']
		]);
	});

	it('keeps the project of every row when the report states no team', () => {
		const rows = exportRowsOf(reportOf([task('home', 600)]), null, 'No team');

		expect(rows[0].project).toBe('Website');
	});
});

describe('Time & Activity week grid from the daily rows', () => {
	const dailyRow = (employeeId: string, name: string, dateKey: string, seconds: number): DailyReportRow => ({
		key: `${dateKey}:${employeeId}:${seconds}`,
		dateKey,
		employeeId,
		employeeName: name,
		employeeImageUrl: null,
		billRateValue: null,
		billRateCurrency: null,
		projectId: null,
		projectName: null,
		projectImageUrl: null,
		projectColor: null,
		seconds,
		activeSeconds: 0,
		tasks: []
	});
	const week = ['2026-11-02', '2026-11-03', '2026-11-04'];
	const rows = [
		dailyRow('grace', 'Grace', '2026-11-03', 600),
		dailyRow('ada', 'Ada', '2026-11-02', 1200),
		dailyRow('ada', 'Ada', '2026-11-02', 300),
		dailyRow('ada', 'Ada', '2026-11-04', 60),
		dailyRow('ada', 'Ada', '2026-11-09', 9999)
	];

	it("adds up each member's time per day of the week, members by name", () => {
		const grid = weekGridRowsOfDailyRows(rows, week, 'en');

		const summary = grid.map((row) => [row.name, row.seconds, row.total]);
		expect(summary).toEqual([
			['Ada', [1500, 0, 60], 1560],
			['Grace', [0, 600, 0], 600]
		]);
		expect(weekColumnTotalsOf(grid, week.length)).toEqual([1500, 600, 60]);
	});

	it('lists nobody whose time falls on other days', () => {
		const grid = weekGridRowsOfDailyRows(rows, ['2026-11-05'], 'en');

		expect(grid).toEqual([]);
	});
});
