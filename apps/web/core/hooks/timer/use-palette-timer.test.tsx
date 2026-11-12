/** @jest-environment jsdom */

import { type PropsWithChildren } from 'react';
import { renderHook } from '@testing-library/react';
import { createStore, Provider } from 'jotai';

import { activeTeamIdState, timerStatusFetchingState, timerStatusState } from '@/core/stores';
import type { ITimerStatus } from '@/core/types/interfaces/timer/timer-status';

const ACTIVE_TEAM = 'team-1';
const OTHER_TEAM = 'team-2';

const STOPPED = { running: false } as never as ITimerStatus;
/** A timer running for the team given. The timer shows it only while that team is the active one. */
const runOf = (teamId: string) =>
	({ running: true, lastLog: { id: 'log-1', organizationTeamId: teamId } }) as never as ITimerStatus;

/** The timer status as the API gave it, a run of another team included: what the plan status hands out. */
let mockRawTimerStatus: ITimerStatus | null = null;

jest.mock('@/core/hooks/timer/use-timer-plan-status', () => ({
	useTimerPlanStatus: () => ({ canRunTimer: true, timerStatus: mockRawTimerStatus })
}));

import { usePaletteTimer } from './use-palette-timer';

/** The palette's timer commands in the active team, with the timer status given. */
function paletteTimerWith(timerStatus: ITimerStatus | null, isTimerRequestPending = false) {
	const store = createStore();
	store.set(activeTeamIdState, ACTIVE_TEAM);
	store.set(timerStatusState, timerStatus);
	store.set(timerStatusFetchingState, isTimerRequestPending);
	mockRawTimerStatus = timerStatus;
	const wrapper = ({ children }: PropsWithChildren) => <Provider store={store}>{children}</Provider>;
	const { result } = renderHook(() => usePaletteTimer(), { wrapper });
	return result.current;
}

describe('the stop the palette offers', () => {
	it('is offered for a run the timer shows', () => {
		expect(paletteTimerWith(runOf(ACTIVE_TEAM)).canStop).toBe(true);
	});

	it('is not offered over a run the timer does not show: its button offers Start there', () => {
		expect(paletteTimerWith(runOf(OTHER_TEAM)).canStop).toBe(false);
	});

	it('is not offered while no timer runs', () => {
		expect(paletteTimerWith(STOPPED).canStop).toBe(false);
	});
});

describe('the palette while a timer request is in flight', () => {
	it('offers neither a start nor a stop, as the buttons of the timer are disabled then', () => {
		const paletteTimer = paletteTimerWith(runOf(ACTIVE_TEAM), true);

		expect(paletteTimer.canStart).toBe(false);
		expect(paletteTimer.canStop).toBe(false);
	});
});
