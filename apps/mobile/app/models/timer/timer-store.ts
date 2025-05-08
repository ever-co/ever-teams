import { Instance, SnapshotOut, types } from 'mobx-state-tree';
import { ITimerStatus } from '../../services/interfaces/ITimer';

export const TimerStoreModel = types
	.model('TimerStore')
	.props({
		timerStatus: types.frozen<ITimerStatus>(),
		timerStatusFetchingState: types.optional(types.boolean, false),
		timeCounterState: types.optional(types.number, 0),
		timerSecondsState: types.optional(types.number, 0),
		timeCounterInterval: types.optional(types.number, 0),
		canRunTimer: types.optional(types.boolean, false),
		localTimerStatus: types.optional(types.frozen(), { running: false })
	})
	.actions((store) => ({
		setTimerStatus(value: ITimerStatus) {
			store.timerStatus = value;
		},
		setTimerStatusFetching(value: any) {
			store.timerStatusFetchingState = value;
		},
		setTimerCounterState(value: number) {
			store.timeCounterState = value;
		},
		setTimerSecondsState(value: number) {
			store.timerSecondsState = value;
		},
		setTimerCounterIntervalState(value: any) {
			store.timeCounterInterval = value;
		},
		setCanRunTimer(value: boolean) {
			store.canRunTimer = value;
		},
		setLocalTimerStatus(value: any) {
			store.localTimerStatus = value;
		}
	}));

export interface TimerStore extends Instance<typeof TimerStoreModel> {}
export interface TimerStoreSnapshot extends SnapshotOut<typeof TimerStoreModel> {}
