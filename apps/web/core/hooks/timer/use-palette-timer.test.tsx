/** @jest-environment jsdom */
/**
 * The palette offers Stop only for the run the timer shows: a run of another team is hidden by the team filter of
 * the timer status, and the timer's Stop only warns about it.
 */
import React from 'react';
import { renderHook } from '@testing-library/react';
import { createStore, Provider } from 'jotai';

import { activeTeamTaskState, teamTasksState } from '@/core/stores/teams/team-tasks';
import { timerStatusState } from '@/core/stores/timer/timer';
import type { ITimerStatus } from '@/core/types/interfaces/timer/timer-status';
import type { TTask } from '@/core/types/schemas/task/task.schema';

// The real hook reads the raw status too; plans and the account are not what this test is about
jest.mock('@/core/hooks/timer/use-timer-plan-status', () => {
	const { useAtomValue } = jest.requireActual('jotai');
	const { timerStatusState: rawTimerStatusState } = jest.requireActual('@/core/stores/timer/timer');
	return {
		useTimerPlanStatus: () => ({ canRunTimer: true, timerStatus: useAtomValue(rawTimerStatusState) })
	};
});

import { usePaletteTimer } from './use-palette-timer';

const ACTIVE_TASK = { id: 'task-active' } as unknown as TTask;
const runningOn = (taskId: string) => ({ running: true, lastLog: { taskId } }) as unknown as ITimerStatus;

function paletteTimerWith(timerStatus: ITimerStatus) {
	const store = createStore();
	store.set(timerStatusState, timerStatus);
	store.set(teamTasksState, [ACTIVE_TASK]);
	store.set(activeTeamTaskState, ACTIVE_TASK);
	const wrapper = ({ children }: { children: React.ReactNode }) => <Provider store={store}>{children}</Provider>;
	return renderHook(() => usePaletteTimer(), { wrapper }).result.current;
}

describe('usePaletteTimer', () => {
	it('offers Stop for the run the timer shows', () => {
		expect(paletteTimerWith(runningOn(ACTIVE_TASK.id)).canStop).toBe(true);
	});

	it('offers no Stop for a run of another team, which the timer hides', () => {
		expect(paletteTimerWith(runningOn('task-of-another-team')).canStop).toBe(false);
	});
});
