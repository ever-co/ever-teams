import { canRunTimerForState } from './timer-policy';
import { ETimeLogSource } from '@/core/types/generics/enums/timer';

describe('timer action eligibility', () => {
	it('requires an active task while the Teams timer is stopped', () => {
		expect(
			canRunTimerForState({
				isEmailVerified: true,
				hasActiveTask: false,
				isActiveTaskClosed: false,
				isTimerRunning: false,
				timerSource: undefined
			})
		).toBe(false);
	});

	it('allows an open active task and rejects a closed one', () => {
		const state = {
			isEmailVerified: true,
			hasActiveTask: true,
			isTimerRunning: false,
			timerSource: ETimeLogSource.TEAMS
		};

		expect(canRunTimerForState({ ...state, isActiveTaskClosed: false })).toBe(true);
		expect(canRunTimerForState({ ...state, isActiveTaskClosed: true })).toBe(false);
	});

	it('allows stopping a timer that is actually running from another source without a task', () => {
		expect(
			canRunTimerForState({
				isEmailVerified: true,
				hasActiveTask: false,
				isActiveTaskClosed: false,
				isTimerRunning: true,
				timerSource: ETimeLogSource.DESKTOP
			})
		).toBe(true);
	});
});
