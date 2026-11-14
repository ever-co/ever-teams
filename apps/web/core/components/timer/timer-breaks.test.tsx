/** @jest-environment jsdom */

/**
 * The timers during a break (#5216). "Back to work" starts again the task the break paused, never a task page opened
 * or another active task picked during the break. "End break" only stops the break, so it needs no task to start.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import type { ReactNode } from 'react';

import {
	activeTeamIdState,
	activeTeamTaskState,
	organizationTeamsState,
	teamTasksState,
	timerStatusState
} from '@/core/stores';
import { ETimeLogSource, ETimeLogType } from '@/core/types/generics/enums/timer';
import type { ITimerStatus } from '@/core/types/interfaces/timer/timer-status';
import type { TOrganizationTeam } from '@/core/types/schemas';
import type { TTask } from '@/core/types/schemas/task/task.schema';
import { MinTimerFrame, Timer } from './timer';

const mockStartTimer = jest.fn();
const mockStopTimer = jest.fn();
const mockTakeBreak = jest.fn();
const mockEndBreak = jest.fn();

type TChildrenProps = { children?: ReactNode };

const TEAM_ID = 'team-a';
const team = { id: TEAM_ID, requirePlanToTrack: false, members: [] } as unknown as TOrganizationTeam;
const pausedTask = { id: 'task-paused', title: 'Paused task', teams: [{ id: TEAM_ID }] } as unknown as TTask;
const otherTask = { id: 'task-other', title: 'Other task', teams: [{ id: TEAM_ID }] } as unknown as TTask;

/** Gauzy during a break: the timer stopped, the break the last log, still running. */
const onBreak = {
	running: false,
	lastLog: {
		id: 'break-1',
		logType: ETimeLogType.BREAK,
		isRunning: true,
		taskId: pausedTask.id,
		organizationTeamId: TEAM_ID,
		source: ETimeLogSource.TEAMS,
		startedAt: '2026-11-14T12:00:00.000Z'
	}
} as unknown as ITimerStatus;

jest.mock('@/core/hooks/timer/use-timer-break', () => ({
	useTimerBreak: () => ({
		allowsBreaks: true,
		breakState: {
			isOnBreak: true,
			startedAt: new Date('2026-11-14T12:00:00.000Z'),
			taskId: 'task-paused',
			isFromThisApp: true
		},
		pendingAction: null,
		takeBreak: mockTakeBreak,
		endBreak: mockEndBreak
	}),
	useBreakElapsedSeconds: () => 0
}));
jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('sonner', () => ({ toast: { warning: jest.fn(), info: jest.fn(), error: jest.fn() } }));
jest.mock('assets/svg', () => ({ TimerPlayIcon: () => null, TimerStopIcon: () => null }), { virtual: true });
jest.mock('@headlessui/react', () => ({ Transition: ({ children }: TChildrenProps) => <>{children}</> }));
jest.mock('@/core/hooks/activities/use-timer', () => {
	const { useAtomValue } = jest.requireActual('jotai');
	const { teamTimerStatusState } = jest.requireActual('@/core/stores/timer/team-timer-status');
	return {
		useTimerView: () => ({
			timerStatus: useAtomValue(teamTimerStatusState),
			canRunTimer: true,
			startTimer: mockStartTimer,
			stopTimer: mockStopTimer
		}),
		useActiveTaskEstimation: () => 0
	};
});
jest.mock('@/core/hooks/timer/use-timer-ui', () => ({
	useTimerClock: () => ({ hours: 0, minutes: 0, seconds: 0, ms_p: 0 })
}));
jest.mock('@/core/hooks/activities/use-today-worked-time', () => ({
	useTodayWorkedTime: () => ({ hours: 0, minutes: 0, seconds: 0 })
}));
jest.mock('@/core/hooks/auth/use-authenticate-user', () => ({
	useAuthenticateUser: () => ({ user: { isEmailVerified: true } })
}));
jest.mock('@/core/hooks/daily-plans/use-my-daily-plans', () => ({
	useMyDailyPlans: () => ({ myDailyPlans: { items: [] } })
}));
jest.mock('@/core/hooks/common/use-hotkeys', () => ({
	HostKeys: { START_STOP_TIMER: 'start-stop-timer' },
	useHotkeys: jest.fn()
}));
jest.mock('@/core/hooks/common/use-detect-os', () => ({ useDetectOS: () => ({ os: 'Windows' }) }));
jest.mock('@/core/components/features/daily-plan/timer-plan-dialogs', () => ({ TimerPlanDialogs: () => null }));
jest.mock('./timer-billable-toggle', () => ({ TimerBillableToggle: () => null }));
// The run's menu (#5219) shows only over a running timer, never during a break
jest.mock('./timer-run-menu', () => ({ TimerRunMenu: () => null }));
jest.mock('../duplicated-components/_progress-bar', () => ({ ProgressBar: () => null }));
jest.mock('../duplicated-components/tooltip', () => ({ Tooltip: ({ children }: TChildrenProps) => <>{children}</> }));
jest.mock('@/core/components/common/tooltip', () => ({
	Tooltip: ({ children }: TChildrenProps) => <>{children}</>,
	TooltipTrigger: ({ children }: TChildrenProps) => <>{children}</>,
	TooltipContent: () => null
}));

/** A timer on break, with `activeTask` as the active task (none after a reload whose stop cleared it). */
function renderOnBreak(timer: ReactNode, activeTask: TTask | null) {
	const store = createStore();
	store.set(organizationTeamsState, [team]);
	store.set(activeTeamIdState, TEAM_ID);
	store.set(teamTasksState, [pausedTask, otherTask]);
	store.set(activeTeamTaskState, activeTask);
	store.set(timerStatusState, onBreak);
	render(<Provider store={store}>{timer}</Provider>);
}

describe.each([
	['the top bar timer', () => <MinTimerFrame />],
	['the dashboard timer', () => <Timer />]
])('%s on a break', (_name, timer) => {
	it('goes back to work on the task the break paused, not on the task picked during the break', () => {
		renderOnBreak(timer(), otherTask);

		fireEvent.click(screen.getByRole('button', { name: 'breaks.BACK_TO_WORK' }));

		expect(mockStartTimer).toHaveBeenCalledTimes(1);
		expect(mockStartTimer).toHaveBeenCalledWith(pausedTask);
		expect(mockStopTimer).not.toHaveBeenCalled();
	});

	it('ends the break without an active task, which a reload or a closed task leaves empty', () => {
		renderOnBreak(timer(), null);

		const endBreak = screen.getByRole('button', { name: 'breaks.END_BREAK' });
		expect(endBreak.getAttribute('aria-disabled')).toBe('false');

		fireEvent.click(endBreak);

		expect(mockEndBreak).toHaveBeenCalledTimes(1);
		expect(mockStartTimer).not.toHaveBeenCalled();
	});
});
