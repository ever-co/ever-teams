import { localDayKeyOf } from '@/core/lib/utils/dashboard-export';
import { periodOfPreset } from '@/core/lib/utils/dashboard-period';
import type { TimeActivityFilters } from '@/core/lib/utils/dashboards/time-activity';
import type { IPublicSavedReport, ISavedReport } from '@/core/types/interfaces/timesheet/saved-report';
import {
	canSaveView,
	canUpdateReport,
	dailyReportOfPublic,
	linkParamsOfSavedReport,
	linkUsesEntryLabels,
	savedPeriodOf,
	savedReportInputOf,
	shareExpiryDayOf,
	shareExpiryOf,
	sharedReportUrlOf,
	showsSavedView,
	type TimeActivityView
} from './saved-report';

const MONDAY = 1;

const NO_FILTERS: TimeActivityFilters = {
	teamIds: [],
	employeeIds: [],
	projectIds: [],
	taskIds: [],
	clientIds: [],
	billable: [],
	entryLabels: []
};

const CLIENT_A_LAST_MONTH: TimeActivityView = {
	period: periodOfPreset('lastMonth', MONDAY),
	filters: { ...NO_FILTERS, clientIds: ['client-a'], employeeIds: ['ada', 'bob'], billable: ['true'] },
	grouping: 'project'
};

function savedReportOf(fields: Partial<ISavedReport>): ISavedReport {
	return { id: 'r1', authorId: 'u1', name: 'Client A, last month', kind: 'TIME_AND_ACTIVITY', ...fields };
}

describe('savedPeriodOf', () => {
	it('keeps a preset period as its rule', () => {
		expect(savedPeriodOf(periodOfPreset('lastMonth', MONDAY), MONDAY)).toEqual({
			periodRule: 'lastMonth',
			startDate: null,
			endDate: null
		});
	});

	it('keeps any other period as its two days', () => {
		const period = { from: new Date(2025, 0, 3), to: new Date(2025, 0, 9, 23, 59, 59) };
		expect(savedPeriodOf(period, MONDAY)).toEqual({
			periodRule: null,
			startDate: '2025-01-03',
			endDate: '2025-01-09'
		});
	});
});

describe('savedReportInputOf', () => {
	it('saves the period, every filter, the billable choice and the grouping', () => {
		expect(savedReportInputOf(CLIENT_A_LAST_MONTH, MONDAY, 'Africa/Kinshasa')).toEqual({
			periodRule: 'lastMonth',
			startDate: null,
			endDate: null,
			timeZone: 'Africa/Kinshasa',
			filters: {
				teamIds: [],
				employeeIds: ['ada', 'bob'],
				projectIds: [],
				taskIds: [],
				clientIds: ['client-a'],
				billableOnly: true
			},
			grouping: 'project'
		});
	});
});

describe('linkParamsOfSavedReport', () => {
	it('builds the whole view of a report kept as a rule, with its id', () => {
		const params = linkParamsOfSavedReport(
			savedReportOf({
				periodRule: 'lastMonth',
				filters: { clientIds: ['client-a', 'none'], teamIds: ['team-1'], billableOnly: true },
				grouping: 'project'
			})
		);

		expect(params.toString()).toBe(
			'period=lastMonth&teams=team-1&clients=client-a%2Cnone&billable=true&groupBy=project&report=r1'
		);
	});

	it('builds fixed days, and leaves the date grouping and empty filters out', () => {
		const params = linkParamsOfSavedReport(
			savedReportOf({ periodRule: null, startDate: '2026-10-01', endDate: '2026-10-31', grouping: 'date' })
		);

		expect(params.toString()).toBe('from=2026-10-01&to=2026-10-31&report=r1');
	});

	it('opens a report stored without filters or grouping as every entry of its period, by date', () => {
		const params = linkParamsOfSavedReport(savedReportOf({ periodRule: 'thisWeek', filters: null }));

		expect(params.toString()).toBe('period=thisWeek&report=r1');
	});
});

describe('canSaveView', () => {
	it('is true for a view a saved report keeps whole', () => {
		expect(canSaveView(CLIENT_A_LAST_MONTH)).toBe(true);
	});

	it.each([
		['narrowed by a label', { filters: { ...NO_FILTERS, entryLabels: ['design'] } }],
		['narrowed to the time without a label', { filters: { ...NO_FILTERS, entryLabels: ['no-label'] } }],
		['grouped by label', { grouping: 'label' as const }]
	])('is false for a view %s, which a saved report would not keep', (_case, change) => {
		expect(canSaveView({ ...CLIENT_A_LAST_MONTH, ...change })).toBe(false);
	});
});

describe('showsSavedView', () => {
	const saved = savedReportOf({
		...savedReportInputOf(CLIENT_A_LAST_MONTH, MONDAY, 'UTC'),
		filters: {
			employeeIds: ['bob', 'ada'],
			clientIds: ['client-a'],
			billableOnly: true
		}
	});

	it('is true for the view the report saved, whatever the order of its ids', () => {
		expect(showsSavedView(saved, CLIENT_A_LAST_MONTH, MONDAY)).toBe(true);
	});

	it('is false once the period, a filter or the grouping changed', () => {
		const otherPeriod = { ...CLIENT_A_LAST_MONTH, period: periodOfPreset('thisMonth', MONDAY) };
		const otherMembers = {
			...CLIENT_A_LAST_MONTH,
			filters: { ...CLIENT_A_LAST_MONTH.filters, employeeIds: ['ada'] }
		};
		const allTime = { ...CLIENT_A_LAST_MONTH, filters: { ...CLIENT_A_LAST_MONTH.filters, billable: [] } };
		const byMember = { ...CLIENT_A_LAST_MONTH, grouping: 'member' as const };

		expect(showsSavedView(saved, otherPeriod, MONDAY)).toBe(false);
		expect(showsSavedView(saved, otherMembers, MONDAY)).toBe(false);
		expect(showsSavedView(saved, allTime, MONDAY)).toBe(false);
		expect(showsSavedView(saved, byMember, MONDAY)).toBe(false);
	});

	it('is false once the labels of entries narrow the view, which a saved report does not keep', () => {
		const byLabel = {
			...CLIENT_A_LAST_MONTH,
			filters: { ...CLIENT_A_LAST_MONTH.filters, entryLabels: ['design'] }
		};
		const withoutLabel = {
			...CLIENT_A_LAST_MONTH,
			filters: { ...CLIENT_A_LAST_MONTH.filters, entryLabels: ['no-label'] }
		};

		expect(showsSavedView(saved, byLabel, MONDAY)).toBe(false);
		expect(showsSavedView(saved, withoutLabel, MONDAY)).toBe(false);
	});

	it('is false for a view grouped by label, even over a report saved by date', () => {
		const byDate = savedReportOf({ ...saved, grouping: null });
		const byLabel = { ...CLIENT_A_LAST_MONTH, grouping: 'label' as const };

		expect(showsSavedView(byDate, byLabel, MONDAY)).toBe(false);
	});

	it('compares a report saved with fixed days with the days shown, even on days a preset also covers', () => {
		const lastMonth = periodOfPreset('lastMonth', MONDAY);
		const fixedDays = savedReportOf({
			...saved,
			periodRule: null,
			startDate: localDayKeyOf(lastMonth.from),
			endDate: localDayKeyOf(lastMonth.to)
		});
		const thisMonth = { ...CLIENT_A_LAST_MONTH, period: periodOfPreset('thisMonth', MONDAY) };

		expect(showsSavedView(fixedDays, CLIENT_A_LAST_MONTH, MONDAY)).toBe(true);
		expect(showsSavedView(fixedDays, thisMonth, MONDAY)).toBe(false);
	});
});

describe('sharedReportUrlOf', () => {
	it('builds the address of the shared report, with the locale only when it is not the default one', () => {
		expect(sharedReportUrlOf('https://app.ever.team/', 'tok-1')).toBe(
			'https://app.ever.team/shared-report#token=tok-1'
		);
		expect(sharedReportUrlOf('https://app.ever.team', 'tok-1', 'fr')).toBe(
			'https://app.ever.team/fr/shared-report#token=tok-1'
		);
		expect(sharedReportUrlOf('https://app.ever.team', 'tok-1', 'en')).toBe(
			'https://app.ever.team/shared-report#token=tok-1'
		);
	});

	it('keeps the token out of every part of the address a server receives', () => {
		const address = new URL(sharedReportUrlOf('https://app.ever.team', 'gsr_secret-token', 'fr'));

		expect(address.pathname).toBe('/fr/shared-report');
		expect(address.search).toBe('');
		expect(`${address.origin}${address.pathname}${address.search}`).not.toContain('gsr_secret-token');
		expect(address.hash).toBe('#token=gsr_secret-token');
	});
});

describe('share expiry', () => {
	it('ends a link at the end of the day picked, and reads that day back', () => {
		const expiresAt = shareExpiryOf('2026-12-31');

		expect(expiresAt).toBe(new Date(2026, 11, 31, 23, 59, 59, 999).toISOString());
		expect(shareExpiryDayOf(expiresAt)).toBe('2026-12-31');
	});

	it('gives no end for no day or a broken one', () => {
		expect(shareExpiryOf(null)).toBeNull();
		expect(shareExpiryOf('2026-02-30')).toBeNull();
		expect(shareExpiryDayOf(null)).toBeNull();
		expect(shareExpiryDayOf('not a date')).toBeNull();
	});
});

describe('dailyReportOfPublic', () => {
	it('gives the days, projects, members and entries of a shared report in the shape of the daily report', () => {
		const shared = {
			days: [
				{
					date: '2026-10-02',
					sum: 3600,
					logs: [
						{
							project: { id: 'p1', name: 'Website', organizationContact: { id: 'client-a', name: 'A' } },
							employeeLogs: [
								{
									employee: {
										id: 'ada',
										fullName: 'Ada L',
										user: { firstName: 'Ada', lastName: 'L', name: 'Ada L' },
										billRateValue: 50,
										billRateCurrency: 'EUR'
									},
									sum: 3600,
									tasks: [
										{
											task: { id: 't1', title: 'Home page' },
											duration: 3600,
											client: null,
											organizationTeamId: null
										}
									]
								}
							]
						}
					]
				}
			]
		} as unknown as IPublicSavedReport;

		const [day] = dailyReportOfPublic(shared);
		const [projectLog] = day.logs;
		const [employeeLog] = projectLog.employeeLogs;

		expect(day.date).toBe('2026-10-02');
		expect(projectLog.project.id).toBe('p1');
		expect(employeeLog.employee.id).toBe('ada');
		expect(employeeLog.employee.billRateValue).toBe(50);
		expect(employeeLog.sum).toBe(3600);
		expect(employeeLog.activity).toBe(0);
		expect(employeeLog.tasks[0].duration).toBe(3600);
		expect(employeeLog.tasks[0].organizationTeamId).toBeNull();
	});

	it('keeps the rate each entry states, so its row is priced at the rate the entry stores, as on the report page', () => {
		const entry = (fields: Record<string, unknown>) => ({ task: null, duration: 3600, client: null, ...fields });
		const shared = {
			days: [
				{
					date: '2026-10-02',
					sum: 7200,
					logs: [
						{
							project: null,
							employeeLogs: [
								{
									employee: {
										id: 'ada',
										fullName: 'Ada L',
										user: {},
										billRateValue: 60,
										billRateCurrency: 'EUR'
									},
									sum: 7200,
									// Logged at 40 EUR, the rate the entry stores; and an entry of an API that states no rate
									tasks: [entry({ billRateValue: 40, billRateCurrency: 'EUR' }), entry({})]
								}
							]
						}
					]
				}
			]
		} as unknown as IPublicSavedReport;

		const [stored, unstated] = dailyReportOfPublic(shared)[0].logs[0].employeeLogs[0].tasks;

		expect(stored).toMatchObject({ billRateValue: 40, billRateCurrency: 'EUR' });
		expect('billRateValue' in unstated).toBe(false);
	});
});

/** A view a Gauzy with ever-gauzy#12073 keeps (#5368): narrowed by two labels and the time without one, by label. */
const DESIGN_BY_LABEL: TimeActivityView = {
	...CLIENT_A_LAST_MONTH,
	filters: { ...CLIENT_A_LAST_MONTH.filters, entryLabels: ['design', 'review', 'no-label'] },
	grouping: 'label'
};

describe('saved reports and the labels of entries (ever-gauzy#12073)', () => {
	it('saves the entry Labels filter as the daily report takes it, and the Label grouping', () => {
		expect(savedReportInputOf(DESIGN_BY_LABEL, MONDAY, 'UTC')).toMatchObject({
			filters: { clientIds: ['client-a'], billableOnly: true, tagIds: ['design', 'review'], untagged: true },
			grouping: 'label'
		});
		const onlyWithoutLabel = { ...CLIENT_A_LAST_MONTH, filters: { ...NO_FILTERS, entryLabels: ['no-label'] } };
		expect(savedReportInputOf(onlyWithoutLabel, MONDAY, 'UTC').filters).toMatchObject({
			tagIds: [],
			untagged: true
		});
	});

	it('sends no labels field for a view without labels: the body an older Gauzy takes', () => {
		const filters = savedReportInputOf(CLIENT_A_LAST_MONTH, MONDAY, 'UTC').filters ?? {};

		expect('tagIds' in filters).toBe(false);
		expect('untagged' in filters).toBe(false);
	});

	it('saves a view narrowed or grouped by labels only where Gauzy keeps them', () => {
		expect(canSaveView(DESIGN_BY_LABEL, true)).toBe(true);
		expect(canSaveView({ ...CLIENT_A_LAST_MONTH, grouping: 'label' }, true)).toBe(true);
		expect(canSaveView(DESIGN_BY_LABEL, false)).toBe(false);
		expect(canSaveView(DESIGN_BY_LABEL)).toBe(false);
	});

	it('opens a report saved with labels on its labels and its Label grouping', () => {
		const params = linkParamsOfSavedReport(
			savedReportOf({
				periodRule: 'lastMonth',
				filters: { clientIds: ['client-a'], tagIds: ['design', 'review'], untagged: true },
				grouping: 'label'
			})
		);

		expect(params.toString()).toBe(
			'period=lastMonth&clients=client-a&entryLabels=design%2Creview%2Cno-label&groupBy=label&report=r1'
		);
	});

	it('opens a report saved with only the time without a label on "No label"', () => {
		const params = linkParamsOfSavedReport(
			savedReportOf({ periodRule: 'thisWeek', filters: { tagIds: [], untagged: true } })
		);

		expect(params.toString()).toBe('period=thisWeek&entryLabels=no-label&report=r1');
	});

	it('knows the view a report saved with labels keeps, and a change of its labels', () => {
		const saved = savedReportOf({
			...savedReportInputOf(DESIGN_BY_LABEL, MONDAY, 'UTC'),
			filters: {
				...savedReportInputOf(DESIGN_BY_LABEL, MONDAY, 'UTC').filters,
				tagIds: ['review', 'design']
			}
		});
		const otherLabels = {
			...DESIGN_BY_LABEL,
			filters: { ...DESIGN_BY_LABEL.filters, entryLabels: ['design', 'no-label'] }
		};
		const withLabelsTimeOnly = {
			...DESIGN_BY_LABEL,
			filters: { ...DESIGN_BY_LABEL.filters, entryLabels: ['design', 'review'] }
		};
		const withoutLabels = { ...DESIGN_BY_LABEL, filters: CLIENT_A_LAST_MONTH.filters };

		expect(showsSavedView(saved, DESIGN_BY_LABEL, MONDAY)).toBe(true);
		expect(showsSavedView(saved, otherLabels, MONDAY)).toBe(false);
		expect(showsSavedView(saved, withLabelsTimeOnly, MONDAY)).toBe(false);
		expect(showsSavedView(saved, withoutLabels, MONDAY)).toBe(false);
		expect(showsSavedView(saved, { ...DESIGN_BY_LABEL, grouping: 'project' }, MONDAY)).toBe(false);
	});

	it('tells a link that asks for labels, which the view shows only once entries are known to have them', () => {
		expect(linkUsesEntryLabels(new URLSearchParams('period=lastMonth&entryLabels=design'))).toBe(true);
		expect(linkUsesEntryLabels(new URLSearchParams('period=lastMonth&entryLabels=no-label'))).toBe(true);
		expect(linkUsesEntryLabels(new URLSearchParams('period=lastMonth&groupBy=label'))).toBe(true);
		expect(linkUsesEntryLabels(new URLSearchParams('period=lastMonth&labels=bug&groupBy=project'))).toBe(false);
	});

	it('writes no view over a report saved with labels until Gauzy is known to keep them', () => {
		const withLabels = savedReportOf({ filters: { tagIds: ['design'] }, grouping: 'project' });
		const byLabel = savedReportOf({ filters: {}, grouping: 'label' });
		const withoutLabels = savedReportOf({ filters: { clientIds: ['client-a'] }, grouping: 'project' });

		// The page drops the labels of a link while it does not know whether entries have labels: its view shows none
		expect(canUpdateReport(withLabels, CLIENT_A_LAST_MONTH, false)).toBe(false);
		expect(canUpdateReport(byLabel, CLIENT_A_LAST_MONTH, false)).toBe(false);
		expect(canUpdateReport(withLabels, CLIENT_A_LAST_MONTH, true)).toBe(true);
		expect(canUpdateReport(withoutLabels, CLIENT_A_LAST_MONTH, false)).toBe(true);
		expect(canUpdateReport(withoutLabels, DESIGN_BY_LABEL, false)).toBe(false);
		expect(canUpdateReport(withoutLabels, DESIGN_BY_LABEL, true)).toBe(true);
	});

	it("keeps each entry's labels in a shared report grouped by label, and states none where the link states none", () => {
		const shared = {
			days: [
				{
					date: '2026-10-02',
					sum: 7200,
					logs: [
						{
							project: null,
							employeeLogs: [
								{
									employee: { id: 'ada', fullName: 'Ada L', user: {} },
									sum: 7200,
									tasks: [
										{
											task: null,
											duration: 3600,
											client: null,
											tags: [{ id: 'design', name: 'Design', color: '#f00' }]
										},
										{ task: null, duration: 3600, client: null }
									]
								}
							]
						}
					]
				}
			]
		} as unknown as IPublicSavedReport;

		const [labelled, unstated] = dailyReportOfPublic(shared)[0].logs[0].employeeLogs[0].tasks;

		expect(labelled.tags).toEqual([{ id: 'design', name: 'Design', color: '#f00' }]);
		expect('tags' in unstated).toBe(false);
	});
});
