/** @jest-environment jsdom */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import type { BulkEditResult } from '@/core/lib/utils/dashboards/timesheet-bulk-edit';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import type { TimesheetPermissions } from './use-timesheets-page';

const mockGetTimeLogConflicts = jest.fn();
const mockUpdateTimeLog = jest.fn();
const mockToastSuccess = jest.fn();
const mockToastWarning = jest.fn();
const mockToastError = jest.fn();
const mockAtomValues: Record<string, unknown> = {};
const mockProjects = [
	{ id: 'project-site', name: 'Site' },
	{ id: 'project-mobile', name: 'Mobile' }
];

jest.mock('jotai', () => ({ useAtomValue: (atom: string) => mockAtomValues[atom] }));
jest.mock('@/core/stores/teams/organization-team', () => ({ activeTeamState: 'activeTeamState' }));
jest.mock('@/core/stores/teams/team-tasks', () => ({ tasksByTeamState: 'tasksByTeamState' }));
jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: Record<string, unknown>) => {
		if (!values) {
			return key;
		}
		return `${key} ${JSON.stringify(values)}`;
	}
}));
jest.mock('sonner', () => ({
	toast: {
		success: (message: string) => mockToastSuccess(message),
		warning: (message: string) => mockToastWarning(message),
		error: (message: string) => mockToastError(message)
	}
}));
jest.mock('@/core/hooks/organizations/projects/use-organization-projects-query', () => ({
	useOrganizationProjectsQuery: () => ({
		organizationProjects: mockProjects,
		getOrganizationProjectsLoading: false,
		isOrganizationProjectsError: false,
		refetchOrganizationProjects: jest.fn()
	})
}));
jest.mock('@/core/services/client/api/timesheets/time-log.service', () => ({
	timeLogService: {
		getTimeLogConflicts: (params: unknown) => mockGetTimeLogConflicts(params),
		updateTimeLog: (payload: unknown) => mockUpdateTimeLog(payload)
	}
}));
jest.mock('@/core/lib/helpers/cookies', () => ({
	getOrganizationIdCookie: () => 'organization-a',
	getTenantIdCookie: () => 'tenant-a'
}));
jest.mock('@/core/lib/helpers/error-message', () => ({ logErrorInDev: jest.fn() }));
// The page hook drags the whole page's data layer in; only its edit rule is needed here
jest.mock('./use-timesheets-page', () => ({
	canEditLog: (log: ITimeLog, permissions: TimesheetPermissions) => {
		if (permissions.hasOrganizationRole) {
			return true;
		}
		return log.employeeId === permissions.employeeId;
	}
}));

import { useTimesheetBulkEdit } from './use-timesheet-bulk-edit';

const startedAt = new Date('2026-11-10T09:00:00.000Z');
const stoppedAt = new Date('2026-11-10T10:00:00.000Z');

const taskOfMobile = { id: 'task-mobile', projectId: 'project-mobile' };
const taskOfSite = { id: 'task-site', projectId: 'project-site' };

const admin: TimesheetPermissions = {
	hasOrganizationRole: true,
	isManage: true,
	canApprove: true,
	userId: 'user-admin',
	employeeId: 'admin'
};

const teamManager: TimesheetPermissions = { ...admin, hasOrganizationRole: false, employeeId: 'member' };

function logOf(id: string, overrides: Partial<ITimeLog> = {}): ITimeLog {
	return {
		id,
		duration: 3600,
		version: '1',
		employeeId: 'member',
		organizationTeamId: 'team',
		taskId: 'task-site',
		projectId: 'project-site',
		isBillable: false,
		description: `Notes of ${id}`,
		startedAt,
		stoppedAt,
		...overrides
	};
}

function renderBulkEdit(logs: ITimeLog[], permissions: TimesheetPermissions = admin) {
	const onFinished = jest.fn<void, [BulkEditResult]>();
	const onClose = jest.fn();
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const wrapper = ({ children }: PropsWithChildren) => (
		<QueryClientProvider client={client}>{children}</QueryClientProvider>
	);
	const rendered = renderHook(() => useTimesheetBulkEdit({ logs, permissions, onFinished, onClose }), {
		wrapper
	});
	return { ...rendered, onFinished, onClose };
}

function sentPayloads() {
	return mockUpdateTimeLog.mock.calls.map(([payload]) => payload);
}

describe('useTimesheetBulkEdit', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockAtomValues.activeTeamState = { id: 'team' };
		mockAtomValues.tasksByTeamState = [taskOfSite, taskOfMobile];
		mockGetTimeLogConflicts.mockResolvedValue([]);
		mockUpdateTimeLog.mockResolvedValue({});
	});

	it('changes nothing while every field is on Keep as is', async () => {
		const { result } = renderBulkEdit([logOf('a'), logOf('b')]);

		expect(result.current.hasChoice).toBe(false);
		expect(result.current.canSubmit).toBe(false);

		await act(async () => {
			await result.current.submit();
		});

		expect(mockGetTimeLogConflicts).not.toHaveBeenCalled();
		expect(mockUpdateTimeLog).not.toHaveBeenCalled();
	});

	it('updates only Billable on the three ticked entries, then closes and releases them', async () => {
		const logs = [logOf('a'), logOf('b', { projectId: 'project-mobile', taskId: 'task-mobile' }), logOf('c')];
		const { result, onFinished, onClose } = renderBulkEdit(logs);

		act(() => result.current.fields.billable.pick(true));

		expect(result.current.saveCount).toBe(3);
		expect(result.current.leftOutLines).toEqual([]);

		await act(async () => {
			await result.current.submit();
		});

		expect(sentPayloads()).toEqual([
			{ timeLogId: 'a', startedAt, stoppedAt, employeeId: 'member', isBillable: true },
			{ timeLogId: 'b', startedAt, stoppedAt, employeeId: 'member', isBillable: true },
			{ timeLogId: 'c', startedAt, stoppedAt, employeeId: 'member', isBillable: true }
		]);
		expect(mockToastSuccess).toHaveBeenCalledWith('dashboard.timesheets.BULK_EDIT.UPDATED {"count":3}');
		expect(onFinished).toHaveBeenCalledWith(expect.objectContaining({ releasedLogIds: ['a', 'b', 'c'] }));
		expect(onClose).toHaveBeenCalledTimes(1);
		expect(result.current.result).toBeNull();
	});

	it("files the entries under a task of another project and that task's project", async () => {
		const { result } = renderBulkEdit([logOf('a'), logOf('b')]);

		act(() => result.current.fields.task.pick('task-mobile'));

		expect(result.current.fields.project.followsTask).toBe(true);
		expect(result.current.fields.project.followedProject).toEqual({ id: 'project-mobile', name: 'Mobile' });

		await act(async () => {
			await result.current.submit();
		});

		expect(sentPayloads()).toEqual([
			expect.objectContaining({ timeLogId: 'a', taskId: 'task-mobile', projectId: 'project-mobile' }),
			expect.objectContaining({ timeLogId: 'b', taskId: 'task-mobile', projectId: 'project-mobile' })
		]);
	});

	it('offers the tasks of a project picked by hand, and says so', () => {
		const { result } = renderBulkEdit([logOf('a')]);

		act(() => result.current.fields.project.pick('project-mobile'));

		expect(result.current.fields.task.choices).toEqual([taskOfMobile]);
		expect(result.current.fields.task.narrowingProjectName).toBe('Mobile');
	});

	it('counts an entry the viewer may not edit before the save, and sends nothing for it', async () => {
		const logs = [logOf('own'), logOf('foreign', { employeeId: 'someone-else' })];
		const { result, onFinished, onClose } = renderBulkEdit(logs, teamManager);

		act(() => result.current.fields.billable.pick(true));

		expect(result.current.saveCount).toBe(1);
		expect(result.current.leftOutLines).toEqual([{ reason: 'notAllowed', count: 1 }]);

		await act(async () => {
			await result.current.submit();
		});

		expect(mockGetTimeLogConflicts).toHaveBeenCalledTimes(1);
		expect(sentPayloads()).toEqual([expect.objectContaining({ timeLogId: 'own' })]);
		expect(mockToastWarning).toHaveBeenCalledWith(
			'dashboard.timesheets.BULK_EDIT.UPDATED_PARTLY {"updated":1,"notUpdated":1}'
		);
		expect(onFinished).toHaveBeenCalledWith(expect.objectContaining({ releasedLogIds: ['own'] }));
		expect(onClose).not.toHaveBeenCalled();
		expect(result.current.result?.reasons).toEqual([{ reason: 'notAllowed', count: 1 }]);
	});

	it('does not save an entry that overlaps other recorded time, and reports it', async () => {
		const overlapped = {
			id: 'other',
			startedAt: '2026-11-10T09:30:00.000Z',
			stoppedAt: '2026-11-10T10:30:00.000Z'
		};
		mockGetTimeLogConflicts.mockResolvedValueOnce([overlapped]);
		const { result, onFinished } = renderBulkEdit([logOf('a'), logOf('b')]);

		act(() => result.current.fields.billable.pick(true));
		await act(async () => {
			await result.current.submit();
		});

		expect(sentPayloads()).toEqual([expect.objectContaining({ timeLogId: 'b' })]);
		expect(result.current.result?.reasons).toEqual([{ reason: 'overlap', count: 1 }]);
		expect(onFinished).toHaveBeenCalledWith(expect.objectContaining({ releasedLogIds: ['b'] }));
	});

	it('goes on after a failed save and states both counts', async () => {
		mockUpdateTimeLog.mockRejectedValueOnce(new Error('Failed to update time-log', { cause: { status: 500 } }));
		const { result, onClose } = renderBulkEdit([logOf('a'), logOf('b'), logOf('c')]);

		act(() => result.current.fields.billable.pick(true));
		await act(async () => {
			await result.current.submit();
		});

		expect(mockUpdateTimeLog).toHaveBeenCalledTimes(3);
		expect(mockToastWarning).toHaveBeenCalledWith(
			'dashboard.timesheets.BULK_EDIT.UPDATED_PARTLY {"updated":2,"notUpdated":1}'
		);
		expect(result.current.result).toEqual({
			updatedCount: 2,
			notUpdatedCount: 1,
			reasons: [{ reason: 'failed', count: 1, detailKey: 'toasts.REASONS.SERVER' }],
			releasedLogIds: ['b', 'c']
		});
		expect(onClose).not.toHaveBeenCalled();
		expect(result.current.isRunning).toBe(false);
	});

	it('says that nothing was updated when every save fails', async () => {
		mockUpdateTimeLog.mockRejectedValue(new Error('Failed to update time-log', { cause: { status: 403 } }));
		const { result } = renderBulkEdit([logOf('a')]);

		act(() => result.current.fields.billable.pick(true));
		await act(async () => {
			await result.current.submit();
		});

		expect(mockToastError).toHaveBeenCalledWith(
			'dashboard.timesheets.BULK_EDIT.UPDATED_PARTLY {"updated":0,"notUpdated":1}'
		);
		expect(result.current.result?.reasons).toEqual([
			{ reason: 'failed', count: 1, detailKey: 'dashboard.timesheets.SHEET.EDIT.REFUSED' }
		]);
	});

	it('runs once when it is confirmed twice', async () => {
		const { result, onFinished } = renderBulkEdit([logOf('a')]);

		act(() => result.current.fields.billable.pick(true));
		await act(async () => {
			const first = result.current.submit();
			const second = result.current.submit();
			await Promise.all([first, second]);
		});

		expect(mockUpdateTimeLog).toHaveBeenCalledTimes(1);
		expect(onFinished).toHaveBeenCalledTimes(1);
	});
});
