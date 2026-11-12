import type { ITimeLogGroupedDailyReport } from '@/core/types/interfaces/activity/activity-report';
import { type DailyReportRow, flattenDailyReport } from '@/core/lib/utils/daily-report-figures';
import {
	NO_CLIENT,
	clientOfProjectLogOf,
	clientRowsOf,
	exportRowsOf,
	weekColumnTotalsOf,
	weekGridRowsOfDailyRows
} from './time-activity';

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

/** Acme holds the website; the internal project has no client; Globex was archived and stays on its project. */
const CLIENT_IDS = new Map<string, string | null>([
	['website', 'acme'],
	['internal', null],
	['legacy', 'globex']
]);

const CLIENT_NAMES = new Map<string, string>([
	['acme', 'Acme'],
	['globex', 'Globex']
]);

const memberLog = (seconds: number, tasks: ReturnType<typeof task>[] = []) => ({
	employee,
	sum: seconds,
	activity: 50,
	tasks
});

const CLIENT_REPORT = [
	{
		date: '2026-11-03',
		logs: [
			{ project: { id: 'website', name: 'Website' }, employeeLogs: [memberLog(600)] },
			{ project: { id: 'internal', name: 'Internal' }, employeeLogs: [memberLog(300)] },
			{ project: null, employeeLogs: [memberLog(120)] }
		]
	},
	{
		date: '2026-11-04',
		logs: [
			{ project: { id: 'legacy', name: 'Legacy' }, employeeLogs: [memberLog(900)] },
			{
				project: { id: 'retired', name: 'Retired', organizationContact: { id: 'initech', name: 'Initech' } },
				employeeLogs: [memberLog(60)]
			},
			{
				project: { id: 'website', name: 'Website' },
				employeeLogs: [memberLog(1500, [task('home', 1200, 'team-a'), task('desktop', 300, null)])]
			}
		]
	}
] as unknown as ITimeLogGroupedDailyReport[];

describe('the client of each row of Time & Activity', () => {
	const clientOf = clientOfProjectLogOf(CLIENT_IDS, CLIENT_NAMES);

	it("is the current client of the row's project, named by the clients list, archived clients included", () => {
		const [day] = CLIENT_REPORT;
		const [onWebsite, onInternal, withoutProject] = day.logs;
		const onLegacy = CLIENT_REPORT[1].logs[0];

		expect(clientOf(onWebsite)).toEqual({ key: 'acme', name: 'Acme' });
		expect(clientOf(onLegacy)).toEqual({ key: 'globex', name: 'Globex' });
		expect(clientOf(onInternal)).toBe(NO_CLIENT);
		expect(clientOf(withoutProject)).toBe(NO_CLIENT);
	});

	it('takes the name the report gives a client the list does not hold yet, and no other name', () => {
		const onRetired = CLIENT_REPORT[1].logs[1];
		const renamedElsewhere = clientOfProjectLogOf(new Map([['retired', 'umbrella']]), CLIENT_NAMES);

		expect(clientOf(onRetired)).toEqual({ key: 'initech', name: 'Initech' });
		expect(renamedElsewhere(onRetired)).toEqual({ key: 'umbrella', name: null });
	});

	it('keeps the rows of the page in their order and gives each one the client of its project', () => {
		const rows = clientRowsOf(CLIENT_REPORT, clientOf, 'No team');
		const pageRows = flattenDailyReport(CLIENT_REPORT, 'No team');

		expect(rows).toMatchObject(pageRows);
		const clientsOfRows = rows.map((row) => [row.projectName, row.seconds, row.client?.key]);
		expect(clientsOfRows).toEqual([
			['Website', 600, 'acme'],
			['Internal', 300, 'none'],
			[null, 120, 'none'],
			['Legacy', 900, 'globex'],
			['Retired', 60, 'initech'],
			['Website', 1200, 'acme'],
			['No team', 300, 'acme']
		]);
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
