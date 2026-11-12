import type { ITimeLogGroupedDailyReport } from '@/core/types/interfaces/activity/activity-report';
import { earningsByCurrencyOf, flattenDailyReport, groupRowsBy, projectKeyOf } from './daily-report-figures';

const employee = { id: 'employee-a', fullName: 'Ada Lovelace', user: { imageUrl: null } };
const project = { id: 'project-a', name: 'Website', imageUrl: null, color: '#336699' };

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

const reportOf = (
	tasks: ReturnType<typeof task>[],
	sum: number,
	logProject: object | null = project,
	logEmployee: object = employee
) =>
	[
		{
			date: '2026-11-05',
			logs: [{ project: logProject, employeeLogs: [{ employee: logEmployee, sum, activity: 50, tasks }] }]
		}
	] as unknown as ITimeLogGroupedDailyReport[];

const QUARTER_HOUR = 900;

const ratedReportOf = (billRateCurrency: string | null) => {
	const ratedEmployee = { ...employee, billRateValue: 40, billRateCurrency };
	return reportOf([task('home', QUARTER_HOUR)], QUARTER_HOUR, project, ratedEmployee);
};

describe('flattenDailyReport', () => {
	it('keeps one row per member, project and day when the report states no team', () => {
		const rows = flattenDailyReport(reportOf([task('home', 600), task('blog', 300)], 900), 'No team');

		expect(rows).toHaveLength(1);
		expect(rows[0]).toEqual(
			expect.objectContaining({ key: '2026-11-05:project-a:employee-a', projectId: 'project-a', seconds: 900 })
		);
		expect(rows[0]).not.toHaveProperty('isWithoutTeam');
	});

	it('puts the time logged without a team in a row of its own, named apart from the projects', () => {
		const report = reportOf(
			[task('home', 600, 'team-a'), task('desktop', 900, null), task('agent', 300, null)],
			1800
		);

		const [teamRow, withoutTeamRow] = flattenDailyReport(report, 'No team');

		expect(teamRow).toEqual(
			expect.objectContaining({
				projectId: 'project-a',
				projectName: 'Website',
				seconds: 600,
				activeSeconds: 300
			})
		);
		expect(teamRow.tasks.map((reportTask) => reportTask.title)).toEqual(['home']);
		expect(withoutTeamRow).toEqual(
			expect.objectContaining({
				key: '2026-11-05:no-team:project-a:employee-a',
				isWithoutTeam: true,
				projectId: null,
				projectName: 'No team',
				projectColor: null,
				seconds: 1200,
				activeSeconds: 600
			})
		);
		expect(withoutTeamRow.tasks.map((reportTask) => reportTask.title)).toEqual(['desktop', 'agent']);
	});

	it('gives a member with only time without a team that row alone', () => {
		const rows = flattenDailyReport(reportOf([task('desktop', 1200, null)], 1200, null), 'No team');

		expect(rows).toHaveLength(1);
		expect(rows[0]).toEqual(
			expect.objectContaining({ key: '2026-11-05:no-team:no-project:employee-a', isWithoutTeam: true })
		);
	});
});

describe('the "No team" group', () => {
	it('gathers the time without a team of every project under one key', () => {
		const rows = flattenDailyReport(
			[
				...reportOf([task('desktop', 1200, null)], 1200),
				...reportOf([task('agent', 600, null)], 600, { ...project, id: 'project-b' })
			],
			'No team'
		);

		const groups = groupRowsBy(rows, projectKeyOf);

		expect(groups).toHaveLength(1);
		expect(groups[0]).toEqual(expect.objectContaining({ key: 'no-team', seconds: 1800 }));
	});
});

describe('a billing rate without a currency of its own (#5087)', () => {
	it("is counted in the workspace's currency, as Gauzy counts it", () => {
		const rows = flattenDailyReport(ratedReportOf(null), null, 'EUR');

		expect(rows[0].billRateCurrency).toBe('EUR');
		expect(earningsByCurrencyOf(rows)).toEqual([{ currency: 'EUR', amount: 10 }]);
	});

	it('leaves a rate that has its own currency in it', () => {
		const rows = flattenDailyReport(ratedReportOf('GBP'), null, 'EUR');

		expect(earningsByCurrencyOf(rows)).toEqual([{ currency: 'GBP', amount: 10 }]);
	});

	it('is counted as before while the workspace currency is not known', () => {
		const rows = flattenDailyReport(ratedReportOf(null));

		expect(rows[0].billRateCurrency).toBeNull();
		expect(earningsByCurrencyOf(rows)).toEqual([{ currency: 'USD', amount: 10 }]);
	});
});
