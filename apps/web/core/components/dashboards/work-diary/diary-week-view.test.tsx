/** @jest-environment jsdom */
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import type { SheetEditingSource } from '@/core/hooks/dashboards/timesheets/use-sheet-editing';
import type { WorkDiaryPageState } from '@/core/hooks/dashboards/work-diary/use-work-diary-page';
import type { Period } from '@/core/lib/utils/dashboard-period';
import { ETimeLogType } from '@/core/types/generics/enums/timer';
import { ETimesheetStatus } from '@/core/types/generics/enums/timesheet';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import type { TOrganization } from '@/core/types/schemas/organization/organization.schema';

const mockGetTimeLogs = jest.fn();
const mockCreateTimesheetFrom = jest.fn();
const mockDeleteLogs = jest.fn();
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
jest.mock('@/core/services/client/api/timesheets/time-log.service', () => ({
	timeLogService: {
		getTimeLogs: (...args: unknown[]) => mockGetTimeLogs(...args),
		createTimesheetFrom: (...args: unknown[]) => mockCreateTimesheetFrom(...args),
		deleteTaskTimesheetLogs: jest.fn(),
		updateTimeLog: jest.fn()
	}
}));
jest.mock('@/core/hooks/organizations/projects/use-organization-projects-query', () => ({
	useOrganizationProjectsQuery: () => ({ organizationProjects: [] })
}));
jest.mock('@/core/hooks/roles/use-my-role-permissions-query', () => ({
	useMyRolePermissionsQuery: () => mockPermissions()
}));
jest.mock('@/core/hooks/queries/user-user.query', () => ({
	useUserQuery: () => ({ data: { id: 'user', name: 'Mia Member', employee: { id: 'member' } } })
}));
jest.mock('@/core/hooks/dashboards/timesheets/use-timesheet-log-actions', () => ({
	useTimesheetLogActions: () => ({ deleteLogs: (...args: unknown[]) => mockDeleteLogs(...args), isDeleting: false })
}));
jest.mock('@/core/components/tasks/drawer/task-drawer-link', () => ({
	TaskDrawerLink: ({ children }: { children: ReactNode }) => <a href="/task">{children}</a>
}));
jest.mock('@/core/components/tasks/task-property-icon', () => ({ TaskPropertyIcon: () => null }));
jest.mock('@/core/components/common/entity-tile', () => ({ EntityTile: () => null }));
jest.mock('@/core/components/tasks/detail/task-picker-menu', () => ({
	TaskPickerMenu: ({ children }: { children: ReactNode }) => <button type="button">{children}</button>
}));
jest.mock('@/core/components/common/alert-dialog-confirmation', () => ({
	AlertConfirmationModal: ({ open, onAction }: { open: boolean; onAction: () => Promise<void> }) =>
		open ? (
			<button type="button" onClick={() => void onAction()}>
				confirm delete
			</button>
		) : null
}));

import { currentOrganizationState } from '@/core/stores/user/user-organizations';
import { DiaryWeekView } from './diary-week-view';

const week: Period = { from: new Date(2024, 0, 8), to: new Date(2024, 0, 14, 23, 59, 59, 999) };

const TRACKED_LOG: ITimeLog = {
	id: 'log-1',
	duration: 0,
	version: '1',
	logType: ETimeLogType.TRACKED,
	employeeId: 'member',
	employee: { id: 'member', fullName: 'Mia Member' } as ITimeLog['employee'],
	projectId: 'project-1',
	project: { id: 'project-1', name: 'Website' } as ITimeLog['project'],
	taskId: 'task-1',
	task: { id: 'task-1', title: 'Write the report' } as ITimeLog['task'],
	timesheet: { id: 'timesheet-1', status: ETimesheetStatus.PENDING } as ITimeLog['timesheet'],
	startedAt: new Date(2024, 0, 9, 9),
	stoppedAt: new Date(2024, 0, 9, 11)
};

const ALL_TIME_PERMISSIONS = ['ALLOW_MANUAL_TIME', 'ALLOW_DELETE_TIME'];

function sourceOf(logs: ITimeLog[]): SheetEditingSource {
	return {
		ownEmployeeId: 'member',
		hasOrganizationRole: false,
		period: week,
		periodLogs: logs,
		hasPeriodLogs: true,
		isFiltered: false,
		tenantId: 'tenant',
		organizationId: 'organization',
		userTimeZone: 'UTC'
	};
}

interface Scenario {
	logs?: ITimeLog[];
	organization?: Partial<TOrganization>;
	isLoading?: boolean;
	isError?: boolean;
}

function renderWeek(scenario: Scenario = {}) {
	const logs = scenario.logs ?? [TRACKED_LOG];
	const refetch = jest.fn();
	const page = {
		week,
		weekSheet: {
			source: sourceOf(logs),
			isLoading: scenario.isLoading ?? false,
			isError: scenario.isError ?? false,
			refetch
		}
	} as unknown as WorkDiaryPageState;
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const store = createStore();
	const organization = { id: 'organization', allowManualTime: true, ...scenario.organization } as TOrganization;
	store.set(currentOrganizationState, organization);
	mockGetTimeLogs.mockResolvedValue(logs);
	render(
		<Provider store={store}>
			<QueryClientProvider client={client}>
				<DiaryWeekView page={page} />
			</QueryClientProvider>
		</Provider>
	);
	return { refetch };
}

describe('DiaryWeekView', () => {
	beforeEach(() => {
		window.localStorage.clear();
		// The notices' orb asks whether motion is reduced; jsdom has no matchMedia
		window.matchMedia = jest.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia;
		mockPermissions.mockReturnValue({ myPermissions: ALL_TIME_PERMISSIONS, isLoading: false });
		mockCreateTimesheetFrom.mockResolvedValue(undefined);
		mockDeleteLogs.mockResolvedValue(true);
	});

	it("shows the member's own week on the sheet, without the member rail or the approval tools", () => {
		renderWeek();

		const block = screen.getByRole('region', { name: 'dashboard.workDiary.WEEK_TITLE' });
		const sheet = within(block).getByRole('table', {
			name: 'dashboard.timesheets.SHEET.TABLE_LABEL:{"name":"Mia Member"}'
		});
		expect(within(sheet).getByText('Write the report')).toBeTruthy();
		expect(within(sheet).getAllByText('2h 0m').length).toBeGreaterThan(0);
		expect(within(sheet).getByText('dashboard.timesheets.SHEET.PERIOD_TOTAL')).toBeTruthy();
		expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
		expect(screen.queryByText('dashboard.timesheets.SHEET.MEMBERS_LABEL')).toBeNull();
		expect(screen.queryByRole('button', { name: /PICK_MEMBER/ })).toBeNull();
		expect(screen.queryByText(/PENDING_SUMMARY/)).toBeNull();
		expect(screen.queryByRole('button', { name: /dashboard\.timesheets\.APPROVE/ })).toBeNull();
	});

	it("saves typed time as manual time for the member's own employee id", async () => {
		renderWeek();

		const cells = screen.getAllByRole('textbox');
		expect(cells).toHaveLength(7);
		const wednesday = cells[2];
		fireEvent.focus(wednesday);
		fireEvent.change(wednesday, { target: { value: '1:30' } });
		fireEvent.blur(wednesday);

		await waitFor(() => expect(mockCreateTimesheetFrom).toHaveBeenCalledTimes(1));
		expect(mockCreateTimesheetFrom).toHaveBeenCalledWith(
			expect.objectContaining({
				employeeId: 'member',
				taskId: 'task-1',
				projectId: 'project-1',
				logType: ETimeLogType.MANUAL,
				startedAt: new Date(2024, 0, 10, 9, 0),
				stoppedAt: new Date(2024, 0, 10, 10, 30)
			})
		);
		expect(mockGetTimeLogs).toHaveBeenCalledWith(expect.objectContaining({ employeeIds: ['member'] }));
	});

	it('is read only, and says why, when the role may not add manual time', () => {
		mockPermissions.mockReturnValue({ myPermissions: ['TIME_TRACKER', 'ALLOW_DELETE_TIME'], isLoading: false });
		renderWeek();

		expect(screen.queryAllByRole('textbox')).toHaveLength(0);
		expect(screen.getByText('dashboard.workDiary.WEEK_NO_MANUAL_TIME_PERMISSION')).toBeTruthy();
		expect(screen.queryByText('dashboard.timesheets.SHEET.EDIT.NOTICE_PERMISSION')).toBeNull();
		expect(screen.queryByText('dashboard.timesheets.SHEET.EDIT.ADD_ROW')).toBeNull();
		expect(screen.queryByText('dashboard.timesheets.SHEET.COPY.MENU')).toBeNull();
	});

	it('is read only, and says why, when the organization turns manual time off', () => {
		renderWeek({ organization: { allowManualTime: false } });

		expect(screen.queryAllByRole('textbox')).toHaveLength(0);
		expect(screen.getByText('dashboard.timesheets.SHEET.EDIT.NOTICE_MANUAL_TIME_OFF')).toBeTruthy();
	});

	it('offers to add a row and to copy last week on an empty week that can be filled', () => {
		renderWeek({ logs: [] });

		expect(screen.getByText('dashboard.timesheets.SHEET.EDIT.EMPTY_HINT')).toBeTruthy();
		expect(screen.getByText('dashboard.timesheets.SHEET.EDIT.ADD_ROW')).toBeTruthy();
		expect(screen.getByText('dashboard.timesheets.SHEET.COPY.MENU')).toBeTruthy();
	});

	it('says that an empty week has no time when it cannot be filled', () => {
		mockPermissions.mockReturnValue({ myPermissions: [], isLoading: false });
		renderWeek({ logs: [] });

		expect(screen.getByText(/^dashboard\.calendar\.EMPTY_PERIOD/)).toBeTruthy();
		expect(screen.queryByText('dashboard.timesheets.SHEET.EDIT.EMPTY_HINT')).toBeNull();
	});

	it("names an empty week in the workspace's date format", () => {
		mockPermissions.mockReturnValue({ myPermissions: [], isLoading: false });
		renderWeek({ logs: [], organization: { dateFormat: 'DD/MM/YYYY' } });

		const emptyWeek = 'dashboard.calendar.EMPTY_PERIOD:{"period":"08/01/2024 – 14/01/2024"}';
		expect(screen.getByText(emptyWeek)).toBeTruthy();
	});

	it('says nothing of an empty week until the permissions tell whether it can be filled', () => {
		mockPermissions.mockReturnValue({ myPermissions: [], isLoading: true });
		renderWeek({ logs: [] });

		expect(screen.getByRole('table')).toBeTruthy();
		expect(screen.queryByText(/^dashboard\.calendar\.EMPTY_PERIOD/)).toBeNull();
		expect(screen.queryByText('dashboard.timesheets.SHEET.EDIT.EMPTY_HINT')).toBeNull();
	});

	it('deletes an entry from its cell, and offers neither to edit it nor to approve it', async () => {
		renderWeek();

		fireEvent.click(
			screen.getByRole('button', { name: 'dashboard.timesheets.SHEET.EDIT.SHOW_ENTRIES:{"count":1}' })
		);
		const entries = await screen.findByRole('dialog', { name: 'dashboard.timesheets.SHEET.ENTRIES_LABEL' });
		expect(within(entries).queryByRole('button', { name: 'common.EDIT' })).toBeNull();
		expect(within(entries).queryByRole('button', { name: 'dashboard.timesheets.APPROVE' })).toBeNull();

		fireEvent.click(within(entries).getByRole('button', { name: 'common.DELETE' }));
		fireEvent.click(await screen.findByRole('button', { name: 'confirm delete' }));

		await waitFor(() => expect(mockDeleteLogs).toHaveBeenCalledWith(['log-1'], true));
	});

	it('lists the entries of a cell without any action while the sheet is read only', async () => {
		mockPermissions.mockReturnValue({ myPermissions: ['ALLOW_DELETE_TIME'], isLoading: false });
		renderWeek();

		fireEvent.click(screen.getByRole('button', { name: /^dashboard\.timesheets\.SHEET\.CELL_LABEL/ }));
		const entries = await screen.findByRole('dialog', { name: 'dashboard.timesheets.SHEET.ENTRIES_LABEL' });

		expect(within(entries).queryByRole('button', { name: 'common.DELETE' })).toBeNull();
		expect(within(entries).queryByRole('button', { name: 'common.EDIT' })).toBeNull();
	});

	it('keeps the frame of the sheet while the week loads', () => {
		renderWeek({ isLoading: true });

		expect(screen.getByRole('region', { name: 'dashboard.workDiary.WEEK_TITLE' })).toBeTruthy();
		expect(screen.getByRole('heading', { name: 'dashboard.workDiary.WEEK_TITLE' })).toBeTruthy();
		expect(screen.queryByRole('table')).toBeNull();
	});

	it('offers to read the week again when its read failed', () => {
		const { refetch } = renderWeek({ isError: true });

		expect(screen.queryByRole('table')).toBeNull();
		fireEvent.click(screen.getByRole('button', { name: 'pages.unauthorized.TRY_AGAIN' }));
		expect(refetch).toHaveBeenCalled();
	});
});
