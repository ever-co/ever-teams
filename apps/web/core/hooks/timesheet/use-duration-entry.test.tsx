/** @jest-environment jsdom */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider, createStore } from 'jotai';
import { act, renderHook, waitFor } from '@testing-library/react';
import { type PropsWithChildren, useState } from 'react';

import type { ShownTimes } from '@/core/lib/utils/dashboards/manual-time-entry';
import type { TimeWindow } from '@/core/lib/utils/dashboards/timesheet-sheet-edit';
import { currentOrganizationState } from '@/core/stores/user/user-organizations';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import type { TOrganization } from '@/core/types/schemas/organization/organization.schema';

const mockUser = {
	id: 'user-a',
	tenantId: 'tenant-a',
	timeZone: 'Europe/Paris (UTC+01:00)',
	employee: { id: 'employee-a', organizationId: 'organization-a' }
};
const mockGetTimeLogs = jest.fn();

jest.mock('@/core/hooks/queries/user-user.query', () => ({
	useUserQuery: () => ({ data: mockUser })
}));
jest.mock('@/core/services/client/api/timesheets/time-log.service', () => ({
	timeLogService: { getTimeLogs: (params: unknown) => mockGetTimeLogs(params) }
}));

import { useDurationEntry } from './use-duration-entry';

const NO_TIMES: ShownTimes = { startMinutes: null, endMinutes: null };

function at(hours: number, minutes = 0, dayOfMonth = 10) {
	return new Date(2026, 10, dayOfMonth, hours, minutes);
}

function logOf(id: string, employeeId: string, startedAt: Date, stoppedAt: Date): ITimeLog {
	return { id, employeeId, startedAt, stoppedAt, duration: 0, version: '1' } as ITimeLog;
}

function minutesOf(date: Date) {
	return date.getHours() * 60 + date.getMinutes();
}

function timesOfInterval(interval: TimeWindow | null): ShownTimes {
	if (!interval) {
		return NO_TIMES;
	}
	return { startMinutes: minutesOf(interval.start), endMinutes: minutesOf(interval.end) };
}

interface FormStart {
	employeeId: string | null;
	times: ShownTimes;
}

/** A form as the dialogs hold it: a day, a member, a start and an end that the duration entry may replace. */
function useForm(start: FormStart) {
	const [day, setDay] = useState(at(0));
	const [employeeId, setEmployeeId] = useState(start.employeeId);
	const [times, setTimes] = useState(start.times);
	const entry = useDurationEntry({
		employeeId,
		day,
		startMinutes: times.startMinutes,
		endMinutes: times.endMinutes,
		onInterval: (interval) => setTimes(timesOfInterval(interval))
	});
	return { entry, times, setDay, setEmployeeId, setTimes };
}

function renderForm(start: Partial<FormStart> = {}) {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const store = createStore();
	// Time in the future is allowed, so the proposals do not depend on the day the test runs
	store.set(currentOrganizationState, { futureDateAllowed: true } as TOrganization);
	const wrapper = ({ children }: PropsWithChildren) => (
		<QueryClientProvider client={client}>
			<Provider store={store}>{children}</Provider>
		</QueryClientProvider>
	);
	const formStart: FormStart = { employeeId: 'employee-a', times: NO_TIMES, ...start };
	const view = renderHook(() => useForm(formStart), { wrapper });
	return { ...view, client };
}

type RenderedForm = ReturnType<typeof renderForm>['result'];

function typeDuration(result: RenderedForm, text: string) {
	act(() => result.current.entry.change(text));
	act(() => result.current.entry.commit());
}

async function waitForPhase(result: RenderedForm, kind: string) {
	await waitFor(() => expect(result.current.entry.phase.kind).toBe(kind));
}

describe('useDurationEntry', () => {
	beforeEach(() => {
		mockGetTimeLogs.mockReset();
		mockGetTimeLogs.mockResolvedValue([]);
	});

	it("proposes the first free stretch of the member's day, read around that day for that member", async () => {
		mockGetTimeLogs.mockResolvedValue([
			logOf('morning', 'employee-a', at(9), at(10, 30)),
			logOf('teammate', 'employee-b', at(10, 30), at(18))
		]);
		const { result, client } = renderForm();

		typeDuration(result, '1:30');
		await waitForPhase(result, 'proposed');

		expect(result.current.times).toEqual({ startMinutes: 630, endMinutes: 720 });
		expect(result.current.entry.text).toBe('1h 30m');
		const request = { startDate: '2026-11-09', endDate: '2026-11-11', timeZone: 'Europe/Paris' };
		expect(mockGetTimeLogs).toHaveBeenCalledWith({ ...request, employeeIds: ['employee-a'] });
		const [query] = client.getQueryCache().getAll();
		expect(query.queryKey).toEqual([
			'timesheet',
			'page-logs',
			{ ...request, tenantId: 'tenant-a', organizationId: 'organization-a', employeeIds: ['employee-a'] }
		]);
	});

	it('empties the start and the end while it reads, and leaves them empty when the day has no room', async () => {
		mockGetTimeLogs.mockResolvedValue([logOf('all-day', 'employee-a', at(0), at(23, 30))]);
		const { result } = renderForm({ times: { startMinutes: 840, endMinutes: 900 } });

		typeDuration(result, '90m');

		expect(result.current.times).toEqual(NO_TIMES);
		expect(result.current.entry.phase.kind).toBe('reading');

		await waitForPhase(result, 'noRoom');

		expect(result.current.times).toEqual(NO_TIMES);
		expect(result.current.entry.text).toBe('1h 30m');
	});

	it('reads nothing and keeps the times for text that is not a duration', () => {
		const handPicked = { startMinutes: 840, endMinutes: 900 };
		const { result } = renderForm({ times: handPicked });

		typeDuration(result, 'soon');

		expect(result.current.entry.phase.kind).toBe('invalid');
		expect(result.current.entry.text).toBe('soon');
		expect(result.current.times).toEqual(handPicked);
		expect(mockGetTimeLogs).not.toHaveBeenCalled();
	});

	it('shows the time from the start to the end, and asks for nothing when the field is left as it was', () => {
		const { result } = renderForm({ times: { startMinutes: 840, endMinutes: 900 } });

		expect(result.current.entry.text).toBe('1h 0m');

		act(() => result.current.entry.change('1h 0'));
		act(() => result.current.entry.change('1h 0m'));
		act(() => result.current.entry.commit());

		expect(result.current.entry.phase.kind).toBe('idle');
		expect(mockGetTimeLogs).not.toHaveBeenCalled();
	});

	it('proposes again for another day while the form still shows the proposal', async () => {
		const { result } = renderForm();
		typeDuration(result, '2');
		await waitForPhase(result, 'proposed');
		mockGetTimeLogs.mockResolvedValue([logOf('next-morning', 'employee-a', at(9, 0, 11), at(11, 0, 11))]);

		act(() => result.current.setDay(at(0, 0, 11)));
		await waitFor(() => expect(result.current.times).toEqual({ startMinutes: 660, endMinutes: 780 }));

		expect(mockGetTimeLogs).toHaveBeenLastCalledWith(
			expect.objectContaining({ startDate: '2026-11-10', endDate: '2026-11-12' })
		);
	});

	it('leaves the times to the member once they change them by hand', async () => {
		const { result } = renderForm();
		typeDuration(result, '2');
		await waitForPhase(result, 'proposed');

		act(() => result.current.setTimes({ startMinutes: 540, endMinutes: 600 }));

		expect(result.current.entry.phase.kind).toBe('idle');
		expect(result.current.entry.text).toBe('1h 0m');

		act(() => result.current.setDay(at(0, 0, 11)));

		expect(mockGetTimeLogs).toHaveBeenCalledTimes(1);
		expect(result.current.times).toEqual({ startMinutes: 540, endMinutes: 600 });
	});

	it('waits for a member before it reads a day', async () => {
		const handPicked = { startMinutes: 840, endMinutes: 900 };
		const { result } = renderForm({ employeeId: null, times: handPicked });

		typeDuration(result, '1:30');

		expect(result.current.entry.phase.kind).toBe('noMember');
		expect(result.current.times).toEqual(handPicked);
		expect(mockGetTimeLogs).not.toHaveBeenCalled();

		act(() => result.current.setEmployeeId('employee-a'));
		await waitForPhase(result, 'proposed');

		expect(result.current.times).toEqual({ startMinutes: 540, endMinutes: 630 });
	});

	it('says the day could not be read, and proposes on a new try', async () => {
		mockGetTimeLogs.mockRejectedValueOnce(new Error('Network Error'));
		const { result } = renderForm();

		typeDuration(result, '1:30');
		await waitForPhase(result, 'failed');

		expect(result.current.times).toEqual(NO_TIMES);

		act(() => result.current.entry.retry());
		await waitForPhase(result, 'proposed');

		expect(result.current.times).toEqual({ startMinutes: 540, endMinutes: 630 });
	});
});
