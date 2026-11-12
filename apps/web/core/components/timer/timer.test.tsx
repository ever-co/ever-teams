/** @jest-environment jsdom */

/**
 * The timers draw the team-filtered status: a run on a task outside the active team's tasks (from the desktop app, the
 * mobile app, the extension, or another tab on another team's task) reads as stopped there, and they offer Start. That
 * Start never stops the run: it says time is already tracked elsewhere (#5117). A run the timer shows still stops.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import type { ReactNode } from 'react';
import { toast } from 'sonner';

import { ALREADY_TRACKING_TOAST_ID } from '@/core/hooks/timer/use-timer-api';
import {
	activeTeamIdState,
	activeTeamTaskState,
	organizationTeamsState,
	teamTasksState,
	timerStatusState
} from '@/core/stores';
import { ETimeLogSource } from '@/core/types/generics/enums/timer';
import type { ITimerStatus } from '@/core/types/interfaces/timer/timer-status';
import type { TOrganizationTeam } from '@/core/types/schemas';
import type { TTask } from '@/core/types/schemas/task/task.schema';
import { MinTimerFrame, Timer } from './timer';

const mockStartTimer = jest.fn();
const mockStopTimer = jest.fn();

type TChildrenProps = { children?: ReactNode };

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('sonner', () => ({ toast: { warning: jest.fn(), info: jest.fn(), error: jest.fn() } }));
jest.mock('assets/svg', () => ({ TimerPlayIcon: () => null, TimerStopIcon: () => null }), { virtual: true });
jest.mock('@headlessui/react', () => ({ Transition: ({ children }: TChildrenProps) => <>{children}</> }));
// The timers draw the status as useTimerApi exposes it: filtered to the active team's tasks
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
jest.mock('./timer-billable-switch', () => ({ TimerBillableSwitch: () => null }));
jest.mock('../duplicated-components/_progress-bar', () => ({ ProgressBar: () => null }));
jest.mock('../duplicated-components/tooltip', () => ({ Tooltip: ({ children }: TChildrenProps) => <>{children}</> }));

const TEAM_ID = 'team-a';
const team = { id: TEAM_ID, requirePlanToTrack: false, members: [] } as unknown as TOrganizationTeam;
const listedTask = { id: 'task-listed', title: 'Listed task', teams: [{ id: TEAM_ID }] } as unknown as TTask;

const runningLog = (taskId: string, organizationTeamId: string, source: ETimeLogSource) =>
	({ running: true, lastLog: { taskId, organizationTeamId, source, isRunning: true } }) as unknown as ITimerStatus;

/** The desktop app tracks a task of another team: outside the team's task list, so the timer shows Start. */
const desktopRunElsewhere = runningLog('task-of-team-b', 'team-b', ETimeLogSource.DESKTOP);
/** A web timer on one of the team's listed tasks: the timer shows it running. */
const runOnListedTask = runningLog(listedTask.id, TEAM_ID, ETimeLogSource.TEAMS);

function renderTimerWith(timer: ReactNode, timerStatus: ITimerStatus) {
	const store = createStore();
	store.set(organizationTeamsState, [team]);
	store.set(activeTeamIdState, TEAM_ID);
	store.set(teamTasksState, [listedTask]);
	store.set(activeTeamTaskState, listedTask);
	store.set(timerStatusState, timerStatus);
	render(<Provider store={store}>{timer}</Provider>);
}

describe.each([
	['the top bar timer', () => <MinTimerFrame />],
	['the dashboard timer', () => <Timer />]
])('%s', (_name, timer) => {
	it('never stops a desktop run on a task outside the team, and says time is tracked elsewhere', () => {
		renderTimerWith(timer(), desktopRunElsewhere);

		fireEvent.click(screen.getByRole('button', { name: 'Start timer' }));

		expect(mockStopTimer).not.toHaveBeenCalled();
		expect(mockStartTimer).not.toHaveBeenCalled();
		expect(toast.warning).toHaveBeenCalledWith('timer.ALREADY_TRACKING_MESSAGE', { id: ALREADY_TRACKING_TOAST_ID });
	});

	it('still stops a run it shows', () => {
		renderTimerWith(timer(), runOnListedTask);

		fireEvent.click(screen.getByRole('button', { name: 'Stop timer' }));

		expect(mockStopTimer).toHaveBeenCalledTimes(1);
		expect(toast.warning).not.toHaveBeenCalled();
	});
});
