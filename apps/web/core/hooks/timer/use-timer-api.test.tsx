/** @jest-environment jsdom */
/**
 * #5121: when the employee's tracking flag said a timer runs while this tab's status said stopped, Start took the flag
 * for stuck and stopped whatever ran, before its own checks. That status can be out of date (up to a minute old, or
 * read while a start elsewhere was landing): a run just started on another device was stopped, and the start could
 * still be refused afterwards. The status is read again first; a run it finds refuses the start and keeps going.
 */
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createStore, Provider } from 'jotai';
import type { PropsWithChildren } from 'react';

import { queryKeys } from '@/core/query/keys';
import { activeTeamIdState, organizationTeamsState, timerStatusState } from '@/core/stores';
import { ETimeLogSource } from '@/core/types/generics/enums/timer';
import type { TTask } from '@/core/types/schemas/task/task.schema';
import { ALREADY_TRACKING_TOAST_ID, useTimerApi } from './use-timer-api';

const NOW = Date.parse('2026-11-12T10:00:00.000Z');
/** The start of the day the timer status reads. */
const TODAY_START = Date.parse('2026-11-12T00:00:00.000Z');
const MINUTE = 60_000;

interface TimeLog {
	id: string;
	source: ETimeLogSource;
	isRunning: boolean;
	startedAt: string;
	stoppedAt: string;
}

/** Gauzy as the start's checks see it: the employee's last time log and tracking flag. */
const mockGauzy: { lastLog: TimeLog | null; isTrackingTime: boolean } = { lastLog: null, isTrackingTime: false };

const minutesAgo = (minutes: number) => new Date(NOW - minutes * MINUTE).toISOString();

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
const mockRefreshUserData = jest.fn(async () => ({
	...mockUser,
	employee: { ...mockUser.employee, isTrackingTime: mockGauzy.isTrackingTime }
}));
const mockStopTimer = jest.fn(async (body: { source: ETimeLogSource; stoppedAt?: string }) => {
	if (mockGauzy.lastLog?.isRunning) {
		mockGauzy.lastLog = {
			...mockGauzy.lastLog,
			isRunning: false,
			stoppedAt: body.stoppedAt ?? new Date(NOW).toISOString()
		};
	}
	mockGauzy.isTrackingTime = false;
	return { data: { running: false, lastLog: mockGauzy.lastLog } };
});
const mockStartTimer = jest.fn(async () => {
	mockGauzy.lastLog = {
		id: 'log-new',
		source: ETimeLogSource.TEAMS,
		isRunning: true,
		startedAt: minutesAgo(0),
		stoppedAt: minutesAgo(0)
	};
	mockGauzy.isTrackingTime = true;
	return { data: { running: true, lastLog: mockGauzy.lastLog } };
});
const mockToastWarning = jest.fn();
const mockTranslate = (key: string) => key;
const mockUpdateActiveTask = jest.fn(async () => undefined);
const mockUpdateTask = jest.fn();
const mockSetActiveTask = jest.fn();
const mockResolveBillable = jest.fn(async () => false);

// The shipped 10-minute threshold, whatever NEXT_PUBLIC_STALE_TIMER_THRESHOLD_MINUTES the env files loaded for Jest set
jest.mock('@/core/constants/config/constants', () => {
	const constants = jest.requireActual<typeof import('@/core/constants/config/constants')>(
		'@/core/constants/config/constants'
	);
	return { ...constants, STALE_TIMER_THRESHOLD: { value: constants.STALE_TIMER_THRESHOLD_MS } };
});
jest.mock('next/navigation', () => ({ usePathname: () => '/' }));
jest.mock('next-intl', () => ({ useTranslations: () => mockTranslate, useLocale: () => 'en' }));
jest.mock('sonner', () => ({
	toast: { warning: (...args: unknown[]) => mockToastWarning(...args), error: jest.fn(), info: jest.fn() }
}));
jest.mock('@/core/services/client/api/timers', () => ({
	timerService: {
		// The day's status of a Gauzy before its past-midnight fix (ever-gauzy 531c63ac6): only the logs started today
		getTimerStatus: async () => {
			const lastLog =
				mockGauzy.lastLog && Date.parse(mockGauzy.lastLog.startedAt) >= TODAY_START ? mockGauzy.lastLog : null;
			return { data: { running: !!lastLog?.isRunning, lastLog } };
		},
		// The employee's last log, whatever its day
		getLastTimerLog: async () => ({
			data: [{ lastLog: mockGauzy.lastLog }],
			headers: { date: new Date(NOW).toUTCString() }
		}),
		stopTimer: (body: { source: ETimeLogSource; stoppedAt?: string }) => mockStopTimer(body),
		startTimer: () => mockStartTimer()
	}
}));
jest.mock('@/core/hooks/auth/use-authenticate-user', () => ({
	useAuthenticateUser: () => ({ user: mockUser, $user: { current: mockUser }, refreshUserData: mockRefreshUserData })
}));
jest.mock('@/core/hooks/daily-plans/use-my-daily-plans', () => ({
	useMyDailyPlans: () => ({ myDailyPlans: { items: [] }, isSuccess: true })
}));
jest.mock('@/core/hooks/organizations/teams/use-organization-teams-employee', () => ({
	useOrganizationEmployeeTeams: () => ({ updateOrganizationTeamEmployeeActiveTask: mockUpdateActiveTask })
}));
jest.mock('@/core/hooks/organizations/teams/use-team-tasks-state', () => ({
	useTeamTasksState: () => ({ setActiveTask: mockSetActiveTask, isUpdatingActiveTask: false })
}));
jest.mock('@/core/hooks/organizations/teams/use-update-task', () => ({
	useUpdateTask: () => ({ updateTask: mockUpdateTask })
}));
jest.mock('@/core/hooks/tasks/use-task-statuses-query', () => ({ useTaskStatusesQuery: () => ({ taskStatuses: [] }) }));
jest.mock('./use-timer-billable', () => ({ useResolveTimerBillable: () => mockResolveBillable }));

const TASK = {
	id: 'task-1',
	title: 'Task',
	status: 'in-progress',
	organizationId: 'org-1',
	projectId: null
} as never as TTask;

/** A tab whose own timer status says stopped: Start pressed there on TASK. */
function renderTab() {
	const store = createStore();
	store.set(organizationTeamsState, [{ id: 'team-1', name: 'Team', members: [], projects: [] }] as never);
	store.set(activeTeamIdState, 'team-1');
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
	const pressStart = async () => {
		let outcome: unknown;
		await act(async () => {
			outcome = await result.current.startTimer(TASK);
		});
		return outcome;
	};
	return { pressStart, queryClient };
}

describe('Start while the tracking flag says a timer runs and this tab says stopped', () => {
	beforeEach(() => {
		mockGauzy.lastLog = null;
		mockGauzy.isTrackingTime = false;
	});

	it('refuses the start and keeps the run another device started since this tab read its status', async () => {
		// The desktop app started a run 30 seconds ago
		mockGauzy.lastLog = {
			id: 'log-desktop',
			source: ETimeLogSource.DESKTOP,
			isRunning: true,
			startedAt: minutesAgo(0.5),
			stoppedAt: minutesAgo(0.5)
		};
		mockGauzy.isTrackingTime = true;
		const { pressStart, queryClient } = renderTab();
		const invalidate = jest.spyOn(queryClient, 'invalidateQueries');

		const outcome = await pressStart();

		expect(mockStopTimer).not.toHaveBeenCalled();
		expect(mockStartTimer).not.toHaveBeenCalled();
		expect(mockGauzy.lastLog).toMatchObject({ id: 'log-desktop', isRunning: true });
		expect(outcome).toBe('blocked');
		expect(mockToastWarning).toHaveBeenCalledWith('timer.ALREADY_TRACKING_MESSAGE', {
			id: ALREADY_TRACKING_TOAST_ID
		});
		// This tab's status was out of date: it is read again, so the tab shows that run
		expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.timer.all });
	});

	it("refuses the start and keeps a run another device kept going past midnight, which the day's status leaves out", async () => {
		// The desktop app started a run yesterday at 23:00 and still runs it
		mockGauzy.lastLog = {
			id: 'log-overnight',
			source: ETimeLogSource.DESKTOP,
			isRunning: true,
			startedAt: minutesAgo(660),
			stoppedAt: minutesAgo(1)
		};
		mockGauzy.isTrackingTime = true;
		const { pressStart } = renderTab();

		const outcome = await pressStart();

		expect(mockStopTimer).not.toHaveBeenCalled();
		expect(mockStartTimer).not.toHaveBeenCalled();
		expect(mockGauzy.lastLog).toMatchObject({ id: 'log-overnight', isRunning: true });
		expect(outcome).toBe('blocked');
		expect(mockToastWarning).toHaveBeenCalledWith('timer.ALREADY_TRACKING_MESSAGE', {
			id: ALREADY_TRACKING_TOAST_ID
		});
	});

	it('still clears a stuck flag when nothing runs, then starts', async () => {
		mockGauzy.lastLog = {
			id: 'log-yesterday',
			source: ETimeLogSource.TEAMS,
			isRunning: false,
			startedAt: minutesAgo(600),
			stoppedAt: minutesAgo(540)
		};
		mockGauzy.isTrackingTime = true;
		const { pressStart } = renderTab();

		const outcome = await pressStart();

		expect(mockStopTimer).toHaveBeenCalledTimes(1);
		expect(mockStopTimer).toHaveBeenCalledWith({ source: ETimeLogSource.TEAMS });
		expect(outcome).toBe('started');
		expect(mockStartTimer).toHaveBeenCalledTimes(1);
		expect(mockToastWarning).not.toHaveBeenCalled();
	});

	it('still stops a run its closed tab left behind at its last heartbeat (#4586), then starts', async () => {
		mockGauzy.lastLog = {
			id: 'log-closed-tab',
			source: ETimeLogSource.TEAMS,
			isRunning: true,
			startedAt: minutesAgo(120),
			stoppedAt: minutesAgo(30)
		};
		mockGauzy.isTrackingTime = true;
		const { pressStart } = renderTab();

		const outcome = await pressStart();

		expect(mockStopTimer).toHaveBeenCalledTimes(1);
		expect(mockStopTimer).toHaveBeenCalledWith({
			source: ETimeLogSource.TEAMS,
			startedAt: minutesAgo(120),
			stoppedAt: minutesAgo(30)
		});
		expect(outcome).toBe('started');
		expect(mockStartTimer).toHaveBeenCalledTimes(1);
	});
});
