import {
  ITimer,
  ITimerStatus,
  IToggleTimerParams,
} from "@app/interfaces/ITimer";
import api from "../axios";

export function getTimerStatusAPI() {
  return api.get<ITimerStatus>("/timer/status");
}

export function toggleTimerAPI(body: Pick<IToggleTimerParams, "taskId">) {
  return api.post<ITimer>("/timer/status", body);
}
