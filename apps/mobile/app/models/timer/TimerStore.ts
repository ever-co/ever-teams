import { Instance, SnapshotOut, types } from "mobx-state-tree"
import { ITimerParams, ITimerStatusParams } from "../../services/interfaces/ITimer"
import { getTimerStatusRequest, startTimerRequest, stopTimerRequest } from "../../services/requests/timer"

export const TimerStoreModel = types
    .model("TimerStore")
    .props({
        timerStatusState: types.optional(types.frozen(), {}),
        timerStatusFetchingState: types.optional(types.boolean, false),
        timeCounterState: types.optional(types.number, 0),
        timeCounterIntervalState: types.optional(types.frozen(),{}),
        canRunTimer: types.optional(types.boolean, false),
        localTimerStatusState:types.optional(types.frozen(),{})
    })
    .actions((store) => ({
        async startTimer(parms: ITimerParams, bearer_token: string) {
            const response = await startTimerRequest(parms, bearer_token)
            console.log(response)
        },
        async stopTimer(parms: ITimerParams, bearer_token: string) {
            const response = await stopTimerRequest(parms, bearer_token)
            return response;
        },
        async getTimerStatus({ source, tenantId, organizationId }: ITimerStatusParams, bearer_token: string) {
            const status = await getTimerStatusRequest({ source, tenantId, organizationId }, bearer_token);
            this.setTimerStatus(status)
            return status;
        },
        setTimerStatus(value: any) {
            store.timerStatusState = value
        },
        setTimerStatusFetching(value: any) {
            store.timerStatusFetchingState = value
        },
        setTimerCounterState(value: number) {
            store.timeCounterState = value
        },
        setTimerCounterIntervalState(value: any) {
            store.timeCounterIntervalState = value
        },
        setCanRunTimer(value: boolean) {
            store.canRunTimer = value
        },
        setLocalTimerStatusState(value:any){
            store.localTimerStatusState=value;
            console.log("Time store:"+JSON.stringify(value))
        }
    }))

export interface TimerStore extends Instance<typeof TimerStoreModel> { }
export interface TimerStoreSnapshot extends SnapshotOut<typeof TimerStoreModel> { }

