/** @jest-environment jsdom */
import { act, renderHook } from '@testing-library/react';
import type { TimesheetEntryGroup } from '@/core/lib/utils/dashboards/timesheet-entry-groups';
import { ETimesheetStatus } from '@/core/types/generics/enums/timesheet';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';

const mockToast = { success: jest.fn(), warning: jest.fn(), error: jest.fn() };

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

import { useTimesheetGroupChange } from './use-timesheet-group-change';

function logOf(id: string): ITimeLog {
	return {
		id,
		duration: 3600,
		version: '1',
		isBillable: true,
		timesheet: { id: 'sheet', status: ETimesheetStatus.PENDING } as ITimeLog['timesheet']
	};
}

const LOGS = ['a', 'b', 'c', 'd', 'e', 'f'].map(logOf);

const GROUP: TimesheetEntryGroup = {
	key: '2026-11-10|fix-login',
	logs: LOGS,
	firstStart: null,
	lastEnd: null,
	isRunning: false,
	totalSeconds: 6 * 3600
};

function renderChange(changedCount = LOGS.length) {
	const actions = {
		setBillableOf: jest.fn().mockResolvedValue(changedCount),
		changeStatus: jest.fn().mockResolvedValue(true),
		openReject: jest.fn(),
		openDelete: jest.fn()
	};
	const hook = renderHook(() => useTimesheetGroupChange(actions));
	return { actions, hook };
}

describe('useTimesheetGroupChange', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('asks before marking every entry of a group not billable, then writes all of them', async () => {
		const { actions, hook } = renderChange();

		act(() => hook.result.current.handlers.setBillable(GROUP, false));
		expect(hook.result.current.isOpen).toBe(true);
		expect(hook.result.current.change).toEqual({ kind: 'billable', group: GROUP, isBillable: false });
		expect(actions.setBillableOf).not.toHaveBeenCalled();

		await act(async () => {
			await hook.result.current.confirm();
		});

		expect(actions.setBillableOf).toHaveBeenCalledWith(LOGS, false);
		expect(mockToast.success).toHaveBeenCalledWith('dashboard.timesheets.SIMILAR.CHANGED(count=6)');
		expect(hook.result.current.isOpen).toBe(false);
	});

	it('does nothing when the group already has the billable state asked', () => {
		const { hook } = renderChange();

		act(() => hook.result.current.handlers.setBillable(GROUP, true));

		expect(hook.result.current.isOpen).toBe(false);
	});

	it('says how many entries changed when some writes fail', async () => {
		const { hook } = renderChange(4);

		act(() => hook.result.current.handlers.setBillable(GROUP, false));
		await act(async () => {
			await hook.result.current.confirm();
		});

		expect(mockToast.warning).toHaveBeenCalledWith(
			'dashboard.timesheets.SIMILAR.PARTLY_CHANGED(changed=4,count=6)'
		);
	});

	it('says no entry changed when every write fails', async () => {
		const { hook } = renderChange(0);

		act(() => hook.result.current.handlers.setBillable(GROUP, false));
		await act(async () => {
			await hook.result.current.confirm();
		});

		expect(mockToast.error).toHaveBeenCalledWith('dashboard.timesheets.SIMILAR.PARTLY_CHANGED(changed=0,count=6)');
	});

	it('asks before changing the status of a group, then changes it for every entry', async () => {
		const { actions, hook } = renderChange();

		act(() => hook.result.current.handlers.changeStatus(GROUP, ETimesheetStatus.APPROVED));
		expect(hook.result.current.change).toEqual({ kind: 'status', group: GROUP, status: ETimesheetStatus.APPROVED });

		await act(async () => {
			await hook.result.current.confirm();
		});

		expect(actions.changeStatus).toHaveBeenCalledWith(LOGS, ETimesheetStatus.APPROVED, true);
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
		const { actions, hook } = renderChange();
		let finishWrites: (count: number) => void = () => undefined;
		actions.setBillableOf.mockReturnValue(
			new Promise<number>((resolve) => {
				finishWrites = resolve;
			})
		);

		act(() => hook.result.current.handlers.setBillable(GROUP, false));
		let saving: Promise<void> = Promise.resolve();
		act(() => {
			saving = hook.result.current.confirm();
		});
		act(() => hook.result.current.close());

		expect(hook.result.current.isOpen).toBe(true);
		await act(async () => {
			finishWrites(LOGS.length);
			await saving;
		});
		expect(hook.result.current.isOpen).toBe(false);
	});

	it('writes nothing when the confirmation is closed', () => {
		const { actions, hook } = renderChange();

		act(() => hook.result.current.handlers.setBillable(GROUP, false));
		act(() => hook.result.current.close());

		expect(hook.result.current.isOpen).toBe(false);
		expect(actions.setBillableOf).not.toHaveBeenCalled();
	});
});
