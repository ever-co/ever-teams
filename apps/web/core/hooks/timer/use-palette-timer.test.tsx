/** @jest-environment jsdom */
/**
 * The palette offers Stop only for the run the timer shows: a run of another team, hidden by the team filter (#5126),
 * would only meet the "already tracking" warning.
 */
import { renderHook } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import React from 'react';

const mockTeamRun = { running: false };
jest.mock('@/core/stores/timer/team-timer-status', () => {
	const { atom: makeAtom } = jest.requireActual('jotai');
	return { teamTimerStatusState: makeAtom(() => ({ running: mockTeamRun.running })) };
});
jest.mock('@/core/stores', () => {
	const { atom: makeAtom } = jest.requireActual('jotai');
	return { timerStatusFetchingState: makeAtom(false) };
});
// The raw status says a run goes on: the palette must not read it
jest.mock('@/core/hooks/timer/use-timer-plan-status', () => ({
	useTimerPlanStatus: () => ({ canRunTimer: true, timerStatus: { running: true } })
}));
jest.mock('@/core/hooks/common/use-modal', () => ({ useModal: () => ({ openModal: jest.fn() }) }));

import { usePaletteTimer } from './use-palette-timer';

function render() {
	const store = createStore();
	const wrapper = ({ children }: { children: React.ReactNode }) => <Provider store={store}>{children}</Provider>;
	return renderHook(() => usePaletteTimer(), { wrapper }).result;
}

describe('usePaletteTimer', () => {
	it('offers no Stop for a run the timer hides, and Stop for the run it shows', () => {
		mockTeamRun.running = false;
		expect(render().current.canStop).toBe(false);

		mockTeamRun.running = true;
		expect(render().current.canStop).toBe(true);
	});
});
