/** @jest-environment jsdom */

import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ETimeLogType } from '@/core/types/generics/enums/timer';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';

let mockSupportsEntryLabels = true;
const mockGetTimeLogs = jest.fn<Promise<unknown[]>, [unknown]>(async () => []);
const mockAddManualTime = jest.fn<Promise<unknown>, [unknown]>(async () => ({}));
const mockUpdateTimeLog = jest.fn<Promise<unknown>, [unknown]>(async () => ({}));
const mockSplitTimeLog = jest.fn<Promise<unknown>, [unknown]>(async () => ({ first: {}, second: {} }));

jest.mock('@/core/hooks/timer/use-entry-labels-support', () => ({
	useEntryLabelsSupport: () => mockSupportsEntryLabels
}));
jest.mock('@/core/services/client/api/timesheets/time-log.service', () => ({
	timeLogService: {
		updateTimeLog: (payload: never) => mockUpdateTimeLog(payload),
		addManualTime: (request: never) => mockAddManualTime(request),
		getTimeLogConflicts: async () => [],
		getTimeLogs: (query: never) => mockGetTimeLogs(query),
		splitTimeLog: (payload: never) => mockSplitTimeLog(payload)
	}
}));

import { ApiErrorService } from '@/core/services/client/api-error.service';
import { useCalendarEntrySplit } from './use-calendar-entry-split';

function at(hour: number) {
	return new Date(2026, 10, 9, hour);
}

const LOG = {
	id: 'log-1',
	employeeId: 'employee-1',
	logType: ETimeLogType.MANUAL,
	isRunning: false,
	startedAt: at(9),
	stoppedAt: at(13),
	projectId: 'project-1',
	taskId: 'task-1',
	tags: [{ id: 'label-1', name: 'Design', color: null }]
} as unknown as ITimeLog;

function renderSplit() {
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const wrapper = ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
	return renderHook(() => useCalendarEntrySplit(), { wrapper });
}

describe("the Calendar dialog's split and the labels of entries (#5368)", () => {
	beforeEach(() => {
		mockSupportsEntryLabels = true;
		mockGetTimeLogs.mockReset().mockResolvedValue([LOG]);
		mockAddManualTime.mockClear();
		mockUpdateTimeLog.mockClear();
		mockSplitTimeLog.mockReset().mockResolvedValue({ first: {}, second: {} });
	});

	it('files the second part under the entry labels when the API has no split route but has labels', async () => {
		mockSplitTimeLog.mockRejectedValueOnce(
			new ApiErrorService('Cannot POST /api/timesheet/time-log/log-1/split', 404)
		);
		const { result } = renderSplit();

		await act(async () => {
			await result.current.save({
				log: LOG,
				splitAt: at(11),
				secondTask: null,
				tenantId: 'tenant-1',
				viaApi: true
			});
		});

		expect(mockAddManualTime).toHaveBeenCalledWith(expect.objectContaining({ tags: ['label-1'] }));
	});

	it('files the second part of the two writes under the entry labels too', async () => {
		const { result } = renderSplit();

		await act(async () => {
			await result.current.save({ log: LOG, splitAt: at(11), secondTask: null, tenantId: 'tenant-1' });
		});

		expect(mockAddManualTime).toHaveBeenCalledWith(expect.objectContaining({ tags: ['label-1'] }));
	});

	it('neither asks for nor sends labels where the API has none', async () => {
		mockSupportsEntryLabels = false;
		mockGetTimeLogs.mockResolvedValue([{ ...LOG, tags: undefined }]);
		const { result } = renderSplit();

		await act(async () => {
			await result.current.save({ log: LOG, splitAt: at(11), secondTask: null, tenantId: 'tenant-1' });
		});

		expect(mockGetTimeLogs).toHaveBeenCalledWith(
			expect.not.objectContaining({ withEntryLabels: expect.anything() })
		);
		expect(mockAddManualTime).toHaveBeenCalledWith(expect.not.objectContaining({ tags: expect.anything() }));
	});
});
