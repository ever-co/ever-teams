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
