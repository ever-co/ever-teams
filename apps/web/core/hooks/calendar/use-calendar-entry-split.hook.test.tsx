/** @jest-environment jsdom */

import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { ETimeLogType } from '@/core/types/generics/enums/timer';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';

const mockSupportsEntryLabels = jest.fn<Promise<boolean>, []>();
const mockGetTimeLogs = jest.fn<Promise<unknown[]>, [unknown]>();
const mockAddManualTime = jest.fn<Promise<unknown>, [unknown]>(async () => ({}));
const mockUpdateTimeLog = jest.fn<Promise<unknown>, [unknown]>(async () => ({}));

jest.mock('@/core/lib/helpers/cookies', () => ({
	getTenantIdCookie: () => 'tenant-1',
	getOrganizationIdCookie: () => 'organization-1'
}));
jest.mock('@/core/services/client/api/timesheets/time-log.service', () => ({
	timeLogService: {
		supportsEntryLabels: () => mockSupportsEntryLabels(),
		updateTimeLog: (payload: never) => mockUpdateTimeLog(payload),
		addManualTime: (request: never) => mockAddManualTime(request),
		getTimeLogConflicts: async () => [],
		getTimeLogs: (query: never) => mockGetTimeLogs(query)
	}
}));

import { useCalendarEntrySplit } from './use-calendar-entry-split';

const SUPPORT_KEY = queryKeys.timeLogs.entryLabelsSupport('tenant-1', 'organization-1');

// An entry added by hand, filed under one label, as the server holds it
const LABELLED_ENTRY = {
	id: 'log-7',
	employeeId: 'employee-7',
	logType: ETimeLogType.MANUAL,
	startedAt: new Date(2026, 10, 9, 14),
	stoppedAt: new Date(2026, 10, 9, 16),
	tags: [{ id: 'label-1', name: 'Design', color: null }]
} as unknown as ITimeLog;

function renderSplit(knownSupport?: boolean) {
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	if (knownSupport !== undefined) {
		queryClient.setQueryData(SUPPORT_KEY, knownSupport);
	}
	const wrapper = ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
	return renderHook(() => useCalendarEntrySplit(), { wrapper });
}

async function splitAtThree(hook: ReturnType<typeof renderSplit>) {
	let isSaved = false;
	await act(async () => {
		isSaved = await hook.result.current.save({
			log: LABELLED_ENTRY,
			splitAt: new Date(2026, 10, 9, 15),
			secondTask: null,
			tenantId: 'tenant-1'
		});
	});
	return isSaved;
}

describe("the Calendar dialog's two-write split and the labels of entries (#5368)", () => {
	beforeEach(() => {
		mockSupportsEntryLabels.mockReset();
		mockGetTimeLogs.mockReset().mockResolvedValue([LABELLED_ENTRY]);
		mockAddManualTime.mockClear();
		mockUpdateTimeLog.mockClear();
	});

	it("files the second part under the entry labels on the session's answer, asking Gauzy nothing more", async () => {
		const hook = renderSplit(true);

		expect(await splitAtThree(hook)).toBe(true);
		expect(mockSupportsEntryLabels).not.toHaveBeenCalled();
		expect(mockAddManualTime).toHaveBeenCalledWith(expect.objectContaining({ tags: ['label-1'] }));
	});

	it('asks Gauzy at split time when the answer is not in yet, waits for it before any read or write, and keeps the labels', async () => {
		let answer: (value: boolean) => void = () => undefined;
		mockSupportsEntryLabels.mockReturnValue(
			new Promise<boolean>((resolve) => {
				answer = resolve;
			})
		);
		const hook = renderSplit();
		let saving: Promise<boolean> = Promise.resolve(false);

		await act(async () => {
			saving = hook.result.current.save({
				log: LABELLED_ENTRY,
				splitAt: new Date(2026, 10, 9, 15),
				secondTask: null,
				tenantId: 'tenant-1'
			});
		});

		expect(hook.result.current.isSaving).toBe(true);
		expect(mockSupportsEntryLabels).toHaveBeenCalledTimes(1);
		expect(mockGetTimeLogs).not.toHaveBeenCalled();
		expect(mockUpdateTimeLog).not.toHaveBeenCalled();
		expect(mockAddManualTime).not.toHaveBeenCalled();

		await act(async () => {
			answer(true);
			await saving;
		});

		expect(await saving).toBe(true);
		expect(mockAddManualTime).toHaveBeenCalledWith(expect.objectContaining({ tags: ['label-1'] }));
	});

	it('splits nothing when Gauzy cannot say whether it has labels, and offers another try', async () => {
		mockSupportsEntryLabels.mockRejectedValue(new Error('Failed to fetch'));
		const hook = renderSplit();

		expect(await splitAtThree(hook)).toBe(false);
		expect(hook.result.current.failure).toBe('restored');
		expect(mockUpdateTimeLog).not.toHaveBeenCalled();
		expect(mockAddManualTime).not.toHaveBeenCalled();
	});

	it('neither asks for nor sends labels where Gauzy has none', async () => {
		mockGetTimeLogs.mockResolvedValue([{ ...LABELLED_ENTRY, tags: undefined }]);
		const hook = renderSplit(false);

		expect(await splitAtThree(hook)).toBe(true);
		expect(mockGetTimeLogs).toHaveBeenCalledWith(
			expect.not.objectContaining({ withEntryLabels: expect.anything() })
		);
		expect(mockAddManualTime).toHaveBeenCalledWith(expect.not.objectContaining({ tags: expect.anything() }));
	});
});
