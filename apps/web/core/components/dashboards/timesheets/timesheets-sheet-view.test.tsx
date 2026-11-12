/** @jest-environment jsdom */
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import { type SheetEditingSource, useSheetEditing } from '@/core/hooks/dashboards/timesheets/use-sheet-editing';
import { useTimesheetSheet } from '@/core/hooks/dashboards/timesheets/use-timesheet-sheet';
import type { TimesheetPermissions } from '@/core/hooks/dashboards/timesheets/use-timesheets-page';
import type { Period } from '@/core/lib/utils/dashboard-period';
import { timesheetFormattersOf } from '@/core/lib/utils/dashboards/timesheets';
import { ETimeLogType } from '@/core/types/generics/enums/timer';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import type { TOrganization } from '@/core/types/schemas/organization/organization.schema';
import type { TimesheetRowHandlers } from './timesheet-log-row';

const mockPermissions = jest.fn();

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: Record<string, unknown>) =>
		values && Object.keys(values).length > 0 ? `${key}:${JSON.stringify(values)}` : key,
	useLocale: () => 'en'
}));
jest.mock('sonner', () => {
	const toast = Object.assign(jest.fn(), { error: jest.fn(), success: jest.fn() });
	return { toast };
});
jest.mock('@/core/services/client/api/timesheets/time-log.service', () => ({ timeLogService: {} }));
jest.mock('@/core/hooks/organizations/projects/use-organization-projects-query', () => ({
	useOrganizationProjectsQuery: () => ({ organizationProjects: [] })
}));
jest.mock('@/core/hooks/roles/use-my-role-permissions-query', () => ({
	useMyRolePermissionsQuery: () => mockPermissions()
}));
jest.mock('@/core/components/tasks/drawer/task-drawer-link', () => ({
	TaskDrawerLink: ({ children }: { children: ReactNode }) => <a href="/task">{children}</a>
}));
jest.mock('@/core/components/tasks/task-property-icon', () => ({ TaskPropertyIcon: () => null }));
jest.mock('@/core/components/common/entity-tile', () => ({ EntityTile: () => null }));
jest.mock('@/core/components/tasks/detail/task-picker-menu', () => ({
	TaskPickerMenu: ({ children }: { children: ReactNode }) => <button type="button">{children}</button>
}));

import { currentOrganizationState } from '@/core/stores/user/user-organizations';
import { TimesheetsSheetView } from './timesheets-sheet-view';

const period: Period = { from: new Date(2024, 0, 8), to: new Date(2024, 0, 14, 23, 59, 59, 999) };

const ROLE_NOTICE = 'dashboard.workDiary.WEEK_NO_MANUAL_TIME_PERMISSION';
const MEMBER_OR_ADMIN_NOTICE = 'dashboard.timesheets.SHEET.EDIT.NOTICE_PERMISSION';

function logOf(employeeId: string, fullName: string): ITimeLog {
	return {
		id: `log-${employeeId}`,
		duration: 0,
		version: '1',
		logType: ETimeLogType.TRACKED,
		employeeId,
		employee: { id: employeeId, fullName } as ITimeLog['employee'],
		projectId: 'project-1',
		project: { id: 'project-1', name: 'Website' } as ITimeLog['project'],
		taskId: 'task-1',
		task: { id: 'task-1', title: 'Write the report' } as ITimeLog['task'],
		startedAt: new Date(2024, 0, 9, 9),
		stoppedAt: new Date(2024, 0, 9, 11)
	};
}

const OWN_LOG = logOf('viewer', 'Vera Viewer');
const TEAMMATE_LOG = logOf('teammate', 'Tom Teammate');

function ignore() {
	return undefined;
}

const HANDLERS: TimesheetRowHandlers = {
	toggleLog: ignore,
	approve: ignore,
	reject: ignore,
	changeStatus: ignore,
	setBillable: ignore,
	edit: ignore,
	remove: ignore
};

const NO_SELECTED_IDS: ReadonlySet<string> = new Set();

const formatters = timesheetFormattersOf('en');

interface Scenario {
	log: ITimeLog;
	hasOrganizationRole: boolean;
}

function SheetOf({ log, hasOrganizationRole }: Readonly<Scenario>) {
	const logs = [log];
	const source: SheetEditingSource = {
		ownEmployeeId: 'viewer',
		hasOrganizationRole,
		period,
		periodLogs: logs,
		hasPeriodLogs: true,
		isFiltered: false,
		tenantId: 'tenant',
		organizationId: 'organization',
		userTimeZone: 'UTC'
	};
	const permissions: TimesheetPermissions = {
		hasOrganizationRole,
		isManage: true,
		canApprove: false,
		userId: 'user',
		employeeId: 'viewer'
	};
	const sheet = useTimesheetSheet(logs, period);
	const editing = useSheetEditing(source, sheet);
	return (
		<TimesheetsSheetView
			state={sheet}
			formatters={formatters}
			permissions={permissions}
			handlers={HANDLERS}
			selectedIdSet={NO_SELECTED_IDS}
			onSelectLogs={ignore}
			selection={{
				count: 0,
				seconds: 0,
				canDelete: false,
				onApprove: ignore,
				onReject: ignore,
				onDelete: ignore,
				onClear: ignore
			}}
			pending={{ count: 0, seconds: 0, onApprove: ignore, onReject: ignore }}
			isApproving={false}
			emptyContent={null}
			editing={editing}
			onClearFilters={ignore}
		/>
	);
}

function renderSheet(scenario: Scenario) {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const store = createStore();
	store.set(currentOrganizationState, { id: 'organization', allowManualTime: true } as TOrganization);
	return render(
		<Provider store={store}>
			<QueryClientProvider client={client}>
				<SheetOf log={scenario.log} hasOrganizationRole={scenario.hasOrganizationRole} />
			</QueryClientProvider>
		</Provider>
	);
}

describe('TimesheetsSheetView, the notice of a sheet closed by a permission', () => {
	beforeEach(() => {
		window.localStorage.clear();
	});

	it('tells a viewer whose role may not add manual time that the role closes the sheet, on their own sheet and as an admin', () => {
		mockPermissions.mockReturnValue({ myPermissions: ['TIME_TRACKER'], isLoading: false });

		const ownSheet = renderSheet({ log: OWN_LOG, hasOrganizationRole: false });
		expect(screen.getByText(ROLE_NOTICE)).toBeTruthy();
		expect(screen.queryByText(MEMBER_OR_ADMIN_NOTICE)).toBeNull();
		ownSheet.unmount();

		renderSheet({ log: TEAMMATE_LOG, hasOrganizationRole: true });
		expect(screen.getByText(ROLE_NOTICE)).toBeTruthy();
		expect(screen.queryByText(MEMBER_OR_ADMIN_NOTICE)).toBeNull();
	});

	it('keeps "only the member or an admin" on another member\'s sheet seen without an organization role', () => {
		mockPermissions.mockReturnValue({ myPermissions: ['ALLOW_MANUAL_TIME'], isLoading: false });
		const withPermission = renderSheet({ log: TEAMMATE_LOG, hasOrganizationRole: false });
		expect(screen.getByText(MEMBER_OR_ADMIN_NOTICE)).toBeTruthy();
		expect(screen.queryByText(ROLE_NOTICE)).toBeNull();
		withPermission.unmount();

		mockPermissions.mockReturnValue({ myPermissions: ['TIME_TRACKER'], isLoading: false });
		renderSheet({ log: TEAMMATE_LOG, hasOrganizationRole: false });
		expect(screen.getByText(MEMBER_OR_ADMIN_NOTICE)).toBeTruthy();
		expect(screen.queryByText(ROLE_NOTICE)).toBeNull();
	});
});
