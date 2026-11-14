import { periodOfPreset } from '@/core/lib/utils/dashboard-period';
import type { TimeActivityFilters } from '@/core/lib/utils/dashboards/time-activity';
import type { IPublicSavedReport, ISavedReport } from '@/core/types/interfaces/timesheet/saved-report';
import {
	dailyReportOfPublic,
	linkParamsOfSavedReport,
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
	billable: []
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
});

describe('sharedReportUrlOf', () => {
	it('builds the address of the shared report, with the locale only when it is not the default one', () => {
		expect(sharedReportUrlOf('https://app.ever.team/', 'tok-1')).toBe('https://app.ever.team/shared-report/tok-1');
		expect(sharedReportUrlOf('https://app.ever.team', 'tok-1', 'fr')).toBe(
			'https://app.ever.team/fr/shared-report/tok-1'
		);
		expect(sharedReportUrlOf('https://app.ever.team', 'tok-1', 'en')).toBe(
			'https://app.ever.team/shared-report/tok-1'
		);
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
});
