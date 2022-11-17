import {
  ITimer,
  ITimerStatusParams,
  ITimerStatus,
  IToggleTimerParams,
} from "@app/interfaces/ITimer";
import { serverFetch } from "../fetch";

export function getTimerStatusRequest(
  { source = "BROWSER", tenantId }: ITimerStatusParams,
  bearer_token: string
) {
  const params = new URLSearchParams({ source, tenantId });
  return serverFetch<ITimerStatus>({
    path: `/timesheet/timer/status?${params.toString()}`,
    method: "GET",
    bearer_token,
    tenantId,
  });
}

export function startTimerRequest(tenantId: string, bearer_token: string) {
  return serverFetch<ITimer>({
    path: "/timesheet/timer/start",
    method: "POST",
    bearer_token,
    tenantId,
  });
}

export function stopTimerRequest(tenantId: string, bearer_token: string) {
  return serverFetch<ITimer>({
    path: "/timesheet/timer/stop",
    method: "POST",
    bearer_token,
    tenantId,
  });
}

export function toggleTimerRequest(
  {
    source = "BROWSER",
    logType = "TRACKED",
    taskId,
    tenantId,
  }: IToggleTimerParams,
  bearer_token: string
) {
  return serverFetch<ITimer>({
    path: "/timesheet/timer/toggle",
    method: "POST",
    body: {
      source,
      logType,
      taskId,
      tenantId,
    },
    bearer_token,
    tenantId,
  });
}
