/** @jest-environment jsdom */

import { act, renderHook } from '@testing-library/react';

const mockBulkUpdate = jest.fn();

jest.mock('@/core/services/client/api/task-views/task-views.service', () => ({
	taskViewsService: { bulkUpdate: (...args: unknown[]) => mockBulkUpdate(...args) }
}));
jest.mock('@/core/lib/utils/task-views-enabled', () => ({ isTaskViewsEnabled: () => true }));
jest.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: jest.fn() }) }));
jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: Record<string, unknown>) =>
		values ? `${key}:${JSON.stringify(values)}` : key
}));
jest.mock('sonner', () => ({
	toast: Object.assign(jest.fn(), { success: jest.fn(), warning: jest.fn(), error: jest.fn() })
}));

import { toast } from 'sonner';
import { useBulkTaskUpdate } from './use-bulk-task-update';

const mockToast = toast as unknown as jest.Mock;

describe('the bulk update sends the platform only what it takes', () => {
	beforeEach(() => {
		mockBulkUpdate.mockReset();
		mockToast.mockReset();
		(mockToast as unknown as { warning: jest.Mock }).warning.mockReset();
		(mockToast as unknown as { success: jest.Mock }).success.mockReset();
	});

	it('names a status the platform does not know by its id alone, and leaves such a name out of the undo', async () => {
		mockBulkUpdate.mockResolvedValueOnce({
			applied: 2,
			refused: 0,
			results: [
				{ taskId: 't1', ok: true, previous: { taskStatusId: 's0', status: 'Legacy name' } },
				// A task whose previous status had a name only (written by another client): nothing left to put back.
				{ taskId: 't2', ok: true, previous: { status: 'Legacy name' } }
			]
		});
		const { result } = renderHook(() => useBulkTaskUpdate());

		await act(async () => {
			await result.current.bulkUpdate(['t1', 't2'], { taskStatusId: 's-qa', status: 'QA' }, 'Status');
		});
		expect(mockBulkUpdate).toHaveBeenCalledWith({ taskIds: ['t1', 't2'], changes: { taskStatusId: 's-qa' } });

		// The undo the toast offers: the previous values, without the name the platform would refuse.
		mockBulkUpdate.mockResolvedValueOnce({ applied: 1, refused: 0, results: [{ taskId: 't1', ok: true }] });
		const options = mockToast.mock.calls[0][1] as { action: { onClick: () => void } };
		await act(async () => {
			options.action.onClick();
		});
		expect(mockBulkUpdate).toHaveBeenLastCalledWith({ items: [{ taskId: 't1', changes: { taskStatusId: 's0' } }] });
		// t2 was not sent: the undo says one task was put back and one was not, not that all were.
		expect((mockToast as unknown as { warning: jest.Mock }).warning).toHaveBeenCalledWith(
			'taskViews.UNDONE_PARTLY:{"applied":1,"refused":1}'
		);
		expect((mockToast as unknown as { success: jest.Mock }).success).not.toHaveBeenCalled();
	});

	it('sends no undo when no task’s previous values can be sent, and says none was put back', async () => {
		mockBulkUpdate.mockResolvedValueOnce({
			applied: 1,
			refused: 0,
			results: [{ taskId: 't1', ok: true, previous: { status: 'Legacy name' } }]
		});
		const { result } = renderHook(() => useBulkTaskUpdate());
		await act(async () => {
			await result.current.bulkUpdate(['t1'], { taskStatusId: 's-qa', status: 'QA' }, 'Status');
		});
		const options = mockToast.mock.calls[0][1] as { action: { onClick: () => void } };
		await act(async () => {
			options.action.onClick();
		});
		expect(mockBulkUpdate).toHaveBeenCalledTimes(1);
		expect((mockToast as unknown as { warning: jest.Mock }).warning).toHaveBeenCalledWith(
			'taskViews.UNDONE_PARTLY:{"applied":0,"refused":1}'
		);
	});

	it('sends one of the platform’s statuses by name, as before', async () => {
		mockBulkUpdate.mockResolvedValueOnce({
			applied: 1,
			refused: 0,
			results: [{ taskId: 't1', ok: true, previous: { status: 'open', taskStatusId: 's0' } }]
		});
		const { result } = renderHook(() => useBulkTaskUpdate());
		await act(async () => {
			await result.current.bulkUpdate(['t1'], { taskStatusId: 's-done', status: 'done' }, 'Status');
		});
		expect(mockBulkUpdate).toHaveBeenCalledWith({
			taskIds: ['t1'],
			changes: { taskStatusId: 's-done', status: 'done' }
		});
	});
});
