import type { ITimeLogGroupedDailyReport } from '@/core/types/interfaces/activity/activity-report';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import { NO_CLIENT_FILTER_VALUE } from '@/core/lib/utils/project-list';
import {
	BILLABLE_ONLY_VALUE,
	clearReportUrlFilters,
	clientIdOfTime,
	filterDailyReportByClients,
	isBillableOnly,
	isReportUrlFilterField,
	labelsOfLogs,
	logMatchesBillable,
	logMatchesClients,
	logMatchesLabels,
	logMatchesReportFilters,
	matchesPickedClients,
	projectClientIdsOf,
	readReportUrlFilters,
	reportClientChoicesOf,
	writeReportUrlFilter
} from './report-filters';

function logOf(fields: Record<string, unknown>): ITimeLog {
	return { id: 'log', duration: 0, ...fields } as unknown as ITimeLog;
}

const clientIds = projectClientIdsOf([
	{ id: 'website', organizationContactId: 'acme', organizationContact: { id: 'acme', name: 'Acme' } },
	{ id: 'archived-client-project', organizationContactId: 'gone', organizationContact: null },
	{ id: 'internal', organizationContactId: null, organizationContact: null }
]);

describe('the report filters of a link', () => {
	it('reads clients, billable and labels, each value once', () => {
		const params = new URLSearchParams('clients=acme,none,acme&billable=true&labels=bug,urgent&teams=t1');

		const filters = readReportUrlFilters(params);

		expect(filters).toEqual({
			clients: ['acme', NO_CLIENT_FILTER_VALUE],
			billable: [BILLABLE_ONLY_VALUE],
			labels: ['bug', 'urgent']
		});
	});

	it('counts all time when the link says anything but billable only', () => {
		const filters = readReportUrlFilters(new URLSearchParams('billable=false'));

		expect(filters.billable).toEqual([]);
		expect(isBillableOnly(filters.billable)).toBe(false);
		expect(isBillableOnly([BILLABLE_ONLY_VALUE])).toBe(true);
	});

	it('writes a filter into the link and removes it when it holds nothing', () => {
		const params = new URLSearchParams('date=2026-11-03');

		writeReportUrlFilter(params, 'clients', ['acme', NO_CLIENT_FILTER_VALUE]);
		writeReportUrlFilter(params, 'billable', [BILLABLE_ONLY_VALUE]);
		expect(params.toString()).toBe('date=2026-11-03&clients=acme%2Cnone&billable=true');

		writeReportUrlFilter(params, 'clients', []);
		expect(params.toString()).toBe('date=2026-11-03&billable=true');
	});

	it('clears its three filters and leaves the rest of the link', () => {
		const params = new URLSearchParams('date=2026-11-03&clients=acme&billable=true&labels=bug');

		clearReportUrlFilters(params);

		expect(params.toString()).toBe('date=2026-11-03');
	});

	it('knows its own fields from the ones a page keeps elsewhere', () => {
		expect(isReportUrlFilterField('labels')).toBe(true);
		expect(isReportUrlFilterField('projects')).toBe(false);
	});
});

describe('the client some time belongs to', () => {
	it('is the current client of its project', () => {
		expect(clientIdOfTime('website', clientIds)).toBe('acme');
	});

	it('is none for time without a project, or on a project without a client', () => {
		expect(clientIdOfTime(null, clientIds)).toBeNull();
		expect(clientIdOfTime(undefined, clientIds)).toBeNull();
		expect(clientIdOfTime('internal', clientIds)).toBeNull();
	});

	it('stays the archived client a project still carries', () => {
		expect(clientIdOfTime('archived-client-project', clientIds)).toBe('gone');
	});

	it('is the client a report names for a project the lists do not hold', () => {
		expect(clientIdOfTime('archived-project', clientIds, 'acme')).toBe('acme');
		expect(clientIdOfTime('archived-project', clientIds)).toBeNull();
	});

	it('is none for a listed project without a client, whatever a report read earlier still names', () => {
		expect(clientIdOfTime('internal', clientIds, 'acme')).toBeNull();
	});

	it('matches the picked clients, "No client" keeping the time without one', () => {
		expect(matchesPickedClients('acme', [])).toBe(true);
		expect(matchesPickedClients('acme', ['acme'])).toBe(true);
		expect(matchesPickedClients('acme', ['globex'])).toBe(false);
		expect(matchesPickedClients(null, ['acme'])).toBe(false);
		expect(matchesPickedClients(null, [NO_CLIENT_FILTER_VALUE])).toBe(true);
		expect(matchesPickedClients('acme', [NO_CLIENT_FILTER_VALUE, 'acme'])).toBe(true);
	});
});

describe('the time logs a report filter keeps', () => {
	const onWebsite = logOf({ id: 'a', projectId: 'website', project: { id: 'website', name: 'Website' } });
	const onInternal = logOf({ id: 'b', projectId: 'internal' });
	const withoutProject = logOf({ id: 'c' });
	const onArchivedClient = logOf({ id: 'd', projectId: 'archived-client-project' });

	it('keeps the time of the picked client, whenever it was logged', () => {
		const kept = [onWebsite, onInternal, withoutProject].filter((log) =>
			logMatchesClients(log, ['acme'], clientIds)
		);

		expect(kept.map((log) => log.id)).toEqual(['a']);
	});

	it('lists under "No client" the time on a project without one and the time without a project', () => {
		const logs = [onWebsite, onInternal, withoutProject, onArchivedClient];

		const kept = logs.filter((log) => logMatchesClients(log, [NO_CLIENT_FILTER_VALUE], clientIds));

		expect(kept.map((log) => log.id)).toEqual(['b', 'c']);
	});

	it('keeps every log while no client is picked', () => {
		expect(logMatchesClients(withoutProject, [], clientIds)).toBe(true);
	});

	it('hides every entry that is not billable when only billable time is asked', () => {
		const billable = logOf({ isBillable: true });
		const notBillable = logOf({ isBillable: false });
		const unstated = logOf({});

		expect(logMatchesBillable(billable, true)).toBe(true);
		expect(logMatchesBillable(notBillable, true)).toBe(false);
		expect(logMatchesBillable(unstated, true)).toBe(false);
		expect(logMatchesBillable(notBillable, false)).toBe(true);
	});

	it('keeps the time of the tasks carrying one of the picked labels', () => {
		const bug = { id: 'bug', name: 'Bug', color: '#f00' };
		const urgent = { id: 'urgent', name: 'urgent' };
		const onBug = logOf({ task: { id: 't1', title: 'Fix', tags: [bug] } });
		const onBoth = logOf({ task: { id: 't2', title: 'Hotfix', tags: [urgent, bug] } });
		const unlabelled = logOf({ task: { id: 't3', title: 'Chore', tags: [] } });
		const withoutTask = logOf({});

		expect(logMatchesLabels(onBug, ['urgent'])).toBe(false);
		expect(logMatchesLabels(onBoth, ['urgent'])).toBe(true);
		expect(logMatchesLabels(onBug, ['urgent', 'bug'])).toBe(true);
		expect(logMatchesLabels(unlabelled, ['bug'])).toBe(false);
		expect(logMatchesLabels(withoutTask, ['bug'])).toBe(false);
		expect(logMatchesLabels(withoutTask, [])).toBe(true);
	});

	it('combines the three filters: a log must pass each one that holds a value', () => {
		const bug = { id: 'bug', name: 'Bug' };
		const billableBug = logOf({ projectId: 'website', isBillable: true, task: { id: 't1', tags: [bug] } });
		const unbilledBug = logOf({ projectId: 'website', isBillable: false, task: { id: 't1', tags: [bug] } });
		const filters = { clients: ['acme'], billable: [BILLABLE_ONLY_VALUE], labels: ['bug'] };
		const noFilters = { clients: [], billable: [], labels: [] };

		expect(logMatchesReportFilters(billableBug, filters, clientIds)).toBe(true);
		expect(logMatchesReportFilters(unbilledBug, filters, clientIds)).toBe(false);
		expect(logMatchesReportFilters(billableBug, { ...filters, clients: ['globex'] }, clientIds)).toBe(false);
		expect(logMatchesReportFilters(billableBug, { ...filters, labels: ['urgent'] }, clientIds)).toBe(false);
		expect(logMatchesReportFilters(unbilledBug, noFilters, clientIds)).toBe(true);
	});

	it('offers the labels of the tasks worked in the period, each once, by name', () => {
		const bug = { id: 'bug', name: 'Bug', color: '#f00' };
		const urgent = { id: 'urgent', name: 'urgent' };
		const logs = [
			logOf({ task: { id: 't2', tags: [urgent, bug] } }),
			logOf({ task: { id: 't1', tags: [bug] } }),
			logOf({})
		];

		expect(labelsOfLogs(logs)).toEqual([
			{ id: 'bug', name: 'Bug', color: '#f00' },
			{ id: 'urgent', name: 'urgent', color: null }
		]);
	});
});

describe('the clients a report offers', () => {
	it('lists the active clients by name', () => {
		const choices = reportClientChoicesOf(
			[
				{ id: 'globex', name: 'Globex' },
				{ id: 'acme', name: 'acme' }
			],
			[]
		);

		expect(choices).toEqual([
			{ id: 'acme', name: 'acme' },
			{ id: 'globex', name: 'Globex' }
		]);
	});

	it('adds the clients only a project names, for a viewer who may not read the clients', () => {
		const projects = [
			{ organizationContact: { id: 'acme', name: 'Acme' } },
			{ organizationContact: { id: 'acme', name: 'Acme' } },
			{ organizationContact: null },
			{ organizationContact: { id: 'unnamed', name: null } }
		];

		expect(reportClientChoicesOf([], projects)).toEqual([{ id: 'acme', name: 'Acme' }]);
	});
});

describe('the daily report of the picked clients', () => {
	const employeeLogs = [{ employee: { id: 'ada' }, sum: 600, activity: 50, tasks: [] }];
	const report = [
		{
			date: '2026-11-03',
			logs: [
				{ project: { id: 'website', name: 'Website' }, employeeLogs },
				{ project: { id: 'internal', name: 'Internal' }, employeeLogs },
				{ project: null, employeeLogs }
			]
		},
		{
			date: '2026-11-04',
			logs: [
				{
					project: { id: 'archived-project', name: 'Old site', organizationContact: { id: 'acme' } },
					employeeLogs
				}
			]
		},
		{ date: '2026-11-05', logs: [{ project: { id: 'internal', name: 'Internal' }, employeeLogs }] }
	] as unknown as ITimeLogGroupedDailyReport[];

	const projectNamesOf = (days: ITimeLogGroupedDailyReport[]) =>
		days.map((day) => [day.date, day.logs.map((projectLog) => projectLog.project?.name ?? null)]);

	it('is the report itself while no client is picked', () => {
		expect(filterDailyReportByClients(report, [], clientIds)).toBe(report);
	});

	it("keeps the client's projects whole, an archived project by the client the report names for it", () => {
		const filtered = filterDailyReportByClients(report, ['acme'], clientIds);

		expect(projectNamesOf(filtered)).toEqual([
			['2026-11-03', ['Website']],
			['2026-11-04', ['Old site']]
		]);
		expect(filtered[0].logs[0]).toBe(report[0].logs[0]);
	});

	it('keeps under "No client" the projects without one and the time without a project', () => {
		const filtered = filterDailyReportByClients(report, [NO_CLIENT_FILTER_VALUE], clientIds);

		expect(projectNamesOf(filtered)).toEqual([
			['2026-11-03', ['Internal', null]],
			['2026-11-05', ['Internal']]
		]);
	});

	it('leaves the report given untouched', () => {
		filterDailyReportByClients(report, ['acme'], clientIds);

		expect(report[0].logs).toHaveLength(3);
	});

	it('counts a project whose client was removed under "No client", even in a report read before the removal', () => {
		const readBeforeRemoval = [
			{
				date: '2026-11-03',
				logs: [
					{
						project: { id: 'internal', name: 'Internal', organizationContact: { id: 'acme' } },
						employeeLogs
					}
				]
			}
		] as unknown as ITimeLogGroupedDailyReport[];

		const underAcme = filterDailyReportByClients(readBeforeRemoval, ['acme'], clientIds);
		const underNoClient = filterDailyReportByClients(readBeforeRemoval, [NO_CLIENT_FILTER_VALUE], clientIds);

		expect(projectNamesOf(underAcme)).toEqual([]);
		expect(projectNamesOf(underNoClient)).toEqual([['2026-11-03', ['Internal']]]);
	});
});
