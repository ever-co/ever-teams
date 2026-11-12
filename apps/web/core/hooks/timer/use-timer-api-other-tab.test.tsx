/** @jest-environment jsdom */
/**
 * #5120: the team and task cookies are shared by every tab of the browser. A tab running a timer took the team or the
 * task another tab switched to on its next list read, and that switch stopped its timer ("Timer stopped because…"),
 * although the tab blocks such changes while its timer runs.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createStore, Provider } from 'jotai';
import type { PropsWithChildren } from 'react';

import { queryKeys } from '@/core/query/keys';
import { activeTeamIdState, organizationTeamsState, timerStatusState } from '@/core/stores';
import { ETimeLogSource } from '@/core/types/generics/enums/timer';
import { useOrganizationTeamsQuery } from '../organizations/teams/use-organization-teams-query';
import { useTimerApi } from './use-timer-api';

/** The cookies every tab of the browser reads and writes. */
const mockBrowserCookies = { teamId: '', taskId: '' };

const mockUser = {
	id: 'user-1',
	tenantId: 'tenant-1',
	isEmailVerified: true,
	employee: { id: 'employee-1', userId: 'user-1', organizationId: 'org-1', tenantId: 'tenant-1' }
};
const mockStopTimer = jest.fn(async () => ({ data: { running: false } }));
const mockTranslate = (key: string) => key;
const mockPlans = { myDailyPlans: { items: [] }, isSuccess: true };
const mockTaskStatuses = { taskStatuses: [] };
const mockUpdateTask = { updateTask: jest.fn() };
const mockSettings = { updateAvatar: jest.fn() };
const mockResolveBillable = jest.fn(async () => false);
const mockUpdateLocalTimerStatus = jest.fn();

jest.mock('next/navigation', () => ({ usePathname: () => '/' }));
jest.mock('next-intl', () => ({ useTranslations: () => mockTranslate, useLocale: () => 'en' }));
jest.mock('sonner', () => ({ toast: { info: jest.fn(), warning: jest.fn(), error: jest.fn(), success: jest.fn() } }));
jest.mock('@/core/lib/helpers/cookies', () => ({
	...jest.requireActual('@/core/lib/helpers/cookies'),
	getAccessTokenCookie: () => 'token-1',
	getActiveTeamIdCookie: () => mockBrowserCookies.teamId,
	setActiveTeamIdCookie: (teamId: string) => {
		mockBrowserCookies.teamId = teamId;
	},
	setOrganizationIdCookie: jest.fn(),
	setActiveProjectIdCookie: jest.fn(),
	getActiveTaskIdCookie: () => mockBrowserCookies.taskId,
	getActiveUserTaskCookie: () => ({ taskId: mockBrowserCookies.taskId, userId: 'user-1' }),
	setActiveTaskIdCookie: (taskId: string) => {
		mockBrowserCookies.taskId = taskId;
	},
	setActiveUserTaskCookie: ({ taskId }: { taskId: string }) => {
		mockBrowserCookies.taskId = taskId;
	}
}));
jest.mock('@/core/services/client/api/timers', () => ({
	timerService: {
		getTimerStatus: async () => ({ data: { running: false } }),
		syncTimer: async () => ({ data: null }),
		stopTimer: () => mockStopTimer()
	}
}));
jest.mock('@/core/services/client/api/organizations/teams', () => ({
	organizationTeamService: {
		getOrganizationTeams: jest.fn(async () => ({ data: { items: [], total: 0 } })),
		getOrganizationTeam: jest.fn(async (id: string) => ({ data: { id, name: id, members: [], projects: [] } }))
	},
	organizationTeamEmployeeService: {}
}));
jest.mock('@/core/hooks/auth/use-authenticate-user', () => ({
	useAuthenticateUser: () => ({ user: mockUser, $user: { current: mockUser }, refreshUserData: jest.fn() })
}));
jest.mock('@/core/hooks/queries/user-user.query', () => ({ useUserQuery: () => ({ data: mockUser }) }));
jest.mock('@/core/hooks/daily-plans/use-my-daily-plans', () => ({ useMyDailyPlans: () => mockPlans }));
jest.mock('@/core/hooks/organizations/teams/use-update-task', () => ({ useUpdateTask: () => mockUpdateTask }));
jest.mock('@/core/hooks/organizations/teams/use-teams-state', () => ({
	useTeamsState: () => ({ setTeamsUpdate: jest.fn() }),
	useSetTeamsUpdate: () => jest.fn()
}));
jest.mock('@/core/hooks/users/use-settings', () => ({ useSettings: () => mockSettings }));
jest.mock('@/core/lib/auth/token-organization', () => ({ syncTokenOrganization: jest.fn(async () => false) }));
jest.mock('@/core/hooks/tasks/use-task-statuses-query', () => ({ useTaskStatusesQuery: () => mockTaskStatuses }));
jest.mock('./use-timer-billable', () => ({ useResolveTimerBillable: () => mockResolveBillable }));

const mockGetOrganizationTeams = jest.mocked(
	(
		jest.requireMock('@/core/services/client/api/organizations/teams') as {
			organizationTeamService: { getOrganizationTeams: jest.Mock };
		}
	).organizationTeamService.getOrganizationTeams
);

const SCOPE = { tenantId: 'tenant-1', organizationId: 'org-1', userId: 'user-1', accessToken: 'token-1' };
const LIST_KEY = queryKeys.organizationTeams.listByScope('tenant-1', 'org-1', 'user-1');

const team = (id: string, revision = 'r1') => ({
	id,
	name: id,
	organizationId: 'org-1',
	tenantId: 'tenant-1',
	updatedAt: revision,
	members: [{ id: `member-${id}`, employeeId: 'employee-1', employee: { id: 'employee-1', userId: 'user-1' } }],
	projects: []
});
const teamList = (teams: ReturnType<typeof team>[]) => ({ data: { items: teams, total: teams.length } });

const timerRunningOn = (taskId: string) =>
	({ running: true, lastLog: { id: `log-${taskId}`, taskId, source: ETimeLogSource.TEAMS } }) as never;

// The module remembers when it last stopped, to debounce the automatic stops: each test runs an hour after the previous
// one, and time still flows within it, as each list read needs its own update time
const realNow = Date.now;
let clockOffset = 0;

/** A tab of the app: its team owner and its timer owner, as the shell mounts them. */
function renderTab(store = createStore()) {
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const wrapper = ({ children }: PropsWithChildren) => (
		<QueryClientProvider client={queryClient}>
			<Provider store={store}>{children}</Provider>
		</QueryClientProvider>
	);
	const view = renderHook(
		() => {
			const teams = useOrganizationTeamsQuery({ scope: SCOPE });
			useTimerApi({ updateLocalTimerStatus: mockUpdateLocalTimerStatus, firstLoad: true });
			return teams;
		},
		{ wrapper }
	);
	return { store, queryClient, view };
}

beforeEach(() => {
	clockOffset += 60 * 60_000;
	jest.spyOn(Date, 'now').mockImplementation(() => realNow.call(Date) + clockOffset);
	mockBrowserCookies.teamId = '';
	mockBrowserCookies.taskId = '';
});

afterEach(() => {
	jest.restoreAllMocks();
});

describe('the team another tab switches to', () => {
	/** This tab opened on team X and runs a timer there. */
	async function renderTabRunningATimerOnTeamX() {
		mockBrowserCookies.teamId = 'team-x';
		mockGetOrganizationTeams.mockResolvedValue(teamList([team('team-x'), team('team-y')]) as never);
		const tab = renderTab();
		await waitFor(() => expect(tab.store.get(activeTeamIdState)).toBe('team-x'));
		await act(async () => {
			tab.store.set(timerStatusState, timerRunningOn('task-a'));
		});
		return tab;
	}

	it('keeps this tab on its team, and its timer running, when the next team list read arrives', async () => {
		const { store, queryClient } = await renderTabRunningATimerOnTeamX();

		// Another tab switches to team Y; this tab reads its team list again while its timer runs
		mockBrowserCookies.teamId = 'team-y';
		const nextList = teamList([team('team-x', 'r2'), team('team-y', 'r2')]);
		mockGetOrganizationTeams.mockResolvedValue(nextList as never);
		await act(async () => {
			queryClient.setQueryData(LIST_KEY, nextList);
		});
		await waitFor(() => expect(store.get(organizationTeamsState)[0]?.updatedAt).toBe('r2'));

		expect(mockStopTimer).not.toHaveBeenCalled();
		expect(store.get(activeTeamIdState)).toBe('team-x');
		// The shared cookie is left to the other tab
		expect(mockBrowserCookies.teamId).toBe('team-y');
	});

	it('keeps this tab on its team when it reloads the teams after a member change', async () => {
		const { store, view } = await renderTabRunningATimerOnTeamX();
		mockBrowserCookies.teamId = 'team-y';

		await act(async () => {
			await view.result.current.loadTeamsData();
		});

		expect(mockStopTimer).not.toHaveBeenCalled();
		expect(store.get(activeTeamIdState)).toBe('team-x');
	});

	it('still opens the team the cookie names at startup', async () => {
		mockBrowserCookies.teamId = 'team-y';
		mockGetOrganizationTeams.mockResolvedValue(teamList([team('team-x'), team('team-y')]) as never);

		const { store } = renderTab();

		await waitFor(() => expect(store.get(activeTeamIdState)).toBe('team-y'));
	});

	it("still follows the cookie once this tab's own team is gone from the list", async () => {
		const { store, queryClient } = await renderTabRunningATimerOnTeamX();

		// Team X was deleted, and another tab moved to team Y
		mockBrowserCookies.teamId = 'team-y';
		const nextList = teamList([team('team-y', 'r2')]);
		mockGetOrganizationTeams.mockResolvedValue(nextList as never);
		await act(async () => {
			queryClient.setQueryData(LIST_KEY, nextList);
		});

		await waitFor(() => expect(store.get(activeTeamIdState)).toBe('team-y'));
	});
});
