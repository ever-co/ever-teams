import type { ITimeLogGroupedDailyReport } from '@/core/types/interfaces/activity/activity-report';
import { exportRowsOf } from './time-activity';

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

const reportOf = (tasks: ReturnType<typeof task>[], logEmployee: object = employee) =>
	[
		{
			date: '2026-11-05',
			logs: [
				{
					project: { id: 'project-a', name: 'Website' },
					employeeLogs: [{ employee: logEmployee, sum: 0, activity: 0, tasks }]
				}
			]
		}
	] as unknown as ITimeLogGroupedDailyReport[];

const ratedReportOf = (billRateCurrency: string | null) => {
	const ratedEmployee = { ...employee, billRateValue: 40, billRateCurrency };
	return reportOf([task('home', 900)], ratedEmployee);
};

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

describe('Time & Activity export rows of a rate without a currency of its own (#5087)', () => {
	it("count it in the workspace's currency", () => {
		const [row] = exportRowsOf(ratedReportOf(null), null, null, 'EUR');

		expect(row).toEqual(expect.objectContaining({ earnings: 10, currency: 'EUR' }));
	});

	it('leave a rate that has its own currency in it', () => {
		const [row] = exportRowsOf(ratedReportOf('GBP'), null, null, 'EUR');

		expect(row).toEqual(expect.objectContaining({ earnings: 10, currency: 'GBP' }));
	});

	it('count it as before while the workspace currency is not known', () => {
		const [row] = exportRowsOf(ratedReportOf(null), null);

		expect(row).toEqual(expect.objectContaining({ earnings: 10, currency: 'USD' }));
	});
});
