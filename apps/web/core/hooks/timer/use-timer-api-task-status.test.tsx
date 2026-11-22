/** @jest-environment jsdom */
/**
 * #5683: a task moves to In Progress when its timer starts. A start that fails (a lost connection, a refusal, a server
 * error) starts no work, so the task keeps the status it had.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createStore, Provider } from 'jotai';
import type { PropsWithChildren } from 'react';

import { activeTeamIdState, organizationTeamsState, timerStatusState } from '@/core/stores';
import { ETimeLogSource } from '@/core/types/generics/enums/timer';
import type { TTask } from '@/core/types/schemas/task/task.schema';
import { useTimerApi } from './use-timer-api';

const TEAM = 'team-1';

interface StartAnswer {
	data: {
		running: boolean;
		lastLog: { id: string; source: ETimeLogSource; organizationTeamId: string; description: string | null };
	};
}

const mockStartTimer = jest.fn<Promise<StartAnswer>, [{ description?: string }]>();

const mockUser = {
	id: 'user-1',
	tenantId: 'tenant-1',
	isEmailVerified: true,
	employee: {
		id: 'employee-1',
		userId: 'user-1',
		organizationId: 'org-1',
		tenantId: 'tenant-1',
		isTrackingTime: false
	}
};
const mockRefreshUserData = jest.fn(async () => mockUser);
const mockTranslate = (key: string) => key;
const mockPlans = { myDailyPlans: { items: [] }, isSuccess: true };
const IN_PROGRESS_STATUS = { id: 'status-in-progress', name: 'in-progress', value: 'in-progress' };
const mockTaskStatuses = { taskStatuses: [IN_PROGRESS_STATUS] };
const mockTasksState = { setActiveTask: jest.fn(), isUpdatingActiveTask: false };
const mockEmployeeTeams = { updateOrganizationTeamEmployeeActiveTask: jest.fn(async () => undefined) };
const mockUpdateTask = { updateTask: jest.fn() };
const mockResolveBillable = jest.fn(async () => false);

jest.mock('next/navigation', () => ({ usePathname: () => '/' }));
jest.mock('next-intl', () => ({ useTranslations: () => mockTranslate, useLocale: () => 'en' }));
jest.mock('sonner', () => ({ toast: { info: jest.fn(), warning: jest.fn(), error: jest.fn() } }));
jest.mock('@/core/services/client/api/timers', () => ({
	timerService: {
		getTimerStatus: async () => ({ data: { running: false, lastLog: null } }),
		getLastTimerLog: async () => ({ data: [] }),
		syncTimer: async () => ({ data: null }),
		stopTimer: jest.fn(),
		startTimer: (body: { description?: string }) => mockStartTimer(body)
	}
}));
jest.mock('@/core/hooks/auth/use-authenticate-user', () => ({
	useAuthenticateUser: () => ({ user: mockUser, $user: { current: mockUser }, refreshUserData: mockRefreshUserData })
}));
jest.mock('@/core/hooks/daily-plans/use-my-daily-plans', () => ({ useMyDailyPlans: () => mockPlans }));
jest.mock('@/core/hooks/organizations/teams/use-organization-teams-employee', () => ({
	useOrganizationEmployeeTeams: () => mockEmployeeTeams
}));
jest.mock('@/core/hooks/organizations/teams/use-team-tasks-state', () => ({ useTeamTasksState: () => mockTasksState }));
jest.mock('@/core/hooks/organizations/teams/use-update-task', () => ({ useUpdateTask: () => mockUpdateTask }));
jest.mock('@/core/hooks/tasks/use-task-statuses-query', () => ({ useTaskStatusesQuery: () => mockTaskStatuses }));
jest.mock('./use-timer-billable', () => ({ useResolveTimerBillable: () => mockResolveBillable }));

const DONE_TASK = {
	id: 'task-1',
	title: 'Task',
	status: 'done',
	taskStatusId: 'status-done',
	organizationId: 'org-1',
	projectId: null
} as never as TTask;

const STARTED: StartAnswer = {
	data: {
		running: true,
		lastLog: { id: 'log-1', source: ETimeLogSource.TEAMS, organizationTeamId: TEAM, description: null }
	}
};

/** Start is pressed on a task that reads Done, and the start's answer is awaited. */
async function pressStartOnDoneTask() {
	const store = createStore();
	store.set(organizationTeamsState, [{ id: TEAM, name: TEAM, members: [], projects: [] }] as never);
	store.set(activeTeamIdState, TEAM);
	store.set(timerStatusState, { running: false, lastLog: null } as never);
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const wrapper = ({ children }: PropsWithChildren) => (
		<QueryClientProvider client={queryClient}>
			<Provider store={store}>{children}</Provider>
		</QueryClientProvider>
	);
	const { result } = renderHook(() => useTimerApi({ updateLocalTimerStatus: jest.fn(), firstLoad: false }), {
		wrapper
	});

	await act(async () => {
		const start = Promise.resolve(result.current.startTimer(DONE_TASK));
		await start.catch(() => undefined);
	});
	await waitFor(() => expect(mockStartTimer).toHaveBeenCalledTimes(1));
}

describe("the task's status when its timer is started (#5683)", () => {
	beforeEach(() => {
		mockStartTimer.mockReset();
		mockUpdateTask.updateTask.mockClear();
	});

	it.each([
		['the connection is lost', new Error('Network Error')],
		['the API refuses the start', Object.assign(new Error('Unprocessable Entity'), { statusCode: 422 })],
		['the server fails', Object.assign(new Error('Internal Server Error'), { statusCode: 500 })]
	])('keeps the status the task had when %s', async (_case, failure) => {
		mockStartTimer.mockRejectedValue(failure);

		await pressStartOnDoneTask();

		expect(mockUpdateTask.updateTask).not.toHaveBeenCalled();
	});

	it('moves the task to In Progress once the timer runs', async () => {
		mockStartTimer.mockResolvedValue(STARTED);

		await pressStartOnDoneTask();

		expect(mockUpdateTask.updateTask).toHaveBeenCalledTimes(1);
		expect(mockUpdateTask.updateTask).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'task-1', status: 'in-progress', taskStatusId: IN_PROGRESS_STATUS.id })
		);
	});
});
