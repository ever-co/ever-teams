/** @jest-environment jsdom */
/**
 * A sign-out stops the running timer before the session goes. The other tabs of the browser still show that run
 * going on: the sign-out leaves them a mark naming the run it stopped, so they do not tell the person to sign in
 * again to stop it (#5721). A stop that failed leaves none: that run does go on.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createStore, Provider } from 'jotai';
import type { PropsWithChildren } from 'react';

// Direct mode, whatever NEXT_PUBLIC_GAUZY_API_SERVER_URL the env files loaded for Jest set
jest.mock('@/core/constants/config/constants', () => ({
	...jest.requireActual('@/core/constants/config/constants'),
	GAUZY_API_BASE_SERVER_URL: { value: 'https://api.example.test' }
}));

jest.mock('next/navigation', () => ({ useParams: () => ({}) }));
jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('sonner', () => ({ toast: { error: jest.fn() } }));
// What the app logs is sent to its own log route
jest.mock('@/core/services/logs/logger-client', () => ({ sendLogToAPI: jest.fn(async () => undefined) }));
// What the hook reads beside the session itself
jest.mock('@/core/hooks/inbox/use-inbox-web-push', () => ({ forgetThisBrowserPush: jest.fn(async () => undefined) }));
jest.mock('@/core/components/features/chat-panel/chat-history', () => ({ clearChatHistoryForUser: jest.fn() }));
jest.mock('@/core/hooks/organizations/teams/use-team-member', () => ({
	useIsMemberManager: () => ({ isTeamManager: false }),
	useIsListedTeamManager: () => false
}));
jest.mock('@/core/hooks/organizations/teams/use-active-team-member', () => ({
	useActiveTeamMemberUserId: () => undefined
}));

import { clearOwnSignOutMark, ownSignOutMark } from '@/core/lib/auth/own-sign-out-mark';
import { authService } from '@/core/services/client/api/auth/auth.service';
import { timerService } from '@/core/services/client/api/timers';
import { userService } from '@/core/services/client/api/users/user.service';
import { timerStatusState } from '@/core/stores';
import { ETimeLogSource } from '@/core/types/generics/enums/timer';
import { openFakeGauzyPage, type FakeGauzyPage } from '@/test/auth/fake-gauzy-page';
import { useAuthenticateUser } from './use-authenticate-user';

let page: FakeGauzyPage;

const RUNNING_TIMER = {
	running: true,
	lastLog: { id: 'log-1', isRunning: true, source: ETimeLogSource.TEAMS }
};

/** A signed-in page whose timer shows a run going on, and the sign-out the person asks for in it. */
async function openPageWithRunningTimer() {
	page.signIn();
	const store = createStore();
	store.set(timerStatusState, RUNNING_TIMER as never);
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const wrapper = ({ children }: PropsWithChildren) => (
		<QueryClientProvider client={queryClient}>
			<Provider store={store}>{children}</Provider>
		</QueryClientProvider>
	);
	const { result } = renderHook(() => useAuthenticateUser(), { wrapper });
	await waitFor(() => expect(result.current.user).toBeTruthy());
	return () =>
		act(async () => {
			await result.current.logOut();
		});
}

beforeEach(() => {
	page = openFakeGauzyPage([authService, userService]);
});

afterEach(() => {
	clearOwnSignOutMark();
	jest.restoreAllMocks();
	page.close();
});

describe('a sign-out while the timer runs', () => {
	it('tells the other tabs which run it stopped', async () => {
		const stopTimer = jest.spyOn(timerService, 'stopTimer').mockResolvedValue(undefined as never);
		const signOut = await openPageWithRunningTimer();

		await signOut();

		expect(stopTimer).toHaveBeenCalledTimes(1);
		expect(ownSignOutMark()?.stoppedTimeLogId).toBe('log-1');
		expect(page.leftAfterSignOut).toHaveBeenCalledTimes(1);
	});

	it('names the run the API stopped, when this tab showed another', async () => {
		const stoppedByTheApi = { data: { running: false, lastLog: { id: 'log-2' } } };
		jest.spyOn(timerService, 'stopTimer').mockResolvedValue(stoppedByTheApi as never);
		const signOut = await openPageWithRunningTimer();

		await signOut();

		expect(ownSignOutMark()?.stoppedTimeLogId).toBe('log-2');
	});

	it('does not name a run started in another tab right after the stop', async () => {
		const startedSince = { data: { running: true, lastLog: { id: 'log-3', isRunning: true } } };
		jest.spyOn(timerService, 'stopTimer').mockResolvedValue(startedSince as never);
		const signOut = await openPageWithRunningTimer();

		await signOut();

		expect(ownSignOutMark()?.stoppedTimeLogId).toBe('log-1');
	});

	it('still tells them when the stop answers after the sign-out stopped waiting for it', async () => {
		let answerStop: (answer: unknown) => void = () => undefined;
		const slowStop = new Promise((resolve) => {
			answerStop = resolve;
		});
		jest.spyOn(timerService, 'stopTimer').mockReturnValue(slowStop as never);
		const signOut = await openPageWithRunningTimer();

		// The sign-out waits three seconds for the stop, then goes on without it
		await signOut();
		expect(page.leftAfterSignOut).toHaveBeenCalledTimes(1);
		expect(ownSignOutMark()).toBeNull();

		await act(async () => {
			answerStop({ data: { running: false, lastLog: { id: 'log-1' } } });
		});

		expect(ownSignOutMark()?.stoppedTimeLogId).toBe('log-1');
	}, 10_000);

	it('leaves no mark when the stop failed: that run goes on', async () => {
		jest.spyOn(timerService, 'stopTimer').mockRejectedValue(new Error('offline'));
		const signOut = await openPageWithRunningTimer();

		await signOut();

		expect(ownSignOutMark()).toBeNull();
		expect(page.leftAfterSignOut).toHaveBeenCalledTimes(1);
	});
});
