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
import {
	activeTeamIdState,
	activeTeamTaskState,
	localTimerStatusState,
	organizationTeamsState,
	teamTasksCompleteState,
	teamTasksState,
	timerStatusState
} from '@/core/stores';
import { ETimeLogSource } from '@/core/types/generics/enums/timer';
import type { TTask } from '@/core/types/schemas/task/task.schema';
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

const task = (id: string) =>
	({
		id,
		title: id,
		status: 'in-progress',
		teams: [{ id: 'team-x' }],
		members: [{ userId: 'user-1' }]
	}) as never as TTask;

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

describe('the task another tab picks', () => {
	/** This tab works on task A of team X, by default with a timer running on it. */
	function renderTabWorkingOnTaskA({ timerRuns = true, activeTask = task('task-a') as TTask | null } = {}) {
		mockBrowserCookies.teamId = 'team-x';
		mockBrowserCookies.taskId = 'task-a';
		mockGetOrganizationTeams.mockResolvedValue(teamList([team('team-x')]) as never);
		const store = createStore();
		store.set(organizationTeamsState, [team('team-x')] as never);
		store.set(activeTeamIdState, 'team-x');
		store.set(teamTasksState, [task('task-a'), task('task-b')]);
		store.set(teamTasksCompleteState, true);
		store.set(activeTeamTaskState, activeTask);
		if (timerRuns) {
			store.set(timerStatusState, timerRunningOn('task-a'));
		}
		return renderTab(store);
	}

	it('keeps the task this tab runs a timer on when the next task list read arrives', async () => {
		const { store } = renderTabWorkingOnTaskA();

		// Another tab picks task B; this tab reads its task list again while its timer runs
		mockBrowserCookies.taskId = 'task-b';
		await act(async () => {
			store.set(teamTasksState, [task('task-a'), task('task-b')]);
		});

		expect(mockStopTimer).not.toHaveBeenCalled();
		expect(store.get(activeTeamTaskState)?.id).toBe('task-a');
	});

	it('keeps the task this tab is starting a timer on, before the server says the timer runs', async () => {
		const { store } = renderTabWorkingOnTaskA({ timerRuns: false });
		await act(async () => {
			// The start request is out: only this tab's local status says the timer runs
			store.set(localTimerStatusState, { lastTaskId: 'task-a', runnedDateTime: 1, running: true });
		});

		mockBrowserCookies.taskId = 'task-b';
		await act(async () => {
			store.set(teamTasksState, [task('task-a'), task('task-b')]);
		});

		expect(store.get(activeTeamTaskState)?.id).toBe('task-a');
	});

	it('still follows the task picked in another tab when no timer runs', async () => {
		const { store } = renderTabWorkingOnTaskA({ timerRuns: false });

		mockBrowserCookies.taskId = 'task-b';
		await act(async () => {
			store.set(teamTasksState, [task('task-a'), task('task-b')]);
		});

		expect(store.get(activeTeamTaskState)?.id).toBe('task-b');
	});

	it('still takes the task the cookie names when the tab has no active task yet, as after a reload', async () => {
		const { store } = renderTabWorkingOnTaskA({ activeTask: null });

		await act(async () => {
			store.set(teamTasksState, [task('task-a'), task('task-b')]);
		});

		expect(store.get(activeTeamTaskState)?.id).toBe('task-a');
		expect(mockStopTimer).not.toHaveBeenCalled();
	});
});
