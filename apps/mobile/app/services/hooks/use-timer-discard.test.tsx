/**
 * Paul tapped Start by mistake on the bus: he discards the run from the phone, and nothing of it is kept.
 *
 * The hook, the stores of the session and of the timer, the requests and the HTTP client are the app's own here:
 * only `fetch` is a stand-in for Gauzy, which discards a run by the rules of ever-co/ever-gauzy#11935.
 */
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { showMessage } from 'react-native-flash-message';
import { AuthenticationStoreModel } from '../../models/authentication-store';
import { TimerStore, TimerStoreModel } from '../../models/timer/timer-store';
import { createFakeGauzy, FakeGauzy, ORGANIZATION_ID } from '../../../test/fake-gauzy-session';
import { useTimerDiscard } from './use-timer-discard';

let mockStores: Record<string, unknown> = {};

jest.mock('../../models', () => ({ useStores: () => mockStores }));
jest.mock('react-native-flash-message', () => ({ showMessage: jest.fn() }));

const originalFetch = global.fetch;
const STARTED_AT = '2026-11-16T08:00:00.000Z';
const TWO_MINUTES_LATER = Date.parse('2026-11-16T08:02:00.000Z');

let gauzy: FakeGauzy;
let timerStore: TimerStore;
let client: QueryClient;

/** Paul's phone, signed in, two minutes after he tapped Start (or started the run from `source`). */
async function openTimer({ source = 'MOBILE' } = {}) {
	const pair = gauzy.signIn();
	const session = AuthenticationStoreModel.create({
		user: null,
		tenantId: 'tenant-1',
		organizationId: ORGANIZATION_ID
	});
	session.setAuthToken(pair.token);
	const runningLog = gauzy.runTimer({ source, startedAt: STARTED_AT });
	// His day so far: 3 hours, before the run
	timerStore = TimerStoreModel.create({
		timerStatus: { duration: 3 * 3600, running: true, lastLog: runningLog as never }
	});
	mockStores = { authenticationStore: session, TimerStore: timerStore };
	client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const queryClient = client;
	const wrapper = ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
	const { result } = await renderHook(() => useTimerDiscard(), { wrapper });
	return result;
}

/** Whether the running timer offers Discard, once the organization is read. */
async function offersDiscard(timer: Awaited<ReturnType<typeof openTimer>>) {
	const organizationKey = ['organization', 'tenant-1', ORGANIZATION_ID];
	await waitFor(() => expect(client.getQueryState(organizationKey)?.status).toBe('success'));
	// The query tells its readers on a timer of its own, which the test's fake clock holds
	await act(async () => {
		jest.advanceTimersByTime(10);
	});
	return timer.current.availability.available;
}

beforeEach(() => {
	jest.setSystemTime(TWO_MINUTES_LATER);
	(showMessage as jest.Mock).mockClear();
	jest.spyOn(console, 'error').mockImplementation(() => undefined);
	gauzy = createFakeGauzy();
	// The 3 hours of the day before the run
	gauzy.addEntry('2026-11-16T04:00:00.000Z', '2026-11-16T07:00:00.000Z');
	global.fetch = gauzy.fetch as unknown as typeof fetch;
});

afterEach(() => {
	global.fetch = originalFetch;
	jest.restoreAllMocks();
});

describe('Discarding the running timer from the phone', () => {
	it('stops the timer and keeps nothing of the run, so the day total is what it was before it', async () => {
		const timer = await openTimer();
		expect(await offersDiscard(timer)).toBe(true);

		let discarded = false;
		await act(async () => {
			discarded = await timer.current.discard();
		});

		expect(discarded).toBe(true);
		// No entry is left of the run, and the role's permission to delete time was never asked
		expect(gauzy.timer()).toBeNull();
		expect(gauzy.sentTo('POST', '/timesheet/timer/discard')).toHaveLength(1);
		expect(timerStore.timerStatus.running).toBe(false);
		expect(timerStore.timerStatus.duration).toBe(3 * 3600);
		expect(showMessage).toHaveBeenCalledWith(
			expect.objectContaining({ message: expect.stringContaining('timer.discard.discarded'), type: 'success' })
		);
	});

	it('names the run the person saw, so a run started meanwhile elsewhere is not removed', async () => {
		const timer = await openTimer();
		await offersDiscard(timer);

		await act(async () => {
			await timer.current.discard();
		});

		const [request] = gauzy.sentTo('POST', '/timesheet/timer/discard');
		expect(request.status).toBe(204);
	});

	it('offers no Discard when the organization turns discarding off', async () => {
		gauzy.setOrganization({ allowDiscardTimer: false });

		const timer = await openTimer();

		expect(await offersDiscard(timer)).toBe(false);
		expect(timer.current.availability).toEqual({ available: false, reason: 'DISABLED' });
	});

	it('offers no Discard once the run is older than the organization allows', async () => {
		gauzy.setOrganization({ discardTimerWithinMinutes: 1 });

		const timer = await openTimer();

		expect(await offersDiscard(timer)).toBe(false);
		expect(timer.current.availability).toEqual({ available: false, reason: 'TOO_LATE' });
	});

	it('offers no Discard against an API without it, and the timer works as today', async () => {
		gauzy.setOrganization({ allowModifyTime: true, allowManualTime: true }, { replace: true });

		const timer = await openTimer();

		expect(await offersDiscard(timer)).toBe(false);
		expect(timer.current.availability).toEqual({ available: false, reason: 'NOT_SUPPORTED' });
		expect(timerStore.timerStatus.running).toBe(true);
	});

	it('says why when the API refuses, and the timer goes on', async () => {
		const timer = await openTimer();
		await offersDiscard(timer);
		// The organization turned discarding off since the phone read it
		gauzy.setOrganization({ allowDiscardTimer: false });

		let discarded = true;
		await act(async () => {
			discarded = await timer.current.discard();
		});

		expect(discarded).toBe(false);
		expect(gauzy.timer()?.isRunning).toBe(true);
		expect(timerStore.timerStatus.running).toBe(true);
		expect(showMessage).toHaveBeenCalledWith(
			expect.objectContaining({
				message: expect.stringContaining('timer.discard.failures.disabled'),
				type: 'danger'
			})
		);
	});

	it('says the phone is offline when the discard never reaches the API, and the timer goes on', async () => {
		const timer = await openTimer();
		await offersDiscard(timer);
		global.fetch = jest.fn(() =>
			Promise.reject(new TypeError('Network request failed'))
		) as unknown as typeof fetch;

		await act(async () => {
			await timer.current.discard();
		});

		expect(gauzy.timer()?.isRunning).toBe(true);
		expect(timerStore.timerStatus.running).toBe(true);
		expect(showMessage).toHaveBeenCalledWith(
			expect.objectContaining({
				message: expect.stringContaining('timer.discard.failures.offline'),
				type: 'danger'
			})
		);
	});

	it('names where a run started on another device, since it stops there too', async () => {
		const timer = await openTimer({ source: 'TEAMS' });

		expect(timer.current.sourceKey).toBe('timer.discard.sources.web');
	});
});
