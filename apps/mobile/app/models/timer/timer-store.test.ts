import { getSnapshot, onSnapshot } from 'mobx-state-tree';
import { TimerStoreModel } from './timer-store';

const create = (snapshot: Record<string, unknown>) => TimerStoreModel.create(snapshot as never);

describe('the timer store', () => {
	it('does not change the saved state while the time goes by', () => {
		const store = create({ timerStatus: null });
		const saved = jest.fn();
		const stopWatching = onSnapshot(store, saved);

		store.setTimerCounterState(50);
		store.setTimerCounterState(100);
		store.setTimerSecondsState(1);

		expect(saved).not.toHaveBeenCalled();
		expect(store.timeCounterState).toBe(100);
		expect(store.timerSecondsState).toBe(1);
		stopWatching();
	});

	it('leaves the time gone by out of what it saves', () => {
		const store = create({ timerStatus: null });
		store.setTimerCounterState(1500);

		expect(getSnapshot(store)).not.toHaveProperty('timeCounterState');
		expect(getSnapshot(store)).not.toHaveProperty('timerSecondsState');
	});

	it('still opens a state saved by an earlier version, which held the time gone by', () => {
		const store = create({ timerStatus: null, timeCounterState: 4200, timerSecondsState: 4 });

		expect(store.timeCounterState).toBe(0);
		expect(store.timerSecondsState).toBe(0);
	});
});
