/** @jest-environment jsdom */
/**
 * The network drops while a timer runs, for longer than the access token lives, and the timer is stopped from another
 * device meanwhile. When the connection is back, the tab shows what the server says without any action of the member:
 * the status is read again, that read is refused (the token expired during the outage), the session is renewed, and
 * the read is sent again.
 *
 * The first refused read used to sign the member out instead.
 *
 * The session and timer hooks, the API services and their interceptors are the app's own here: only the transport
 * is a stand-in for Gauzy.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createStore, Provider } from 'jotai';
import { useMemo, type PropsWithChildren } from 'react';

// Direct mode, whatever NEXT_PUBLIC_GAUZY_API_SERVER_URL the env files loaded for Jest set
jest.mock('@/core/constants/config/constants', () => ({
	...jest.requireActual('@/core/constants/config/constants'),
	GAUZY_API_BASE_SERVER_URL: { value: 'https://api.example.test' }
}));
jest.mock('next/navigation', () => ({ usePathname: () => '/', useParams: () => ({}) }));
jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key, useLocale: () => 'en' }));
jest.mock('sonner', () => ({ toast: { error: jest.fn(), warning: jest.fn(), info: jest.fn() } }));
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

import { useReactiveAccessTokenCookie } from '@/core/hooks/auth/use-reactive-access-token-cookie';
import { authService } from '@/core/services/client/api/auth/auth.service';
import { timerService } from '@/core/services/client/api/timers';
import { userService } from '@/core/services/client/api/users/user.service';
import { activeTeamIdState, organizationTeamsState, timerStatusState } from '@/core/stores';
import { openFakeGauzyPage, type FakeGauzyPage } from '@/test/auth/fake-gauzy-page';
import { FAKE_USER, HOUR_MS } from '@/test/auth/fake-gauzy-session';
import { useTimerApi } from './use-timer-api';

const TEAM_ID = 'team-1';

let page: FakeGauzyPage;

/** The timer as the app shell owns it: its status is read for the scope and the token of the session. */
function useShellTimer() {
	const accessToken = useReactiveAccessTokenCookie();
	const scope = useMemo(
		() => ({
			tenantId: FAKE_USER.tenantId,
			organizationId: FAKE_USER.organizationId,
			teamId: TEAM_ID,
			userId: FAKE_USER.id,
			accessToken
		}),
		[accessToken]
	);
	return useTimerApi({
		updateLocalTimerStatus: () => undefined,
		firstLoad: true,
		statusEnabled: true,
		scope,
		manageRuntime: false
	});
}

/** A tab the member signed in to, which shows the timer they have running. */
async function openTabWithRunningTimer() {
	page.signIn();
	page.gauzy.runTimer();

	const store = createStore();
	store.set(organizationTeamsState, [{ id: TEAM_ID, name: 'Team', members: [], projects: [] }] as never);
	store.set(activeTeamIdState, TEAM_ID);
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const wrapper = ({ children }: PropsWithChildren) => (
		<QueryClientProvider client={queryClient}>
			<Provider store={store}>{children}</Provider>
		</QueryClientProvider>
	);
	const { unmount } = renderHook(() => useShellTimer(), { wrapper });
	await waitFor(() => expect(store.get(timerStatusState)?.running).toBe(true));
	return { store, unmount };
}

/** The browser loses, or finds again, its connection: the stand-in API with it. */
async function setConnection(isOnline: boolean) {
	if (isOnline) page.gauzy.goOnline();
	else page.gauzy.goOffline();
	await act(async () => {
		window.dispatchEvent(new Event(isOnline ? 'online' : 'offline'));
	});
}

beforeEach(() => {
	page = openFakeGauzyPage([timerService, authService, userService]);
});

afterEach(() => page.close());

describe('the connection comes back after an outage that outlasted the access token', () => {
	it('shows the timer as the server has it, with the session renewed and the member still signed in', async () => {
		const tab = await openTabWithRunningTimer();

		await setConnection(false);
		page.wait(25 * HOUR_MS);
		page.gauzy.stopTimerElsewhere();
		await setConnection(true);

		await waitFor(() => expect(tab.store.get(timerStatusState)?.running).toBe(false));
		expect(page.renewals()).toBe(1);
		expect(page.isSignedOut()).toBe(false);
		tab.unmount();
	});
});
