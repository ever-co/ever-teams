import { Instance, SnapshotOut, types } from 'mobx-state-tree';
import { AuthenticationStoreModel } from './authentication-store'; // @demo remove-current-line
import { EpisodeStoreModel } from './episodeStore'; // @demo remove-current-line
import { TaskStoreModel } from './task/task-store';
import { TeamStoreModel } from './team/team-store';
import { TimerStoreModel } from './timer/timer-store';

/**
 * A RootStore model.
 */
export const RootStoreModel = types.model('RootStore').props({
	authenticationStore: types.optional(AuthenticationStoreModel, {}), // @demo remove-current-line
	episodeStore: types.optional(EpisodeStoreModel, {}), // @demo remove-current-line
	teamStore: types.optional(TeamStoreModel, {}),
	TaskStore: types.optional(TaskStoreModel, {}),
	TimerStore: types.optional(TimerStoreModel, {})
});

/**
 * The RootStore instance.
 */
export interface RootStore extends Instance<typeof RootStoreModel> {}
/**
 * The data of a RootStore.
 */
export interface RootStoreSnapshot extends SnapshotOut<typeof RootStoreModel> {}
