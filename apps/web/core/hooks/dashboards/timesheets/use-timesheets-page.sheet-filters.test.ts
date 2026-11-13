import { BILLABLE_ONLY_VALUE } from '@/core/lib/utils/dashboards/report-filters';
import { ALL_STATUSES } from '@/core/lib/utils/dashboards/timesheets';
import { sheetEditingSourceOf, type TimesheetFilterSelection, type TimesheetsPageState } from './use-timesheets-page';

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key, useLocale: () => 'en' }));

const NO_FILTERS: TimesheetFilterSelection = {
	members: [],
	projects: [],
	tasks: [],
	clients: [],
	billable: [],
	labels: []
};

/** The values the sheet's editing reads from the Timesheets page, for the viewer's own week with every log read. */
function pageUnder(filters: Partial<TimesheetFilterSelection>): TimesheetsPageState {
	const page = {
		permissions: {
			hasOrganizationRole: false,
			isManage: false,
			canApprove: false,
			userId: 'user',
			employeeId: 'viewer'
		},
		logsQuery: { data: [], isPlaceholderData: false },
		user: { tenantId: 'tenant', timeZone: 'UTC', employee: { organizationId: 'organization' } },
		period: { from: new Date(2024, 0, 8), to: new Date(2024, 0, 14) },
		allLogs: [],
		statusFilter: ALL_STATUSES,
		search: '',
		filters: { ...NO_FILTERS, ...filters }
	};
	return page as unknown as TimesheetsPageState;
}

function isSheetFilteredUnder(filters: Partial<TimesheetFilterSelection>) {
	return sheetEditingSourceOf(pageUnder(filters)).isFiltered;
}

describe('the week sheet under the filters of the Timesheets page', () => {
	it('stays open without a filter, and under a member filter, which hides none of a member time', () => {
		expect(isSheetFilteredUnder({})).toBe(false);
		expect(isSheetFilteredUnder({ members: ['viewer'] })).toBe(false);
	});

	it('closes under a client, a billable or a label filter, which hide part of the time like the others', () => {
		expect(isSheetFilteredUnder({ projects: ['project-1'] })).toBe(true);
		expect(isSheetFilteredUnder({ clients: ['client-1'] })).toBe(true);
		expect(isSheetFilteredUnder({ billable: [BILLABLE_ONLY_VALUE] })).toBe(true);
		expect(isSheetFilteredUnder({ labels: ['label-1'] })).toBe(true);
	});
});
