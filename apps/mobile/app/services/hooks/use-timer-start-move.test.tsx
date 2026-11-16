/**
 * Marie started her timer at 9:25 though she began at 9:00: she moves its start from the phone.
 *
 * The hook, the stores of the session and of the timer, the requests and the HTTP client are the app's own here:
 * only `fetch` is a stand-in for Gauzy, which moves a running start by the rules of ever-co/ever-gauzy#11941.
 */
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { TimerStore, TimerStoreModel } from '../../models/timer/timer-store';
import { createFakeGauzy, FakeGauzy, ORGANIZATION_ID } from '../../../test/fake-gauzy-session';
import { ITimerStartMoveFailure, useTimerStartMove } from './use-timer-start-move';

let mockStores: Record<string, unknown> = {};

jest.mock('../../models', () => ({ useStores: () => mockStores }));
jest.mock('react-native-flash-message', () => ({ showMessage: jest.fn() }));

const originalFetch = global.fetch;
const NOW = '2026-11-16T09:30:00.000Z';
const STARTED_AT = '2026-11-16T09:25:00.000Z';

let gauzy: FakeGauzy;
let timerStore: TimerStore;

/** Marie's phone, signed in, with the timer she started at 9:25 (or `startedAt`) running from `source`. */
async function openPanel({ source = 'MOBILE', startedAt = STARTED_AT } = {}) {
	const pair = gauzy.signIn();
	const runningLog = gauzy.runTimer({ source, startedAt });
	timerStore = TimerStoreModel.create({ timerStatus: { duration: 0, running: true, lastLog: runningLog as never } });
	mockStores = {
		authenticationStore: {
			authToken: pair.token,
			tenantId: 'tenant-1',
			organizationId: ORGANIZATION_ID,
			user: { id: 'user-1', roleId: 'role-1' }
		},
		TimerStore: timerStore
	};
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const wrapper = ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={client}>{children}</QueryClientProvider>
	);
	const { result } = await renderHook(() => useTimerStartMove({ enabled: true }), { wrapper });
	// The organization, the role's permissions and the route are read once the panel opens
	await waitFor(() =>
		expect(result.current.access.kind === 'view' && result.current.access.why === 'checking').toBe(false)
	);
	return result;
}

/** The refusal a move threw, or null when it went through. */
async function failureOf(move: () => Promise<void>): Promise<ITimerStartMoveFailure | null> {
	try {
		await act(move);
		return null;
	} catch (failure) {
		return failure as ITimerStartMoveFailure;
	}
}

beforeEach(() => {
	jest.setSystemTime(Date.parse(NOW));
	jest.spyOn(console, 'error').mockImplementation(() => undefined);
	gauzy = createFakeGauzy();
	global.fetch = gauzy.fetch as unknown as typeof fetch;
});

afterEach(() => {
	global.fetch = originalFetch;
	jest.restoreAllMocks();
});

describe('Moving the start of the running timer from the phone', () => {
	it('moves the start of the one running entry, and the clock follows it at once', async () => {
		const panel = await openPanel();

		expect(panel.current.access).toEqual({ kind: 'edit', earlierAllowed: true, reasonRequired: false });

		await act(() => panel.current.moveStart({ startedAt: new Date('2026-11-16T09:00:00.000Z') }));

		// One entry, from 9:00: the API's and the one the phone shows
		expect(gauzy.timer()?.id).toBe('log-running');
		expect(gauzy.timer()?.startedAt).toBe('2026-11-16T09:00:00.000Z');
		expect(timerStore.timerStatus.running).toBe(true);
		expect(timerStore.timerStatus.lastLog?.startedAt).toBe('2026-11-16T09:00:00.000Z');
	});

	it('refuses a start over another entry with the overlap reason, and the run keeps its start', async () => {
		gauzy.addEntry('2026-11-16T08:30:00.000Z', '2026-11-16T09:10:00.000Z');
		const panel = await openPanel();

		const failure = await failureOf(() =>
			panel.current.moveStart({ startedAt: new Date('2026-11-16T09:00:00.000Z') })
		);

		expect(failure).toEqual({ status: 409, code: 'TIMER_START_OVERLAP' });
		expect(gauzy.timer()?.startedAt).toBe(STARTED_AT);
		expect(timerStore.timerStatus.lastLog?.startedAt).toBe(STARTED_AT);
	});

	it('says the phone is offline when the move never reaches the API', async () => {
		const panel = await openPanel();
		global.fetch = jest.fn(() =>
			Promise.reject(new TypeError('Network request failed'))
		) as unknown as typeof fetch;

		const failure = await failureOf(() =>
			panel.current.moveStart({ startedAt: new Date('2026-11-16T09:00:00.000Z') })
		);

		expect(failure).toEqual({ status: null });
		expect(timerStore.timerStatus.lastLog?.startedAt).toBe(STARTED_AT);
	});

	it('offers only a later start where the organization does not allow time added by hand', async () => {
		gauzy.setOrganization({ allowManualTime: false });

		const panel = await openPanel();

		expect(panel.current.access).toEqual({ kind: 'edit', earlierAllowed: false, reasonRequired: false });
	});

	it('asks for a reason where the organization asks for one', async () => {
		gauzy.setOrganization({ requireReason: true });

		const panel = await openPanel();

		expect(panel.current.access).toEqual({ kind: 'edit', earlierAllowed: true, reasonRequired: true });
	});

	it('shows the start alone, saying why, to a member whose role may not change tracked time', async () => {
		gauzy.setPermissions(['TIME_TRACKER']);

		const panel = await openPanel();

		expect(panel.current.access).toEqual({ kind: 'view', why: 'not-allowed' });
	});

	it('shows the start alone for a run of the desktop app', async () => {
		const panel = await openPanel({ source: 'DESKTOP' });

		expect(panel.current.access).toEqual({ kind: 'view', why: 'tracker' });
	});

	it('leaves a newer timer state as it is when the status read after the move fails', async () => {
		const panel = await openPanel();
		const gauzyFetch = global.fetch;
		global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
			const isStatusRead = typeof input === 'string' && input.includes('/timesheet/timer/status');
			if (isStatusRead) {
				// The timer was stopped on another device and the screen shows it, then the phone lost its connection
				timerStore.setTimerStatus({ duration: 0, running: false });
				throw new TypeError('Network request failed');
			}
			return gauzyFetch(input, init);
		}) as typeof fetch;

		await act(() => panel.current.moveStart({ startedAt: new Date('2026-11-16T09:00:00.000Z') }));

		expect(timerStore.timerStatus.running).toBe(false);
	});

	it('shows the start alone against an API without the route, and the timer works as today', async () => {
		gauzy.withoutStartMove();

		const panel = await openPanel();

		expect(panel.current.access).toEqual({ kind: 'view', why: 'unsupported' });
		expect(timerStore.timerStatus.running).toBe(true);
	});
});
