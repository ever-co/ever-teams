import { Instance, SnapshotOut, types } from "mobx-state-tree"
import { ITimerParams, ITimerStatus, ITimerStatusParams } from "../../services/interfaces/ITimer"
import { getTimerStatusRequest, startTimerRequest, stopTimerRequest } from "../../services/client/requests/timer"

export const TimerStoreModel = types
    .model("TimerStore")
    .props({
        timerStatus: types.optional(types.frozen(), {}),
        timerStatusFetchingState: types.optional(types.boolean, false),
        timeCounterState: types.optional(types.number, 0),
        timeCounterInterval: types.optional(types.number,0),
        canRunTimer: types.optional(types.boolean, false),
        localTimerStatus:types.optional(types.frozen(),{})
    })
    .actions((store) => ({
        setTimerStatus(value: ITimerStatus) {
            store.timerStatus = value
            console.log("Timer Status:"+JSON.stringify(value))
        },
        setTimerStatusFetching(value: any) {
            store.timerStatusFetchingState = value
        },
        setTimerCounterState(value: number) {
            store.timeCounterState = value
        },
        setTimerCounterIntervalState(value: any) {
            store.timeCounterInterval = value
        },
        setCanRunTimer(value: boolean) {
            store.canRunTimer = value
        },
        setLocalTimerStatus(value:any){
            store.localTimerStatus=value;
        }
    }))

export interface TimerStore extends Instance<typeof TimerStoreModel> { }
export interface TimerStoreSnapshot extends SnapshotOut<typeof TimerStoreModel> { }

