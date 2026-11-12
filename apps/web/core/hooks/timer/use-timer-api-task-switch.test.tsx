/** @jest-environment jsdom */
/**
 * #5119: the timer stopped "because your active task changed" when the app emptied the active task by itself (a task
 * outside the loaded list, a save rolled back): the task-switch effect counted no task as a switch, and as it never
 * recorded the empty value, any later run of the effect stopped the timer again. Only a switch from one task to
 * another stops the timer.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createStore, Provider } from 'jotai';
import type { PropsWithChildren } from 'react';

import { activeTeamIdState, activeTeamTaskState, organizationTeamsState, timerStatusState } from '@/core/stores';
import { ETimeLogSource } from '@/core/types/generics/enums/timer';
import type { ITimerStatus } from '@/core/types/interfaces/timer/timer-status';
import type { TTask } from '@/core/types/schemas/task/task.schema';
import { useTimerApi } from './use-timer-api';

const TEAM_ID = 'team-1';

const mockUser = {
	id: 'user-1',
	tenantId: 'tenant-1',
	isEmailVerified: true,
	employee: { id: 'employee-1', userId: 'user-1', organizationId: 'org-1', tenantId: 'tenant-1' }
};
const mockStopTimer = jest.fn(async () => ({ data: { running: false } }));
const mockToastInfo = jest.fn();
const mockTranslate = (key: string) => key;
const mockPlans = { myDailyPlans: { items: [] }, isSuccess: true };
const mockTaskStatuses = { taskStatuses: [] };
const mockTasksState = { setActiveTask: jest.fn(), isUpdatingActiveTask: false };
const mockEmployeeTeams = { updateOrganizationTeamEmployeeActiveTask: jest.fn(async () => undefined) };
const mockUpdateTask = { updateTask: jest.fn() };
const mockResolveBillable = jest.fn(async () => false);
const mockUpdateLocalTimerStatus = jest.fn();

jest.mock('next/navigation', () => ({ usePathname: () => '/' }));
jest.mock('next-intl', () => ({ useTranslations: () => mockTranslate, useLocale: () => 'en' }));
jest.mock('sonner', () => ({
	toast: { info: (...args: unknown[]) => mockToastInfo(...args), warning: jest.fn(), error: jest.fn() }
}));
jest.mock('@/core/services/client/api/timers', () => ({
	timerService: {
		getTimerStatus: async () => ({ data: { running: false } }),
		syncTimer: async () => ({ data: null }),
		stopTimer: () => mockStopTimer()
	}
}));
jest.mock('@/core/hooks/auth/use-authenticate-user', () => ({
	useAuthenticateUser: () => ({ user: mockUser, $user: { current: mockUser }, refreshUserData: jest.fn() })
}));
jest.mock('@/core/hooks/daily-plans/use-my-daily-plans', () => ({ useMyDailyPlans: () => mockPlans }));
jest.mock('@/core/hooks/organizations/teams/use-organization-teams-employee', () => ({
	useOrganizationEmployeeTeams: () => mockEmployeeTeams
}));
jest.mock('@/core/hooks/organizations/teams/use-team-tasks-state', () => ({ useTeamTasksState: () => mockTasksState }));
jest.mock('@/core/hooks/organizations/teams/use-update-task', () => ({ useUpdateTask: () => mockUpdateTask }));
jest.mock('@/core/hooks/tasks/use-task-statuses-query', () => ({ useTaskStatusesQuery: () => mockTaskStatuses }));
jest.mock('./use-timer-billable', () => ({ useResolveTimerBillable: () => mockResolveBillable }));

const task = (id: string) => ({ id, title: id, status: 'in-progress', teams: [{ id: TEAM_ID }] }) as never as TTask;

const statusOn = (taskId: string, running: boolean) =>
	({ running, lastLog: { id: `log-${taskId}`, taskId, source: ETimeLogSource.TEAMS } }) as never as ITimerStatus;

// The module remembers when it last stopped, to debounce the automatic stops: each test starts an hour later
let clock = Date.parse('2026-11-12T10:00:00.000Z');

/** The shell's timer owner, the instance whose first load ran: the team and task change effects act there. */
function renderTimerOwner(activeTask: TTask | null, status: ITimerStatus) {
	const store = createStore();
	store.set(organizationTeamsState, [{ id: TEAM_ID, name: 'Team', members: [], projects: [] }] as never);
	store.set(activeTeamIdState, TEAM_ID);
	store.set(activeTeamTaskState, activeTask);
	store.set(timerStatusState, status);
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const wrapper = ({ children }: PropsWithChildren) => (
		<QueryClientProvider client={queryClient}>
			<Provider store={store}>{children}</Provider>
		</QueryClientProvider>
	);
	renderHook(() => useTimerApi({ updateLocalTimerStatus: mockUpdateLocalTimerStatus, firstLoad: true }), {
		wrapper
	});
	return store;
}

async function settle(update: () => void) {
	await act(async () => {
		update();
		await Promise.resolve();
	});
}

describe('useTimerApi when the active task changes while a timer runs', () => {
	beforeEach(() => {
		clock += 60 * 60_000;
		jest.spyOn(Date, 'now').mockImplementation(() => clock);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('does not stop a TEAMS timer when the app empties the active task', async () => {
		const store = renderTimerOwner(task('task-a'), statusOn('task-a', true));

		await settle(() => store.set(activeTeamTaskState, null));

		expect(mockStopTimer).not.toHaveBeenCalled();
		expect(mockToastInfo).not.toHaveBeenCalled();
	});

	it('does not stop a run on a later run of the effect after the active task was emptied', async () => {
		const store = renderTimerOwner(task('task-a'), statusOn('task-a', false));
		await settle(() => store.set(activeTeamTaskState, null));

		// A TEAMS run started in another tab arrives with the next status read: a new status, so a new stopTimer
		await settle(() => store.set(timerStatusState, statusOn('task-c', true)));

		expect(mockStopTimer).not.toHaveBeenCalled();
		expect(mockToastInfo).not.toHaveBeenCalled();
	});

	it('still stops a TEAMS timer when the person switches to another task, and says why', async () => {
		const store = renderTimerOwner(task('task-a'), statusOn('task-a', true));

		await settle(() => store.set(activeTeamTaskState, task('task-b')));

		expect(mockStopTimer).toHaveBeenCalledTimes(1);
		await waitFor(() =>
			expect(mockToastInfo).toHaveBeenCalledWith('toasts.timer.STOPPED_TASK_SWITCH', {
				id: 'timer-automatic-stop'
			})
		);
	});

	it('still stops it when another task is picked after the active task was emptied', async () => {
		const store = renderTimerOwner(task('task-a'), statusOn('task-a', true));
		await settle(() => store.set(activeTeamTaskState, null));
		expect(mockStopTimer).not.toHaveBeenCalled();

		// The run is still on task A: task B is a switch
		await settle(() => store.set(activeTeamTaskState, task('task-b')));

		expect(mockStopTimer).toHaveBeenCalledTimes(1);
	});
});
