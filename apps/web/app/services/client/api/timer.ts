import { ITimerStatus, IToggleTimerParams } from "@app/interfaces/ITimer";
import api from "../axios";

export function getTimerStatusAPI() {
  return api.get<ITimerStatus>("/timer/status");
}

export function toggleTimerAPI(body: Pick<IToggleTimerParams, "taskId">) {
  return api.post<ITimerStatus>("/timer/toggle", body);
}

export function startTimerAPI() {
  return api.post<ITimerStatus>("/timer/start");
}

export function stopTimerAPI() {
  return api.post<ITimerStatus>("/timer/stop");
}
