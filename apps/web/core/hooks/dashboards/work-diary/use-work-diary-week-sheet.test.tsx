/** @jest-environment jsdom */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import type { PropsWithChildren } from 'react';
import type { SheetEditingSource } from '@/core/hooks/dashboards/timesheets/use-sheet-editing';
import type { Period } from '@/core/lib/utils/dashboard-period';
import { sheetRowKeyOf, timesheetFormattersOf } from '@/core/lib/utils/dashboards/timesheets';
import { queryKeys } from '@/core/query/keys';
import { ETimeLogType } from '@/core/types/generics/enums/timer';
import { ETimesheetStatus } from '@/core/types/generics/enums/timesheet';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import type { TOrganization } from '@/core/types/schemas/organization/organization.schema';

const mockDeleteLogs = jest.fn();
const mockPermissions = jest.fn();

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key, useLocale: () => 'en' }));
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
jest.mock('@/core/hooks/queries/user-user.query', () => ({
	useUserQuery: () => ({ data: { id: 'user', name: 'Mia Member', employee: { id: 'member' } } })
}));
jest.mock('@/core/hooks/dashboards/timesheets/use-timesheet-log-actions', () => ({
	useTimesheetLogActions: () => ({ deleteLogs: (...args: unknown[]) => mockDeleteLogs(...args), isDeleting: false })
}));

import { currentOrganizationState } from '@/core/stores/user/user-organizations';
import { useWorkDiaryWeekSheet } from './use-work-diary-week-sheet';

const week: Period = { from: new Date(2024, 0, 8), to: new Date(2024, 0, 14, 23, 59, 59, 999) };

const DAY_KEY = '2024-01-09';

function logOf(overrides: Partial<ITimeLog>): ITimeLog {
	return {
		id: 'log-1',
		duration: 0,
		version: '1',
		logType: ETimeLogType.TRACKED,
		employeeId: 'member',
		projectId: 'project-1',
		taskId: 'task-1',
		startedAt: new Date(2024, 0, 9, 9),
		stoppedAt: new Date(2024, 0, 9, 11),
		...overrides
	};
}

const PENDING_LOG = logOf({});

const APPROVED_LOG = logOf({
	timesheet: {
		id: 'timesheet-1',
		status: ETimesheetStatus.APPROVED,
		startedAt: new Date(2024, 0, 8),
		stoppedAt: new Date(2024, 0, 14)
	} as ITimeLog['timesheet']
});

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

function renderWeekSheet(logs: ITimeLog[], organization: Partial<TOrganization> = {}) {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const store = createStore();
	store.set(currentOrganizationState, {
		id: 'organization',
		allowManualTime: true,
		...organization
	} as TOrganization);
	const source = sourceOf(logs);
	const wrapper = ({ children }: PropsWithChildren) => (
		<Provider store={store}>
			<QueryClientProvider client={client}>{children}</QueryClientProvider>
		</Provider>
	);
	const rendered = renderHook(() => useWorkDiaryWeekSheet(source), { wrapper });
	return { ...rendered, client };
}

function openCellOf(result: { current: ReturnType<typeof useWorkDiaryWeekSheet> }, log: ITimeLog) {
	act(() => {
		result.current.sheet.openCellEntries({ rowKey: sheetRowKeyOf(log), dayKey: DAY_KEY, anchor: document.body });
	});
}

describe('useWorkDiaryWeekSheet', () => {
	beforeEach(() => {
		window.localStorage.clear();
		mockPermissions.mockReturnValue({
			myPermissions: ['ALLOW_MANUAL_TIME', 'ALLOW_DELETE_TIME'],
			isLoading: false
		});
		mockDeleteLogs.mockResolvedValue(true);
	});

	it("shows the member's own sheet and never offers what a manager does", () => {
		const { result } = renderWeekSheet([PENDING_LOG]);

		expect(result.current.sheet.members.map((member) => member.id)).toEqual(['member']);
		expect(result.current.sheet.member?.id).toBe('member');
		expect(result.current.permissions).toEqual({
			hasOrganizationRole: false,
			isManage: false,
			canApprove: false,
			userId: 'user',
			employeeId: 'member'
		});
		expect(result.current.editing.sheetLock).toBe('none');
	});

	it('lets an entry be deleted where time can be typed, once its cell is open', () => {
		const { result } = renderWeekSheet([PENDING_LOG]);
		expect(result.current.canDeleteOpenEntries).toBe(false);

		openCellOf(result, PENDING_LOG);

		expect(result.current.canDeleteOpenEntries).toBe(true);
	});

	it('keeps the entries of a read-only sheet and of an approved day', () => {
		mockPermissions.mockReturnValue({ myPermissions: ['ALLOW_DELETE_TIME'], isLoading: false });
		const readOnly = renderWeekSheet([PENDING_LOG]);
		openCellOf(readOnly.result, PENDING_LOG);
		expect(readOnly.result.current.canDeleteOpenEntries).toBe(false);
		readOnly.unmount();

		mockPermissions.mockReturnValue({
			myPermissions: ['ALLOW_MANUAL_TIME', 'ALLOW_DELETE_TIME'],
			isLoading: false
		});
		const approved = renderWeekSheet([APPROVED_LOG]);
		openCellOf(approved.result, APPROVED_LOG);
		expect(approved.result.current.canDeleteOpenEntries).toBe(false);
	});

	it('offers no deletion the role or the organization does not allow', () => {
		mockPermissions.mockReturnValue({ myPermissions: ['ALLOW_MANUAL_TIME'], isLoading: false });
		const withoutPermission = renderWeekSheet([PENDING_LOG]);
		openCellOf(withoutPermission.result, PENDING_LOG);
		expect(withoutPermission.result.current.canDeleteOpenEntries).toBe(false);
		withoutPermission.unmount();

		mockPermissions.mockReturnValue({
			myPermissions: ['ALLOW_MANUAL_TIME', 'ALLOW_DELETE_TIME'],
			isLoading: false
		});
		const turnedOff = renderWeekSheet([PENDING_LOG], { allowDeleteTime: false });
		openCellOf(turnedOff.result, PENDING_LOG);
		expect(turnedOff.result.current.canDeleteOpenEntries).toBe(false);
	});

	it('deletes the entry asked for, then has the screenshots of its day read again', async () => {
		const { result, client } = renderWeekSheet([PENDING_LOG]);
		const invalidate = jest.spyOn(client, 'invalidateQueries');

		act(() => result.current.askToDeleteEntry(PENDING_LOG));
		await act(async () => {
			await result.current.confirmDelete();
		});

		expect(mockDeleteLogs).toHaveBeenCalledWith(['log-1'], true);
		expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.timer.timeSlots.all });
	});

	it("writes the days of the sheet in the workspace's date format, as the sheet of Timesheets does", () => {
		const day = new Date(2024, 0, 9);
		const withFormat = renderWeekSheet([PENDING_LOG], { dateFormat: 'DD/MM/YYYY' });
		expect(withFormat.result.current.formatters.dayDate(day)).toBe('09/01/2024');
		withFormat.unmount();

		const withoutFormat = renderWeekSheet([PENDING_LOG]);
		const readerFormatters = timesheetFormattersOf('en');
		expect(withoutFormat.result.current.formatters.dayDate(day)).toBe(readerFormatters.dayDate(day));
	});
});
