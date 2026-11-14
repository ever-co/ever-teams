/** @jest-environment jsdom */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import type { TimesheetEntryGroup } from '@/core/lib/utils/dashboards/timesheet-entry-groups';
import { ETimesheetStatus } from '@/core/types/generics/enums/timesheet';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';

const mockToast = { success: jest.fn(), warning: jest.fn(), error: jest.fn() };
const mockGetTimeLogConflicts = jest.fn();
const mockUpdateTimeLog = jest.fn();
const mockGetTimeLogs = jest.fn();
/** The entries as the API holds them now. */
let mockStoredLogs: ITimeLog[] = [];

jest.mock('sonner', () => ({
	toast: {
		success: (message: string) => mockToast.success(message),
		warning: (message: string) => mockToast.warning(message),
		error: (message: string) => mockToast.error(message)
	}
}));
jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: Record<string, unknown>) => {
		if (!values) {
			return key;
		}
		const parts = Object.entries(values).map(([name, value]) => `${name}=${String(value)}`);
		return `${key}(${parts.join(',')})`;
	}
}));
// The billable change runs as the page's bulk edit: each entry read again, its interval checked, then written
jest.mock('@/core/services/client/api/timesheets/time-log.service', () => ({
	timeLogService: {
		getTimeLogConflicts: (params: unknown) => mockGetTimeLogConflicts(params),
		getTimeLogs: (params: unknown) => mockGetTimeLogs(params),
		updateTimeLog: (payload: unknown) => mockUpdateTimeLog(payload)
	}
}));
jest.mock('@/core/lib/helpers/cookies', () => ({
	getOrganizationIdCookie: () => 'organization-a',
	getTenantIdCookie: () => 'tenant-a'
}));
jest.mock('@/core/lib/helpers/error-message', () => ({ logErrorInDev: jest.fn() }));

import type { TimesheetPermissions } from './use-timesheets-page';
import { useTimesheetGroupChange } from './use-timesheet-group-change';

const startedAt = new Date('2026-11-10T09:00:00.000Z');
const stoppedAt = new Date('2026-11-10T10:00:00.000Z');

function logOf(id: string, overrides: Partial<ITimeLog> = {}): ITimeLog {
	return {
		id,
		duration: 3600,
		version: '1',
		employeeId: 'member',
		startedAt,
		stoppedAt,
		isBillable: true,
		timesheet: { id: 'sheet', status: ETimesheetStatus.PENDING } as ITimeLog['timesheet'],
		...overrides
	};
}

const LOGS = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => logOf(id));

function groupOf(logs: ITimeLog[]): TimesheetEntryGroup {
	return {
		key: '2026-11-10|fix-login',
		logs,
		firstStart: null,
		lastEnd: null,
		isRunning: false,
		totalSeconds: logs.length * 3600
	};
}

const GROUP = groupOf(LOGS);

const MANAGER: TimesheetPermissions = {
	hasOrganizationRole: true,
	isManage: true,
	canApprove: true,
	userId: 'manager-user',
	employeeId: 'manager'
};

function renderChange(permissions: TimesheetPermissions = MANAGER) {
	const actions = {
		permissions,
		changeStatus: jest.fn().mockResolvedValue(true),
		openReject: jest.fn(),
		openDelete: jest.fn()
	};
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const wrapper = ({ children }: PropsWithChildren) => (
		<QueryClientProvider client={client}>{children}</QueryClientProvider>
	);
	const hook = renderHook(() => useTimesheetGroupChange(actions), { wrapper });
	return { actions, hook };
}

/** Another entry of the member, recorded over the same hour. */
const overlappedLog = {
	id: 'other',
	startedAt: '2026-11-10T09:30:00.000Z',
	stoppedAt: '2026-11-10T10:30:00.000Z',
	isRunning: false
};

async function confirmBillable(hook: ReturnType<typeof renderChange>['hook'], group: TimesheetEntryGroup) {
	act(() => hook.result.current.handlers.setBillable(group, false));
	await act(async () => {
		await hook.result.current.confirm();
	});
}

const writtenIds = () => mockUpdateTimeLog.mock.calls.map(([payload]) => (payload as { timeLogId: string }).timeLogId);

describe('useTimesheetGroupChange', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockStoredLogs = LOGS.map((log) => ({ ...log }));
		mockGetTimeLogs.mockImplementation(async () => mockStoredLogs);
		mockGetTimeLogConflicts.mockResolvedValue([]);
		mockUpdateTimeLog.mockResolvedValue({});
	});

	it('asks before marking every entry of a group not billable, then writes all of them', async () => {
		const { hook } = renderChange();

		act(() => hook.result.current.handlers.setBillable(GROUP, false));
		expect(hook.result.current.isOpen).toBe(true);
		expect(hook.result.current.change).toEqual({ kind: 'billable', group: GROUP, isBillable: false });
		expect(mockUpdateTimeLog).not.toHaveBeenCalled();

		await act(async () => {
			await hook.result.current.confirm();
		});

		expect(writtenIds()).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
		expect(mockUpdateTimeLog).toHaveBeenCalledWith(expect.objectContaining({ timeLogId: 'a', isBillable: false }));
		expect(mockToast.success).toHaveBeenCalledWith('dashboard.timesheets.SIMILAR.CHANGED(count=6)');
		expect(hook.result.current.isOpen).toBe(false);
	});

	it('does nothing when the group already has the billable state asked', () => {
		const { hook } = renderChange();

		act(() => hook.result.current.handlers.setBillable(GROUP, true));

		expect(hook.result.current.isOpen).toBe(false);
	});

	it('says how many entries changed when some writes fail', async () => {
		mockUpdateTimeLog.mockImplementation(async (payload: { timeLogId: string }) => {
			if (payload.timeLogId === 'b' || payload.timeLogId === 'e') {
				throw new Error('refused');
			}
			return {};
		});
		const { hook } = renderChange();

		await confirmBillable(hook, GROUP);

		expect(mockToast.warning).toHaveBeenCalledWith(
			'dashboard.timesheets.SIMILAR.PARTLY_CHANGED(changed=4,count=6)'
		);
	});

	it('says no entry changed when every write fails', async () => {
		mockUpdateTimeLog.mockRejectedValue(new Error('refused'));
		const { hook } = renderChange();

		await confirmBillable(hook, GROUP);

		expect(mockToast.error).toHaveBeenCalledWith('dashboard.timesheets.SIMILAR.PARTLY_CHANGED(changed=0,count=6)');
	});

	it('writes no entry whose interval now overlaps another entry: the API would remove that one', async () => {
		mockGetTimeLogConflicts.mockResolvedValue([overlappedLog]);
		const { hook } = renderChange();

		await confirmBillable(hook, GROUP);

		expect(mockUpdateTimeLog).not.toHaveBeenCalled();
		expect(mockToast.error).toHaveBeenCalledWith('dashboard.timesheets.SIMILAR.PARTLY_CHANGED(changed=0,count=6)');
	});

	it('leaves out a running and an approved entry of the group, and writes the others', async () => {
		const running = logOf('running', { isRunning: true });
		const approved = logOf('approved', {
			timesheet: { id: 'sheet', status: ETimesheetStatus.APPROVED } as ITimeLog['timesheet']
		});
		const group = groupOf([logOf('a'), running, approved, logOf('b')]);
		mockStoredLogs = group.logs.map((log) => ({ ...log }));
		const { hook } = renderChange();

		await confirmBillable(hook, group);

		expect(writtenIds()).toEqual(['a', 'b']);
		expect(mockToast.warning).toHaveBeenCalledWith(
			'dashboard.timesheets.SIMILAR.PARTLY_CHANGED(changed=2,count=4)'
		);
	});

	it("leaves out another member's entries for a reader who may change only their own", async () => {
		const own = logOf('own', { employeeId: 'me' });
		const group = groupOf([own, logOf('theirs', { employeeId: 'someone-else' })]);
		mockStoredLogs = group.logs.map((log) => ({ ...log }));
		const { hook } = renderChange({ ...MANAGER, hasOrganizationRole: false, userId: 'me-user', employeeId: 'me' });

		await confirmBillable(hook, group);

		expect(writtenIds()).toEqual(['own']);
	});

	it('says whether a billable change of the group would save any entry', () => {
		const { hook } = renderChange();
		const running = logOf('running', { isRunning: true, isBillable: false });
		const approved = logOf('approved', {
			timesheet: { id: 'sheet', status: ETimesheetStatus.APPROVED } as ITimeLog['timesheet']
		});

		expect(hook.result.current.handlers.hasBillableChange(GROUP)).toBe(true);
		expect(hook.result.current.handlers.hasBillableChange(groupOf([running, approved]))).toBe(false);
	});

	it('asks before changing the status of a group, then changes it for every entry', async () => {
		const { actions, hook } = renderChange();

		act(() => hook.result.current.handlers.changeStatus(GROUP, ETimesheetStatus.APPROVED));
		expect(hook.result.current.change).toEqual({ kind: 'status', group: GROUP, status: ETimesheetStatus.APPROVED });

		await act(async () => {
			await hook.result.current.confirm();
		});

		expect(actions.changeStatus).toHaveBeenCalledWith(LOGS, ETimesheetStatus.APPROVED, true);
		expect(hook.result.current.isOpen).toBe(false);
	});

	it('keeps the confirmation open when the status change fails, so it can be tried again', async () => {
		const { actions, hook } = renderChange();
		actions.changeStatus.mockResolvedValue(false);

		act(() => hook.result.current.handlers.changeStatus(GROUP, ETimesheetStatus.APPROVED));
		await act(async () => {
			await hook.result.current.confirm();
		});

		expect(hook.result.current.isOpen).toBe(true);
		expect(hook.result.current.isSaving).toBe(false);
	});

	it('opens the reject dialog, which asks for the reason, for every entry of the group', () => {
		const { actions, hook } = renderChange();

		act(() => hook.result.current.handlers.changeStatus(GROUP, ETimesheetStatus.DENIED));

		expect(actions.openReject).toHaveBeenCalledWith(LOGS, 'group');
		expect(hook.result.current.isOpen).toBe(false);
	});

	it('does nothing when the group already has the status asked', () => {
		const { actions, hook } = renderChange();

		act(() => hook.result.current.handlers.changeStatus(GROUP, ETimesheetStatus.PENDING));

		expect(hook.result.current.isOpen).toBe(false);
		expect(actions.changeStatus).not.toHaveBeenCalled();
	});

	it('opens the delete confirmation for every entry of the group', () => {
		const { actions, hook } = renderChange();

		act(() => hook.result.current.handlers.remove(GROUP));

		expect(actions.openDelete).toHaveBeenCalledWith(LOGS, 'group');
	});

	it('cannot be dismissed while its entries are written', async () => {
		let finishWrites: () => void = () => undefined;
		const writesHeld = new Promise<void>((resolve) => {
			finishWrites = resolve;
		});
		mockUpdateTimeLog.mockImplementation(async () => {
			await writesHeld;
			return {};
		});
		const { hook } = renderChange();

		act(() => hook.result.current.handlers.setBillable(GROUP, false));
		let saving: Promise<void> = Promise.resolve();
		act(() => {
			saving = hook.result.current.confirm();
		});
		act(() => hook.result.current.close());

		expect(hook.result.current.isOpen).toBe(true);
		await act(async () => {
			finishWrites();
			await saving;
		});
		expect(hook.result.current.isOpen).toBe(false);
	});

	it('writes nothing when the confirmation is closed', () => {
		const { hook } = renderChange();

		act(() => hook.result.current.handlers.setBillable(GROUP, false));
		act(() => hook.result.current.close());

		expect(hook.result.current.isOpen).toBe(false);
		expect(mockUpdateTimeLog).not.toHaveBeenCalled();
	});
});
