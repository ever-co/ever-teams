/** @jest-environment jsdom */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import type { PropsWithChildren } from 'react';
import type { Period } from '@/core/lib/utils/dashboard-period';
import { BILLABLE_ONLY_VALUE } from '@/core/lib/utils/dashboards/report-filters';
import { ALL_STATUSES, emptySheetMemberOf } from '@/core/lib/utils/dashboards/timesheets';
import type { TOrganization } from '@/core/types/schemas/organization/organization.schema';

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('sonner', () => {
	const toast = Object.assign(jest.fn(), { error: jest.fn(), success: jest.fn() });
	return { toast };
});
jest.mock('@/core/services/client/api/timesheets/time-log.service', () => ({ timeLogService: {} }));
jest.mock('@/core/hooks/organizations/projects/use-organization-projects-query', () => ({
	useOrganizationProjectsQuery: () => ({ organizationProjects: [] })
}));
jest.mock('@/core/hooks/roles/use-my-role-permissions-query', () => ({
	useMyRolePermissionsQuery: () => ({ myPermissions: ['ALLOW_MANUAL_TIME'], isLoading: false })
}));

import { currentOrganizationState } from '@/core/stores/user/user-organizations';
import { useSheetEditing } from './use-sheet-editing';
import { useTimesheetSheet } from './use-timesheet-sheet';
import type { TimesheetFilterSelection, TimesheetsPageState } from './use-timesheets-page';

const period: Period = { from: new Date(2024, 0, 8), to: new Date(2024, 0, 14) };

const VIEWER = emptySheetMemberOf('viewer', 'Viewer', null);
const MEMBERS = [VIEWER];

const NO_FILTERS: TimesheetFilterSelection = {
	members: [],
	projects: [],
	tasks: [],
	clients: [],
	billable: [],
	labels: []
};

/** The values sheet editing reads from the Timesheets page, for the viewer's own week with every log read. */
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
		period,
		allLogs: [],
		statusFilter: ALL_STATUSES,
		search: '',
		filters: { ...NO_FILTERS, ...filters }
	};
	return page as unknown as TimesheetsPageState;
}

function sheetLockUnder(filters: Partial<TimesheetFilterSelection>) {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const store = createStore();
	store.set(currentOrganizationState, { id: 'organization', allowManualTime: true } as TOrganization);
	const page = pageUnder(filters);
	const wrapper = ({ children }: PropsWithChildren) => (
		<Provider store={store}>
			<QueryClientProvider client={client}>{children}</QueryClientProvider>
		</Provider>
	);
	const { result } = renderHook(
		() => {
			const sheet = useTimesheetSheet(page.allLogs, period, MEMBERS);
			return useSheetEditing(page, sheet);
		},
		{ wrapper }
	);
	return result.current.sheetLock;
}

describe('useSheetEditing under the filters of the Timesheets page', () => {
	beforeEach(() => {
		window.localStorage.clear();
	});

	it('leaves the sheet open without a filter, and under a member filter, which hides none of a member time', () => {
		expect(sheetLockUnder({})).toBe('none');
		expect(sheetLockUnder({ members: ['viewer'] })).toBe('none');
	});

	it('closes the sheet under a client, a billable or a label filter, which hide part of the time like the others', () => {
		expect(sheetLockUnder({ projects: ['project-1'] })).toBe('filtered');
		expect(sheetLockUnder({ clients: ['client-1'] })).toBe('filtered');
		expect(sheetLockUnder({ billable: [BILLABLE_ONLY_VALUE] })).toBe('filtered');
		expect(sheetLockUnder({ labels: ['label-1'] })).toBe('filtered');
	});
});
