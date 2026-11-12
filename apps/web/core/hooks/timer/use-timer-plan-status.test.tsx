/** @jest-environment jsdom */

/**
 * The timer's start/stop button acts on what the timer shows (#5122): after a reload, a Teams run of the active team
 * on a task of another project has no active task holding it, and the button still stops it. A run of another team
 * stays out of reach, as before.
 */
import { renderHook } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import type { ReactNode } from 'react';

import { activeTeamIdState, activeTeamTaskState, teamTasksState, timerStatusState } from '@/core/stores';
import { ETimeLogSource } from '@/core/types/generics/enums/timer';
import type { ITimerStatus } from '@/core/types/interfaces/timer/timer-status';
import type { TTask } from '@/core/types/schemas/task/task.schema';
import { useTimerPlanStatus } from './use-timer-plan-status';

jest.mock('@/core/hooks/auth/use-authenticate-user', () => ({
	useAuthenticateUser: () => ({ user: { isEmailVerified: true } })
}));
jest.mock('@/core/hooks/daily-plans/use-my-daily-plans', () => ({
	useMyDailyPlans: () => ({ myDailyPlans: { items: [] } })
}));

const TEAM_ID = 'team-a';
const listedTask = { id: 'task-of-the-listed-project', teams: [{ id: TEAM_ID }] } as unknown as TTask;

/** A Teams run on a task of another project than the listed one, its log naming the team it was started for. */
const teamsRunFor = (teamId: string) =>
	({
		running: true,
		lastLog: {
			taskId: 'task-of-another-project',
			organizationTeamId: teamId,
			source: ETimeLogSource.TEAMS,
			isRunning: true
		}
	}) as unknown as ITimerStatus;

/** `canRunTimer` after a reload: the team's list holds the listed project's tasks, and no active task is set. */
function canRunTimerAfterReloadWith(timerStatus: ITimerStatus) {
	const store = createStore();
	store.set(activeTeamIdState, TEAM_ID);
	store.set(teamTasksState, [listedTask]);
	store.set(activeTeamTaskState, null);
	store.set(timerStatusState, timerStatus);
	const wrapper = ({ children }: { children: ReactNode }) => <Provider store={store}>{children}</Provider>;
	return renderHook(() => useTimerPlanStatus(), { wrapper }).result.current.canRunTimer;
}

describe('useTimerPlanStatus canRunTimer with no active task after a reload', () => {
	it("lets the timer stop the team's run on another project's task", () => {
		expect(canRunTimerAfterReloadWith(teamsRunFor(TEAM_ID))).toBe(true);
	});

	it("keeps another team's run out of reach", () => {
		expect(canRunTimerAfterReloadWith(teamsRunFor('team-b'))).toBe(false);
	});
});
