/** @jest-environment jsdom */
/**
 * #5121: when the employee's tracking flag said a timer runs while this tab's status said stopped, Start took the flag
 * for stuck and stopped whatever ran, before its own checks. That status can be out of date (up to a minute old, or
 * read while a start elsewhere was landing): a run just started on another device was stopped, and the start could
 * still be refused afterwards. The status is read again first; a run it finds refuses the start and keeps going, and
 * this tab shows it at once, so its Stop reaches it.
 *
 * #5123: while the time a run went on without the app is still to be settled (the person is being asked), the
 * heartbeat and a stop would each put that time in the run: neither is sent before the answer.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createStore, Provider } from 'jotai';
import type { PropsWithChildren } from 'react';

import { queryKeys } from '@/core/query/keys';
import {
	activeTeamIdState,
	activeTeamTaskState,
	organizationOpeningState,
	organizationTeamsState,
	timerNotesState,
	timerStartsInFlightState,
	timerStatusState
} from '@/core/stores';
import { landLabelSave } from '@/core/lib/utils/timer-status-labels';
import { timerLabelsSavedState } from '@/core/stores/timer/timer-labels';
import { timerStartNotesState } from '@/core/stores/timer/timer-start-notes';
import { ETimeLogSource } from '@/core/types/generics/enums/timer';
import type { TTask } from '@/core/types/schemas/task/task.schema';
import { ALREADY_TRACKING_TOAST_ID, pendingTimerStart, startUnderTimerGuard, useTimerApi } from './use-timer-api';

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
	tags?: Array<{ id: string; name: string }>;
}

/** Gauzy as the start's checks see it: the employee's last time log and tracking flag, and a failing status read. */
const mockGauzy: {
	lastLog: TimeLog | null;
	isTrackingTime: boolean;
	statusReadFails: boolean;
	lastLogReadFails?: boolean;
	/** A status read waits for it: a read on its way while something else happens. */
	statusReadHold?: Promise<void>;
} = {
	lastLog: null,
	isTrackingTime: false,
	statusReadFails: false
};

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
/** The bodies the starts sent, notes included. */
const mockStartBodies: unknown[] = [];
const mockToastWarning = jest.fn();
const mockToastError = jest.fn();
const mockTranslate = (key: string) => key;
const mockUpdateActiveTask = jest.fn(async () => undefined);
const mockUpdateTask = jest.fn();
const mockSetActiveTask = jest.fn();
const mockResolveBillable = jest.fn(async () => false);
/** The heartbeats sent, each answered with the status Gauzy has then. */
const mockSyncTimer = jest.fn(async () => ({
	data: { running: !!mockGauzy.lastLog?.isRunning, lastLog: mockGauzy.lastLog }
}));
/** Gauzy's address verification status: `null` where the deployment verifies no address (its route answers 404). */
const mockGetVerificationStatus = jest.fn();
/** What the guard of the app shell says of the time a run went on without the app: still to be settled, or not. */
const mockUnfollowedTime: { settled: Promise<boolean> | null } = { settled: null };

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
	toast: {
		warning: (...args: unknown[]) => mockToastWarning(...args),
		error: (...args: unknown[]) => mockToastError(...args),
		info: jest.fn()
	}
}));
jest.mock('@/core/services/client/api/timers', () => ({
	timerService: {
		// The day's status of a Gauzy before its past-midnight fix (ever-gauzy 531c63ac6): only the logs started today
		getTimerStatus: async () => {
			await mockGauzy.statusReadHold;
			if (mockGauzy.statusReadFails) throw new Error('Network Error');
			const lastLog =
				mockGauzy.lastLog && Date.parse(mockGauzy.lastLog.startedAt) >= TODAY_START ? mockGauzy.lastLog : null;
			return { data: { running: !!lastLog?.isRunning, lastLog } };
		},
		// The employee's last log, whatever its day
		getLastTimerLog: async () => {
			if (mockGauzy.lastLogReadFails) throw new Error('Network Error');
			return { data: [{ lastLog: mockGauzy.lastLog }], headers: { date: new Date(NOW).toUTCString() } };
		},
		stopTimer: (body: { source: ETimeLogSource; stoppedAt?: string }) => mockStopTimer(body),
		startTimer: (body: unknown) => {
			mockStartBodies.push(body);
			return mockStartTimer();
		},
		// The heartbeat, which a stop sends first too
		syncTimer: () => mockSyncTimer()
	}
}));
jest.mock('@/core/services/client/api/users/emails/email-verification.service', () => ({
	emailVerificationService: { getVerificationStatus: () => mockGetVerificationStatus() }
}));
jest.mock('./use-stale-timer-guard', () => ({
	...jest.requireActual('./use-stale-timer-guard'),
	isUnfollowedTimeUnsettled: () => mockUnfollowedTime.settled !== null,
	whenUnfollowedTimeIsSettled: () => mockUnfollowedTime.settled
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
	const pressStop = async () => {
		await act(async () => {
			await result.current.stopTimer();
		});
	};
	return { pressStart, pressStop, queryClient, store, result };
}

/**
 * Presses Start in the tab and checks it is refused with the "already tracking" warning while the run `logId` goes on
 * untouched. Answers the spy on the tab's query invalidations, set before the press.
 */
async function expectStartRefusedKeeping(tab: ReturnType<typeof renderTab>, logId: string) {
	const invalidate = jest.spyOn(tab.queryClient, 'invalidateQueries');

	const outcome = await tab.pressStart();

	expect(mockStopTimer).not.toHaveBeenCalled();
	expect(mockStartTimer).not.toHaveBeenCalled();
	expect(mockGauzy.lastLog).toMatchObject({ id: logId, isRunning: true });
	expect(outcome).toBe('blocked');
	expect(mockToastWarning).toHaveBeenCalledWith('timer.ALREADY_TRACKING_MESSAGE', {
		id: ALREADY_TRACKING_TOAST_ID
	});
	return invalidate;
}

describe('Start while the tracking flag says a timer runs and this tab says stopped', () => {
	beforeEach(() => {
		mockGauzy.lastLog = null;
		mockGauzy.isTrackingTime = false;
		mockGauzy.statusReadFails = false;
		mockGauzy.lastLogReadFails = false;
		mockGauzy.statusReadHold = undefined;
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
		const tab = renderTab();

		const invalidate = await expectStartRefusedKeeping(tab, 'log-desktop');

		// This tab's status was out of date: the tab shows that run at once, and its status queries read it again
		expect(tab.store.get(timerStatusState)).toMatchObject({ running: true, lastLog: { id: 'log-desktop' } });
		expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.timer.all });

		// Stop in this tab then stops that run
		await tab.pressStop();

		expect(mockStopTimer).toHaveBeenCalledWith({ source: ETimeLogSource.DESKTOP });
		expect(mockGauzy.lastLog).toMatchObject({ id: 'log-desktop', isRunning: false });
	});

	it('keeps the labels saved on that run while the fresh read of it was on its way (#5368)', async () => {
		const meeting = { id: 'meeting', name: 'meeting' };
		const support = { id: 'support', name: 'support' };
		mockGauzy.lastLog = {
			id: 'log-desktop',
			source: ETimeLogSource.DESKTOP,
			isRunning: true,
			startedAt: minutesAgo(0.5),
			stoppedAt: minutesAgo(0.5),
			tags: [meeting]
		};
		mockGauzy.isTrackingTime = true;
		const tab = renderTab();
		let releaseRead: () => void = () => undefined;
		mockGauzy.statusReadHold = new Promise<void>((resolve) => (releaseRead = resolve));

		let start: Promise<unknown> | undefined;
		await act(async () => {
			start = tab.result.current.startTimer(TASK);
		});
		// Meanwhile a poll showed the run, and "support" was saved on it
		act(() => {
			const shown = { ...mockGauzy.lastLog, tags: [meeting, support] };
			tab.store.set(timerStatusState, { running: true, lastLog: shown } as never);
			const saved = { logId: 'log-desktop', tags: [meeting, support], saveNumber: landLabelSave() };
			tab.store.set(timerLabelsSavedState, saved as never);
		});
		// The fresh read, asked before that save, then lands with "meeting" alone
		await act(async () => {
			releaseRead();
			await start;
		});

		expect(mockStartTimer).not.toHaveBeenCalled();
		expect(tab.store.get(timerStatusState)?.lastLog?.tags).toEqual([meeting, support]);
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
		const tab = renderTab();

		const invalidate = await expectStartRefusedKeeping(tab, 'log-overnight');

		// The tab shows that run at once. Its day's status is not read again: it would show the run stopped
		expect(tab.store.get(timerStatusState)).toMatchObject({ running: true, lastLog: { id: 'log-overnight' } });
		expect(invalidate).not.toHaveBeenCalledWith({ queryKey: queryKeys.timer.all });
	});

	it('refuses the start and stops nothing when the read of the last log fails', async () => {
		// The flag says a run goes on and this tab shows none: the check of the last log fails before the status read
		mockGauzy.lastLog = {
			id: 'log-desktop',
			source: ETimeLogSource.DESKTOP,
			isRunning: true,
			startedAt: minutesAgo(0.5),
			stoppedAt: minutesAgo(0.5)
		};
		mockGauzy.isTrackingTime = true;
		mockGauzy.lastLogReadFails = true;
		const { pressStart } = renderTab();

		const outcome = await pressStart();

		expect(outcome).toBe('blocked');
		expect(mockStopTimer).not.toHaveBeenCalled();
		expect(mockStartTimer).not.toHaveBeenCalled();
		expect(mockToastError).toHaveBeenCalledWith(
			'toasts.timer.START_FAILED',
			expect.objectContaining({ id: 'timer-start-failed' })
		);
	});

	it('refuses the start and stops nothing when the fresh status read fails', async () => {
		// The desktop app started a run 30 seconds ago, and the status read fails: Gauzy's start would stop that run
		mockGauzy.lastLog = {
			id: 'log-desktop',
			source: ETimeLogSource.DESKTOP,
			isRunning: true,
			startedAt: minutesAgo(0.5),
			stoppedAt: minutesAgo(0.5)
		};
		mockGauzy.isTrackingTime = true;
		mockGauzy.statusReadFails = true;
		const { pressStart } = renderTab();

		const outcome = await pressStart();

		expect(outcome).toBe('blocked');
		expect(mockStopTimer).not.toHaveBeenCalled();
		expect(mockStartTimer).not.toHaveBeenCalled();
		expect(mockGauzy.lastLog).toMatchObject({ id: 'log-desktop', isRunning: true });
		expect(mockToastError).toHaveBeenCalledWith(
			'toasts.timer.START_FAILED',
			expect.objectContaining({ id: 'timer-start-failed' })
		);
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

/**
 * The sweep that merged #5113 (notes typed in the timer) with #5131 (Continue hands the entry's notes to the start of
 * its task): a start sends one of them, and whatever it sends is what the timer's notes field shows once it runs.
 */
describe("Start with a notes draft and a continued entry's notes", () => {
	beforeEach(() => {
		mockGauzy.lastLog = null;
		mockGauzy.isTrackingTime = false;
		mockGauzy.statusReadFails = false;
		mockGauzy.lastLogReadFails = false;
		mockStartBodies.length = 0;
	});

	it("sends the continued entry's notes, which become the timer's notes in place of the draft", async () => {
		const tab = renderTab();
		tab.store.set(timerNotesState, { text: 'Typed before Continue', timeLogId: null });
		tab.store.set(timerStartNotesState, { taskId: 'task-1', description: 'Standup notes', handedAt: Date.now() });

		const outcome = await tab.pressStart();

		expect(outcome).toBe('started');
		expect(mockStartBodies).toEqual([expect.objectContaining({ description: 'Standup notes' })]);
		// Tied to the started entry, the draft would have been sent at the stop over the continued notes
		expect(tab.store.get(timerNotesState)).toEqual({ text: 'Standup notes', timeLogId: 'log-new' });
		expect(tab.store.get(timerStartNotesState)).toBeNull();
	});

	it("takes the continued entry's notes as the start is asked, so the plan dialog that asks it cannot drop them", async () => {
		const tab = renderTab();
		tab.store.set(timerStartNotesState, { taskId: 'task-1', description: 'Standup notes', handedAt: Date.now() });

		let outcome: unknown;
		await act(async () => {
			const started = tab.result.current.startTimer(TASK);
			// The dialog closes right after asking, before the start's checks have answered
			expect(tab.store.get(timerStartNotesState)).toBeNull();
			outcome = await started;
		});

		expect(outcome).toBe('started');
		expect(mockStartBodies).toEqual([expect.objectContaining({ description: 'Standup notes' })]);
	});

	it('sends the draft when no entry was continued, and ties it to the started entry', async () => {
		const tab = renderTab();
		tab.store.set(timerNotesState, { text: 'Typed in the timer', timeLogId: null });

		const outcome = await tab.pressStart();

		expect(outcome).toBe('started');
		expect(mockStartBodies).toEqual([expect.objectContaining({ description: 'Typed in the timer' })]);
		expect(tab.store.get(timerNotesState)).toEqual({ text: 'Typed in the timer', timeLogId: 'log-new' });
	});
});

/**
 * #5204: picking a team of another organization in the team menu moves the session there once Gauzy answers. A timer
 * started meanwhile would keep running in the organization left behind, so the start is refused until the page is
 * replaced, whether the switch began before the start or during its checks.
 */
describe('Start while another organization of the workspace is opening', () => {
	beforeEach(() => {
		mockGauzy.lastLog = null;
		mockGauzy.isTrackingTime = false;
		mockGauzy.statusReadFails = false;
		mockGauzy.lastLogReadFails = false;
		mockStartBodies.length = 0;
		mockToastWarning.mockClear();
		mockStartTimer.mockClear();
	});

	it('refuses the start and says another organization is opening', async () => {
		const tab = renderTab();
		act(() => tab.store.set(organizationOpeningState, true));

		const outcome = await tab.pressStart();

		expect(outcome).toBe('blocked');
		expect(mockStartTimer).not.toHaveBeenCalled();
		expect(mockToastWarning).toHaveBeenCalledWith('toasts.timer.ORGANIZATION_OPENING', {
			id: 'timer-organization-opening'
		});
	});

	it('says a start is on its way until Gauzy answers it, so the team menu can refuse a switch meanwhile', async () => {
		const tab = renderTab();
		let answerStart: () => void = () => undefined;
		mockStartTimer.mockImplementationOnce(
			() =>
				new Promise((resolve) => {
					answerStart = () => {
						const log = {
							id: 'log-new',
							source: ETimeLogSource.TEAMS,
							isRunning: true,
							startedAt: minutesAgo(0),
							stoppedAt: minutesAgo(0)
						};
						resolve({ data: { running: true, lastLog: log } });
					};
				})
		);

		let started: Promise<unknown> | undefined;
		act(() => {
			started = tab.result.current.startTimer(TASK);
		});
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 0));
		});
		await act(async () => {
			await Promise.resolve();
		});
		const whileSent = tab.store.get(timerStartsInFlightState);
		await act(async () => {
			answerStart();
			await started;
		});

		expect(whileSent).toBe(1);
		expect(tab.store.get(timerStartsInFlightState)).toBe(0);
	});

	it("keeps saying a start is on its way while a later start is unanswered, when an earlier start's bookkeeping ends", async () => {
		const tab = renderTab();
		act(() => {
			tab.store.set(organizationTeamsState, [
				{
					id: 'team-1',
					name: 'Team',
					members: [{ id: 'member-1', employee: { userId: 'user-1' } }],
					projects: []
				}
			] as never);
		});
		// Start A lands at once, then saves the active task, which waits
		let finishActiveTaskOfA: () => void = () => undefined;
		mockUpdateActiveTask.mockImplementationOnce(
			() =>
				new Promise<undefined>((resolve) => {
					finishActiveTaskOfA = () => resolve(undefined);
				})
		);
		let startA: Promise<unknown> | undefined;
		await act(async () => {
			startA = tab.result.current.startTimer(TASK);
			await new Promise((resolve) => setTimeout(resolve, 0));
		});
		// The timer is stopped elsewhere meanwhile, and start B is sent; Gauzy has not answered it yet
		mockGauzy.lastLog = null;
		mockGauzy.isTrackingTime = false;
		act(() => tab.store.set(timerStatusState, { running: false, lastLog: null } as never));
		let answerB: () => void = () => undefined;
		mockStartTimer.mockImplementationOnce(
			() =>
				new Promise((resolve) => {
					answerB = () => resolve({ data: { running: false, lastLog: null } } as never);
				})
		);
		let startB: Promise<unknown> | undefined;
		await act(async () => {
			startB = tab.result.current.startTimer(TASK);
			await new Promise((resolve) => setTimeout(resolve, 0));
		});
		expect(mockStartTimer).toHaveBeenCalledTimes(2);

		await act(async () => {
			finishActiveTaskOfA();
			await startA;
		});
		const whileBUnanswered = tab.store.get(timerStartsInFlightState) > 0;
		await act(async () => {
			answerB();
			await startB;
		});

		expect(whileBUnanswered).toBe(true);
		expect(tab.store.get(timerStartsInFlightState)).toBe(0);
	});

	it('refuses the start when the switch begins during its checks', async () => {
		const tab = renderTab();
		let answerBillable: (isBillable: boolean) => void = () => undefined;
		const billableRead = new Promise<boolean>((resolve) => {
			answerBillable = resolve;
		});
		let billableAsked: () => void = () => undefined;
		const isBillableAsked = new Promise<void>((resolve) => {
			billableAsked = resolve;
		});
		mockResolveBillable.mockImplementationOnce(() => {
			billableAsked();
			return billableRead;
		});

		let started: Promise<unknown> | undefined;
		act(() => {
			started = tab.result.current.startTimer(TASK);
		});
		await act(async () => {
			await isBillableAsked;
		});
		// The person picks another organization while the start reads the task's project
		act(() => tab.store.set(organizationOpeningState, true));
		let outcome: unknown;
		await act(async () => {
			answerBillable(false);
			outcome = await started;
		});

		expect(outcome).toBe('blocked');
		expect(mockStartTimer).not.toHaveBeenCalled();
	});
});

/**
 * A break (#5216) stops the work, then starts the break: Gauzy's start ends whatever runs, so a work start landing
 * beside the break would be ended by it, or end it. The break holds the start guard every timer shares meanwhile.
 */
describe('Start while a break is being taken', () => {
	beforeEach(() => {
		mockGauzy.lastLog = null;
		mockGauzy.isTrackingTime = false;
		mockGauzy.statusReadFails = false;
		mockGauzy.lastLogReadFails = false;
		mockStartBodies.length = 0;
	});

	it('sends no start until the break has landed, then starts as usual', async () => {
		const tab = renderTab();
		let landBreak = () => {};
		const breakStart = startUnderTimerGuard(
			() =>
				new Promise<void>((resolve) => {
					landBreak = resolve;
				})
		);
		expect(breakStart).not.toBeNull();
		expect(pendingTimerStart()).toBe(breakStart);

		// A task card's start of a task: refused, as during any other start
		let refusal: unknown;
		await act(async () => {
			await Promise.resolve(tab.result.current.startTimer(TASK)).catch((error: unknown) => {
				refusal = error;
			});
		});
		expect(refusal).toBeInstanceOf(Error);
		expect(mockToastWarning).toHaveBeenCalledWith('toasts.timer.START_IN_PROGRESS', {
			id: 'timer-start-in-progress'
		});
		// The start key or the other timer, naming no task: waits for the break, and no work starts
		let keyOutcome: unknown;
		await act(async () => {
			const keyStart = tab.result.current.startTimer();
			landBreak();
			keyOutcome = await keyStart;
		});
		expect(keyOutcome).toBe('blocked');
		expect(mockStartTimer).not.toHaveBeenCalled();
		expect(pendingTimerStart()).toBeNull();

		const outcome = await tab.pressStart();

		expect(outcome).toBe('started');
		expect(mockStartTimer).toHaveBeenCalledTimes(1);
	});

	it('runs no second break while one is being taken', async () => {
		let landBreak = () => {};
		const first = startUnderTimerGuard(
			() =>
				new Promise<void>((resolve) => {
					landBreak = resolve;
				})
		);
		const second = jest.fn(async () => undefined);

		expect(startUnderTimerGuard(second)).toBeNull();
		expect(second).not.toHaveBeenCalled();

		landBreak();
		await first;
	});
});

describe('while the time a run went on without the app is still to be settled', () => {
	/** A tab that shows the employee's run, started an hour ago with a heartbeat a moment ago. */
	function renderTabWithRun() {
		mockGauzy.lastLog = {
			id: 'log-1',
			source: ETimeLogSource.TEAMS,
			isRunning: true,
			startedAt: minutesAgo(60),
			stoppedAt: minutesAgo(1)
		};
		mockGauzy.isTrackingTime = true;
		const tab = renderTab();
		act(() => tab.store.set(timerStatusState, { running: true, lastLog: mockGauzy.lastLog } as never));
		const sendHeartbeat = async () => {
			await act(async () => {
				await tab.result.current.syncTimer();
			});
		};
		return { ...tab, sendHeartbeat };
	}
	/**
	 * The person is being asked: nothing is settled until the function this returns is called, with whether the run
	 * was stopped at its last heartbeat (their answer, or none before the closed-tab delay).
	 */
	function holdUntilAnswered() {
		let answer: (wasStoppedThere: boolean) => void = () => undefined;
		mockUnfollowedTime.settled = new Promise<boolean>((resolve) => {
			answer = (wasStoppedThere) => {
				mockUnfollowedTime.settled = null;
				resolve(wasStoppedThere);
			};
		});
		return answer;
	}

	// The module remembers when it last stopped, to debounce the automatic stops: each test runs an hour after the
	// previous one
	const realNow = Date.now;
	let clockOffset = 0;

	beforeEach(() => {
		clockOffset += 60 * MINUTE;
		jest.spyOn(Date, 'now').mockImplementation(() => realNow() + clockOffset);
		mockUnfollowedTime.settled = null;
		mockGauzy.statusReadFails = false;
		mockGauzy.lastLogReadFails = false;
		window.localStorage.clear();
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('sends no heartbeat, which would put that time in the run', async () => {
		const tab = renderTabWithRun();
		const answer = holdUntilAnswered();

		await tab.sendHeartbeat();
		expect(mockSyncTimer).not.toHaveBeenCalled();

		answer(false);
		await tab.sendHeartbeat();
		expect(mockSyncTimer).toHaveBeenCalledTimes(1);
	});

	it('holds a stop until the person has answered, then sends it', async () => {
		const tab = renderTabWithRun();
		const answer = holdUntilAnswered();

		let stopped = false;
		let stop: Promise<void> = Promise.resolve();
		act(() => {
			stop = Promise.resolve(tab.result.current.stopTimer()).then(() => {
				stopped = true;
			});
		});
		await act(async () => {
			for (let step = 0; step < 20; step += 1) await Promise.resolve();
		});
		expect(mockStopTimer).not.toHaveBeenCalled();
		expect(stopped).toBe(false);

		// They keep the time: the stop then ends the run at the present
		await act(async () => {
			answer(false);
			await stop;
		});
		expect(mockStopTimer).toHaveBeenCalledTimes(1);
		expect(stopped).toBe(true);
	});

	it('sends no stop when the person stopped the run at its last heartbeat there', async () => {
		const tab = renderTabWithRun();
		const answer = holdUntilAnswered();
		let stop: Promise<void> = Promise.resolve();
		act(() => {
			stop = Promise.resolve(tab.result.current.stopTimer());
		});

		// The status of the tab still says running: its read after that stop has not landed yet
		await act(async () => {
			answer(true);
			await stop;
		});

		expect(mockStopTimer).not.toHaveBeenCalled();
	});
});

describe('a heartbeat the API took', () => {
	beforeEach(() => {
		mockUnfollowedTime.settled = null;
		window.localStorage.clear();
	});

	it('is remembered by the browser, which counts the time without the app from it', async () => {
		mockGauzy.lastLog = {
			id: 'log-1',
			source: ETimeLogSource.TEAMS,
			isRunning: true,
			startedAt: minutesAgo(60),
			stoppedAt: minutesAgo(0)
		};
		const tab = renderTab();
		act(() => tab.store.set(timerStatusState, { running: true, lastLog: mockGauzy.lastLog } as never));

		await act(async () => {
			await tab.result.current.syncTimer();
		});

		expect(JSON.parse(String(window.localStorage.getItem('ever-teams.timer.last-heartbeat')))).toEqual({
			timeLogId: 'log-1',
			at: expect.any(Number),
			stoppedAt: minutesAgo(0)
		});
	});

	it('keeps the labels saved on the run while it was on its way, rather than the ones its answer read (#5368)', async () => {
		const meeting = { id: 'meeting', name: 'meeting' };
		const support = { id: 'support', name: 'support' };
		const run = {
			id: 'log-1',
			source: ETimeLogSource.TEAMS,
			isRunning: true,
			startedAt: minutesAgo(60),
			stoppedAt: minutesAgo(0)
		};
		mockGauzy.lastLog = run;
		const tab = renderTab();
		act(() => tab.store.set(timerStatusState, { running: true, lastLog: { ...run, tags: [meeting] } } as never));
		// The answer read the run before the save below: "meeting" alone
		let answerHeartbeat: (answer: unknown) => void = () => undefined;
		mockSyncTimer.mockImplementationOnce(
			() =>
				new Promise((resolve) => (answerHeartbeat = resolve as (answer: unknown) => void)) as ReturnType<
					typeof mockSyncTimer
				>
		);

		let heartbeat: Promise<unknown> | undefined;
		// Sent: the heartbeat is on its way once the request has gone out
		await act(async () => {
			heartbeat = tab.result.current.syncTimer();
		});
		expect(mockSyncTimer).toHaveBeenCalled();
		act(() => {
			const saved = { logId: 'log-1', tags: [meeting, support], saveNumber: landLabelSave() };
			tab.store.set(timerLabelsSavedState, saved as never);
			tab.store.set(timerStatusState, { running: true, lastLog: { ...run, tags: [meeting, support] } } as never);
		});
		await act(async () => {
			answerHeartbeat({ data: { running: true, lastLog: { ...run, tags: [meeting] } } });
			await heartbeat;
		});

		expect(tab.store.get(timerStatusState)?.lastLog?.tags).toEqual([meeting, support]);
	});
});

describe('canRunTimer for an owner whose address is not verified (#5677)', () => {
	beforeEach(() => {
		mockGauzy.lastLog = null;
		mockGauzy.isTrackingTime = false;
		mockUser.isEmailVerified = false;
		mockGetVerificationStatus.mockReset();
	});

	afterEach(() => {
		mockUser.isEmailVerified = true;
	});

	function renderTabOnTask() {
		const tab = renderTab();
		act(() => tab.store.set(activeTeamTaskState, TASK));
		return tab;
	}

	it('lets the timer start where the deployment verifies no address (the status route answers 404)', async () => {
		mockGetVerificationStatus.mockResolvedValue(null);

		const tab = renderTabOnTask();

		await waitFor(() => expect(tab.result.current.canRunTimer).toBe(true));
	});

	it('keeps the timer from starting where the deployment verifies addresses', async () => {
		mockGetVerificationStatus.mockResolvedValue({ isEmailVerified: false, verificationEmailSent: true });

		const tab = renderTabOnTask();
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 0));
		});

		expect(tab.result.current.canRunTimer).toBe(false);
	});
});
