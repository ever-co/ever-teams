/** @jest-environment jsdom */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import type { PropsWithChildren } from 'react';

import { timerStatusState } from '@/core/stores';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';

const mockGetTimeLogs = jest.fn();

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: Record<string, unknown>) =>
		values ? `${key}:${JSON.stringify(values)}` : key,
	useLocale: () => 'en'
}));
jest.mock('@/core/lib/helpers/error-message', () => ({ logErrorInDev: jest.fn() }));
jest.mock('@/core/hooks/queries/user-user.query', () => ({
	useUserQuery: () => ({
		data: { id: 'user-1', tenantId: 'tenant-1', employee: { id: 'employee-1', organizationId: 'organization-1' } }
	})
}));
jest.mock('@/core/services/client/api/timesheets/time-log.service', () => ({
	timeLogService: { getTimeLogs: (...args: unknown[]) => mockGetTimeLogs(...args) }
}));

import { useTimeEntryDuplicate } from './use-time-entry-duplicate';

const MINUTE = 60;

/** Thursday 12 November 2026, 15:37:20, in the zone the suite runs in. */
const NOW = new Date(2026, 10, 12, 15, 37, 20);

function today(hours: number, minutes = 0) {
	return new Date(2026, 10, 12, hours, minutes);
}

function yesterday(hours: number, minutes = 0) {
	return new Date(2026, 10, 11, hours, minutes);
}

function logOf(id: string, start: Date, end: Date, extra: Record<string, unknown> = {}): ITimeLog {
	return {
		id,
		employeeId: 'employee-2',
		startedAt: start,
		stoppedAt: end,
		duration: 0,
		...extra
	} as unknown as ITimeLog;
}

const SOURCE = logOf('source', yesterday(9), yesterday(10, 30), {
	taskId: 'task-1',
	projectId: 'project-1',
	isBillable: true,
	description: 'Review the invoices'
});

const BUSY_MORNING = logOf('busy', today(9), today(10));

type JotaiStore = ReturnType<typeof createStore>;

function renderDuplicate(stepMinutes = 1, store: JotaiStore = createStore()) {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const wrapper = ({ children }: PropsWithChildren) => (
		<QueryClientProvider client={client}>
			<Provider store={store}>{children}</Provider>
		</QueryClientProvider>
	);
	return renderHook(() => useTimeEntryDuplicate({ stepMinutes }), { wrapper });
}

/** The viewer's own timer, started a moment ago: the API does not list its entry yet. */
function storeWithRunningTimer(startedAt: Date): JotaiStore {
	const store = createStore();
	const lastLog = { id: 'running', employeeId: 'employee-1', startedAt, stoppedAt: startedAt, duration: 0 };
	store.set(timerStatusState, { running: true, lastLog } as never);
	return store;
}

beforeEach(() => {
	jest.useFakeTimers({ now: NOW, doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
	mockGetTimeLogs.mockResolvedValue([BUSY_MORNING]);
});

afterEach(() => {
	jest.useRealTimers();
	jest.clearAllMocks();
});

describe('useTimeEntryDuplicate', () => {
	it('opens the copy today, where the member the entry belongs to has no entry, and saves nothing', async () => {
		const { result } = renderDuplicate();

		await act(async () => {
			await result.current.open({ log: SOURCE });
		});

		expect(mockGetTimeLogs).toHaveBeenCalledTimes(1);
		expect(mockGetTimeLogs).toHaveBeenCalledWith(
			expect.objectContaining({ startDate: '2026-11-11', endDate: '2026-11-12', employeeIds: ['employee-2'] })
		);
		expect(result.current.isOpen).toBe(true);
		expect(result.current.draft).toMatchObject({
			taskId: 'task-1',
			projectId: 'project-1',
			employeeId: 'employee-2',
			isBillable: true,
			description: 'Review the invoices',
			start: today(14, 7),
			end: today(15, 37)
		});
	});

	it("copies the row's time when the row adds several entries up, on the steps of its dialog", async () => {
		const { result } = renderDuplicate(5);

		await act(async () => {
			await result.current.open({ log: SOURCE, seconds: 3 * 60 * MINUTE + 2 * MINUTE });
		});

		expect(result.current.draft).toMatchObject({ start: today(12, 35), end: today(15, 35) });
	});

	it("still opens the copy, at the entry's own time of day, when today cannot be read", async () => {
		mockGetTimeLogs.mockRejectedValue(new Error('offline'));
		const { result } = renderDuplicate();

		await act(async () => {
			await result.current.open({ log: SOURCE });
		});

		expect(result.current.isOpen).toBe(true);
		expect(result.current.draft).toMatchObject({ start: today(9), end: today(10, 30) });
	});

	it('opens only the copy asked last', async () => {
		let answerFirst: (logs: ITimeLog[]) => void = () => undefined;
		const firstRead = new Promise<ITimeLog[]>((resolve) => {
			answerFirst = resolve;
		});
		mockGetTimeLogs.mockReturnValueOnce(firstRead);
		const other = logOf('other', yesterday(11), yesterday(12), { taskId: 'task-2', employeeId: 'employee-3' });
		const { result } = renderDuplicate();

		await act(async () => {
			const first = result.current.open({ log: SOURCE });
			await result.current.open({ log: other });
			answerFirst([]);
			await first;
		});

		expect(result.current.draft).toMatchObject({ taskId: 'task-2', employeeId: 'employee-3' });
	});

	it("keeps a copy of the viewer's own entry clear of the timer they just started", async () => {
		mockGetTimeLogs.mockResolvedValue([]);
		const ownEntry = logOf('own', yesterday(16), yesterday(17), { employeeId: 'employee-1', taskId: 'task-1' });
		const { result } = renderDuplicate(1, storeWithRunningTimer(today(15, 30)));

		await act(async () => {
			await result.current.open({ log: ownEntry });
		});

		expect(result.current.draft).toMatchObject({ start: today(14, 30), end: today(15, 30) });
	});

	it("does not count the viewer's timer against a teammate's day", async () => {
		mockGetTimeLogs.mockResolvedValue([]);
		const { result } = renderDuplicate(1, storeWithRunningTimer(today(15, 30)));

		await act(async () => {
			await result.current.open({ log: logOf('theirs', yesterday(16), yesterday(17)) });
		});

		expect(result.current.draft).toMatchObject({ start: today(14, 37), end: today(15, 37) });
	});

	it('keeps the copy while its dialog closes', async () => {
		const { result } = renderDuplicate();
		await act(async () => {
			await result.current.open({ log: SOURCE });
		});

		act(() => result.current.close());

		expect(result.current.isOpen).toBe(false);
		expect(result.current.draft).not.toBeNull();
	});

	describe('the check before the save', () => {
		it('refuses a copy moved over an entry of the member, and names when that entry ran', async () => {
			const { result } = renderDuplicate();

			let refusal: string | null = null;
			await act(async () => {
				refusal = await result.current.checkBeforeSave({
					employeeId: 'employee-2',
					periods: [{ start: today(9, 30), end: today(11) }]
				});
			});

			expect(refusal).toMatch(/^timeEntryActions\.duplicate\.OVERLAPS:/);
			expect(refusal).toContain('range');
		});

		it('lets a copy on free time through, and reads the day again each time', async () => {
			const { result } = renderDuplicate();
			const check = { employeeId: 'employee-2', periods: [{ start: today(11), end: today(12) }] };

			let refusals: Array<string | null> = [];
			await act(async () => {
				const first = await result.current.checkBeforeSave(check);
				const second = await result.current.checkBeforeSave(check);
				refusals = [first, second];
			});

			expect(refusals).toEqual([null, null]);
			expect(mockGetTimeLogs).toHaveBeenCalledTimes(2);
		});

		it("refuses a copy moved over the viewer's own running timer", async () => {
			mockGetTimeLogs.mockResolvedValue([]);
			const { result } = renderDuplicate(1, storeWithRunningTimer(today(15, 30)));

			let refusal: string | null = null;
			await act(async () => {
				refusal = await result.current.checkBeforeSave({
					employeeId: 'employee-1',
					periods: [{ start: today(15), end: today(15, 35) }]
				});
			});

			expect(refusal).toMatch(/^timeEntryActions\.duplicate\.OVERLAPS:/);
			expect(refusal).toContain('dashboard.timesheets.RUNNING');
		});

		it('refuses the save when the day cannot be read', async () => {
			mockGetTimeLogs.mockRejectedValue(new Error('offline'));
			const { result } = renderDuplicate();

			let refusal: string | null = null;
			await act(async () => {
				refusal = await result.current.checkBeforeSave({
					employeeId: 'employee-2',
					periods: [{ start: today(11), end: today(12) }]
				});
			});

			expect(refusal).toBe('timeEntryActions.duplicate.CHECK_FAILED');
		});

		it('refuses the save without the member it is for, and reads nothing', async () => {
			const { result } = renderDuplicate();

			let refusal: string | null = null;
			await act(async () => {
				refusal = await result.current.checkBeforeSave({
					employeeId: '',
					periods: [{ start: today(11), end: today(12) }]
				});
			});

			expect(refusal).toBe('timeEntryActions.duplicate.CHECK_FAILED');
			expect(mockGetTimeLogs).not.toHaveBeenCalled();
		});
	});
});
