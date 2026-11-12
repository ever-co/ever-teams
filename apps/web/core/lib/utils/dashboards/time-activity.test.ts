import type { ITimeLogGroupedDailyReport } from '@/core/types/interfaces/activity/activity-report';
import { type DailyReportRow, flattenDailyReport } from '@/core/lib/utils/daily-report-figures';
import { filterDailyReportByClients } from './report-filters';
import {
	NO_CLIENT,
	type TimeActivityExportRow,
	breakdownFactsOf,
	breakdownTreeOf,
	clientExportLinesOf,
	clientLabelOf,
	clientOfProjectLogOf,
	clientGroupingAccessOf,
	clientRowsOf,
	effectiveGroupingOf,
	exportGroupsOf,
	exportRowsInGroupOrderOf,
	exportRowsOf,
	groupingOfParam,
	groupingParamOf,
	offeredGroupingsOf,
	reportTotalsOf,
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

describe('the Time & Activity breakdown by client', () => {
	const clientOf = clientOfProjectLogOf(CLIENT_IDS, CLIENT_NAMES);
	const rows = clientRowsOf(CLIENT_REPORT, clientOf, 'No team');
	const tree = breakdownTreeOf(breakdownFactsOf(rows), 'client');

	it('ranks the clients by their time, "No client" holding the time without one', () => {
		const clients = tree.nodes.map((node) => [node.subject, node.seconds]);

		expect(clients).toEqual([
			[{ kind: 'client', client: { key: 'acme', name: 'Acme' } }, 2100],
			[{ kind: 'client', client: { key: 'globex', name: 'Globex' } }, 900],
			[{ kind: 'client', client: NO_CLIENT }, 420],
			[{ kind: 'client', client: { key: 'initech', name: 'Initech' } }, 60]
		]);
	});

	it('adds the groups up to the total of the page, to the second', () => {
		let groupSeconds = 0;
		for (const node of tree.nodes) {
			groupSeconds += node.seconds;
		}

		expect(groupSeconds).toBe(reportTotalsOf(rows).seconds);
		expect(tree.totals.seconds).toBe(3480);
	});

	it('opens a client on its projects, then each project on its members', () => {
		const [acme] = tree.nodes;

		const projects = acme.children.map((node) => [node.dimension, node.key, node.seconds]);
		expect(projects).toEqual([
			['project', 'client/acme/website', 1800],
			['project', 'client/acme/no-team', 300]
		]);
		const members = acme.children[0].children.map((node) => [node.dimension, node.seconds]);
		expect(members).toEqual([['member', 1800]]);
	});

	it('gives each client its share of the period', () => {
		const shares = tree.nodes.map((node) => Math.round(node.share));

		expect(shares).toEqual([60, 26, 12, 2]);
	});

	it('shows one group with the filtered total when the client filter holds one client', () => {
		const filtered = filterDailyReportByClients(CLIENT_REPORT, ['acme'], CLIENT_IDS);
		const filteredPageSeconds = reportTotalsOf(flattenDailyReport(filtered, 'No team')).seconds;
		const filteredRows = clientRowsOf(filtered, clientOf, 'No team');

		const filteredTree = breakdownTreeOf(breakdownFactsOf(filteredRows), 'client');

		const groups = filteredTree.nodes.map((node) => [node.key, node.seconds]);
		expect(groups).toEqual([['client/acme', filteredPageSeconds]]);
	});

	it('names "No client", a named client, and a client no list names', () => {
		const labels = { noClient: 'No client', unnamedClient: 'Client' };

		expect(clientLabelOf(NO_CLIENT, labels)).toBe('No client');
		expect(clientLabelOf({ key: 'acme', name: 'Acme' }, labels)).toBe('Acme');
		expect(clientLabelOf({ key: 'umbrella', name: null }, labels)).toBe('Client');
	});
});

describe('the Time & Activity exports of the client grouping', () => {
	const clientOf = clientOfProjectLogOf(CLIENT_IDS, CLIENT_NAMES);
	const exportRows = exportRowsOf(CLIENT_REPORT, null, 'No team', clientOf);

	const exportRow = (fields: Partial<TimeActivityExportRow>): TimeActivityExportRow => ({
		dateKey: '2026-11-03',
		employeeId: 'ada',
		member: 'Ada',
		project: 'Website',
		client: null,
		task: 'Home',
		status: null,
		seconds: 0,
		earnings: null,
		currency: null,
		activity: 0,
		...fields
	});

	it('gives each row the client of its project, the time without a team included', () => {
		const clientsOfRows = exportRows.map((row) => [row.project, row.task, row.seconds, row.client?.key]);

		expect(clientsOfRows).toEqual([
			['Website', null, 600, 'acme'],
			['Internal', null, 300, 'none'],
			[null, null, 120, 'none'],
			['Website', 'home', 1200, 'acme'],
			['Legacy', null, 900, 'globex'],
			['No team', 'desktop', 300, 'acme'],
			['Retired', null, 60, 'initech']
		]);
	});

	it('gives no client to the rows of the other groupings', () => {
		const rows = exportRowsOf(CLIENT_REPORT, null, 'No team');

		expect(rows.every((row) => row.client === null)).toBe(true);
	});

	it('lists the client groups in the order of the screen, with the same totals', () => {
		const rows = clientRowsOf(CLIENT_REPORT, clientOf, 'No team');
		const tree = breakdownTreeOf(breakdownFactsOf(rows), 'client');
		const onScreen = tree.nodes.map((node) => [node.key, node.seconds]);

		const groups = exportGroupsOf(exportRows, 'client');

		const exported = groups.map((group) => [`client/${group.key}`, group.seconds]);
		expect(exported).toEqual(onScreen);
	});

	it('orders two clients with the same time as the screen does', () => {
		const rows = [
			exportRow({ client: { key: 'alpha', name: 'Alpha' }, seconds: 600 }),
			exportRow({ client: { key: 'beta', name: 'Beta' }, seconds: 600 })
		];

		const groups = exportGroupsOf(rows, 'client');

		expect(groups.map((group) => group.key)).toEqual(['beta', 'alpha']);
	});

	it('writes the rows client after client, each client keeping the order of its rows', () => {
		const ordered = exportRowsInGroupOrderOf(exportRows, 'client');

		const clientsOfRows = ordered.map((row) => [row.client?.key, row.project, row.seconds]);
		expect(clientsOfRows).toEqual([
			['acme', 'Website', 600],
			['acme', 'Website', 1200],
			['acme', 'No team', 300],
			['globex', 'Legacy', 900],
			['none', 'Internal', 300],
			['none', null, 120],
			['initech', 'Retired', 60]
		]);
	});

	it("adds up a client's days into one line per project, member and task, largest project first", () => {
		const rows = [
			exportRow({ seconds: 600, activity: 50, earnings: 10, currency: 'USD' }),
			exportRow({ dateKey: '2026-11-04', seconds: 1200, activity: 100, earnings: 20, currency: 'USD' }),
			exportRow({ employeeId: 'bob', member: 'Bob', seconds: 300 }),
			exportRow({ project: 'App', task: 'Login', seconds: 2400, activity: 25, earnings: 40, currency: 'USD' })
		];

		const lines = clientExportLinesOf(rows);

		const summary = lines.map((line) => [line.project, line.member, line.task, line.seconds, line.activeSeconds]);
		expect(summary).toEqual([
			['App', 'Ada', 'Login', 2400, 600],
			['Website', 'Ada', 'Home', 1800, 1500],
			['Website', 'Bob', 'Home', 300, 0]
		]);
		expect(lines.map((line) => line.earnings)).toEqual([40, 30, null]);
	});
});

describe('the Time & Activity grouping kept in the page link', () => {
	it('reads the grouping a link names, and the date grouping from a link without one', () => {
		expect(groupingOfParam('client')).toBe('client');
		expect(groupingOfParam('week')).toBe('week');
		expect(groupingOfParam(null)).toBe('date');
		expect(groupingOfParam('')).toBe('date');
		expect(groupingOfParam('quarter')).toBe('date');
	});

	it('writes every grouping but the default one into the link', () => {
		expect(groupingParamOf('client')).toBe('client');
		expect(groupingParamOf('task')).toBe('task');
		expect(groupingParamOf('date')).toBeNull();
	});

	it('gives the client grouping to who may read the clients, and waits for the permissions to know', () => {
		expect(clientGroupingAccessOf(true, false)).toBe('granted');
		expect(clientGroupingAccessOf(true, true)).toBe('granted');
		expect(clientGroupingAccessOf(false, true)).toBe('unknown');
		expect(clientGroupingAccessOf(false, false)).toBe('refused');
	});

	it('opens a link on the client grouping on the date grouping for a reader who does not get it', () => {
		expect(effectiveGroupingOf('client', 'refused')).toBe('date');
		expect(effectiveGroupingOf('client', 'unknown')).toBe('client');
		expect(effectiveGroupingOf('client', 'granted')).toBe('client');
		expect(effectiveGroupingOf('member', 'refused')).toBe('member');
	});

	it('offers Client last, to who may read the clients, and while a link on it waits for the permissions', () => {
		const everyone = ['date', 'member', 'project', 'task', 'week'];

		expect(offeredGroupingsOf('granted', 'date')).toEqual([...everyone, 'client']);
		expect(offeredGroupingsOf('refused', 'client')).toEqual(everyone);
		expect(offeredGroupingsOf('unknown', 'date')).toEqual(everyone);
		expect(offeredGroupingsOf('unknown', 'client')).toEqual([...everyone, 'client']);
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
