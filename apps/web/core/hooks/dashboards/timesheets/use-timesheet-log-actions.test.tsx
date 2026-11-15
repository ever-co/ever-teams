/** @jest-environment jsdom */
import { act, renderHook } from '@testing-library/react';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';

const mockUpdateTimeLog = jest.fn();

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock('@/core/hooks/timesheet/use-update-timesheet', () => ({
	useUpdateTimesheet: () => ({ updateTimesheetStatus: jest.fn(), loadingUpdateTimesheetStatus: false })
}));
jest.mock('@/core/hooks/timesheet/use-delete-timesheet', () => ({
	useDeleteTimesheet: () => ({ deleteTaskTimesheet: jest.fn(), loadingDeleteTimesheet: false })
}));
jest.mock('@/core/hooks/timesheet/use-update-time-log', () => ({
	useUpdateTimeLogMutation: () => ({ mutateAsync: mockUpdateTimeLog })
}));

import { useTimesheetLogActions } from './use-timesheet-log-actions';

function logOf(id: string): ITimeLog {
	return {
		id,
		duration: 3600,
		version: '1',
		employeeId: 'marie',
		isBillable: true,
		startedAt: new Date('2026-11-10T09:00:00.000Z'),
		stoppedAt: new Date('2026-11-10T10:00:00.000Z')
	};
}

describe('useTimesheetLogActions().setBillableOf', () => {
	beforeEach(() => {
		mockUpdateTimeLog.mockReset();
		jest.spyOn(console, 'error').mockImplementation(() => undefined);
	});

	it('writes the billable state of every entry, one after the other, and says how many changed', async () => {
		mockUpdateTimeLog.mockResolvedValue({});
		const { result } = renderHook(() => useTimesheetLogActions());

		let changedCount = 0;
		await act(async () => {
			changedCount = await result.current.setBillableOf([logOf('a'), logOf('b'), logOf('c')], false);
		});

		expect(changedCount).toBe(3);
		const writtenIds = mockUpdateTimeLog.mock.calls.map(([payload]) => payload.timeLogId);
		expect(writtenIds).toEqual(['a', 'b', 'c']);
		for (const [payload] of mockUpdateTimeLog.mock.calls) {
			expect(payload.isBillable).toBe(false);
		}
	});

	it('goes on after a failed write and counts only the entries that changed', async () => {
		mockUpdateTimeLog
			.mockResolvedValueOnce({})
			.mockRejectedValueOnce(new Error('refused'))
			.mockResolvedValueOnce({});
		const { result } = renderHook(() => useTimesheetLogActions());

		let changedCount = 0;
		await act(async () => {
			changedCount = await result.current.setBillableOf([logOf('a'), logOf('b'), logOf('c')], false);
		});

		expect(mockUpdateTimeLog).toHaveBeenCalledTimes(3);
		expect(changedCount).toBe(2);
	});
});
