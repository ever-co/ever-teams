/** @jest-environment jsdom */
/**
 * A timer runs in a tab that stays open, and the access token expires meanwhile (a day by default). The refresh token
 * is still good. The member presses Stop.
 *
 * The stop was answered 401 and failed with "The timer could not stop: Your session has ended. Sign in again to
 * continue.", the timer went on, and the tab was sent to the sign-in page: the refresh token was never tried. The
 * stop now goes through. The session is renewed behind it and the stop is sent again, without a word to the member.
 *
 * The session and timer hooks, the API services and their interceptors are the app's own here: only the transport
 * is a stand-in for Gauzy.
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

const mockToastError = jest.fn();

jest.mock('next/navigation', () => ({ usePathname: () => '/', useParams: () => ({}) }));
jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key, useLocale: () => 'en' }));
jest.mock('sonner', () => ({
	toast: { error: (...args: unknown[]) => mockToastError(...args), warning: jest.fn(), info: jest.fn() }
}));
// What the app logs is sent to its own log route
jest.mock('@/core/services/logs/logger-client', () => ({ sendLogToAPI: jest.fn(async () => undefined) }));
// What the timer and the session hooks read beside the session and the timer themselves
jest.mock('@/core/hooks/inbox/use-inbox-web-push', () => ({ forgetThisBrowserPush: jest.fn(async () => undefined) }));
jest.mock('@/core/components/features/chat-panel/chat-history', () => ({ clearChatHistoryForUser: jest.fn() }));
jest.mock('@/core/hooks/organizations/teams/use-team-member', () => ({
	useIsMemberManager: () => ({ isTeamManager: false }),
	useIsListedTeamManager: () => false
}));
jest.mock('@/core/hooks/organizations/teams/use-active-team-member', () => ({
	useActiveTeamMemberUserId: () => undefined
}));
jest.mock('@/core/hooks/daily-plans/use-my-daily-plans', () => ({
	useMyDailyPlans: () => ({ myDailyPlans: { items: [] }, isSuccess: true })
}));
jest.mock('@/core/hooks/organizations/teams/use-organization-teams-employee', () => ({
	useOrganizationEmployeeTeams: () => ({ updateOrganizationTeamEmployeeActiveTask: jest.fn(async () => undefined) })
}));
jest.mock('@/core/hooks/organizations/teams/use-team-tasks-state', () => ({
	useTeamTasksState: () => ({ setActiveTask: jest.fn(), isUpdatingActiveTask: false })
}));
jest.mock('@/core/hooks/organizations/teams/use-update-task', () => ({
	useUpdateTask: () => ({ updateTask: jest.fn() })
}));
jest.mock('@/core/hooks/tasks/use-task-statuses-query', () => ({ useTaskStatusesQuery: () => ({ taskStatuses: [] }) }));
jest.mock('./use-timer-billable', () => ({ useResolveTimerBillable: () => jest.fn(async () => false) }));

import { getAccessTokenCookie, getRefreshTokenCookie } from '@/core/lib/helpers/cookies';
import { authService } from '@/core/services/client/api/auth/auth.service';
import { timerService } from '@/core/services/client/api/timers';
import { userService } from '@/core/services/client/api/users/user.service';
import { activeTeamIdState, organizationTeamsState, timerStatusState } from '@/core/stores';
import { openFakeGauzyPage, type FakeGauzyPage } from '@/test/auth/fake-gauzy-page';
import { HOUR_MS } from '@/test/auth/fake-gauzy-session';
import { useTimerApi } from './use-timer-api';

let page: FakeGauzyPage;

/** A tab the member signed in to, whose timer runs: the page read the profile and shows the run. */
async function openTabWithRunningTimer() {
	const { gauzy } = page;
	page.signIn();
	const runningLog = gauzy.runTimer();

	const store = createStore();
	store.set(organizationTeamsState, [{ id: 'team-1', name: 'Team', members: [], projects: [] }] as never);
	store.set(activeTeamIdState, 'team-1');
	store.set(timerStatusState, { duration: 0, running: true, lastLog: runningLog } as never);
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const wrapper = ({ children }: PropsWithChildren) => (
		<QueryClientProvider client={queryClient}>
			<Provider store={store}>{children}</Provider>
		</QueryClientProvider>
	);
	const { result, unmount } = renderHook(() => useTimerApi({ updateLocalTimerStatus: jest.fn(), firstLoad: false }), {
		wrapper
	});
	// The profile read every signed-in page starts with
	await waitFor(() => expect(gauzy.count('GET', '/user/me')).toBe(1));
	await act(async () => undefined);

	const pressStop = async () => {
		await act(async () => {
			await Promise.resolve(result.current.stopTimer()).catch(() => undefined);
		});
	};
	return { pressStop, store, unmount };
}

beforeEach(() => {
	mockToastError.mockReset();
	page = openFakeGauzyPage([timerService, authService, userService]);
});

afterEach(() => page.close());

describe('Stop pressed after the access token expired, while the refresh token is still good', () => {
	it('stops the timer without an error and keeps the member signed in', async () => {
		const { gauzy } = page;
		const tab = await openTabWithRunningTimer();
		// The tab stayed open past the access token's lifetime
		page.wait(25 * HOUR_MS);

		await tab.pressStop();
		// The heartbeat the stop sends first settles too: refused, then sent again
		await waitFor(() => expect(gauzy.count('POST', '/timesheet/time-slot')).toBe(2), { timeout: 4000 });

		expect(mockToastError).not.toHaveBeenCalled();
		expect(gauzy.timeLog()?.isRunning).toBe(false);
		expect(tab.store.get(timerStatusState)?.running).toBe(false);
		expect(page.renewals()).toBe(1);
		expect(page.isSignedOut()).toBe(false);
		expect(gauzy.acceptsAccessToken(getAccessTokenCookie())).toBe(true);
		expect(gauzy.acceptsRefreshToken(getRefreshTokenCookie())).toBe(true);
		tab.unmount();
	});
});
