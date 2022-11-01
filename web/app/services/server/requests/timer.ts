import { ITimer, ITimerStatus } from "@app/interfaces/ITimer";
import { serverFetch } from "../fetch";

type TimerStatusRequestParams = {
  source?: "BROWSER";
  tenantId: string;
};

export function getTimerStatusRequest(
  { source = "BROWSER", tenantId }: TimerStatusRequestParams,
  bearer_token: string
) {
  const params = new URLSearchParams({ source, tenantId });
  return serverFetch<ITimerStatus>({
    path: `/timesheet/timer/status?${params.toString()}`,
    method: "GET",
    bearer_token,
    init: {
      headers: {
        "tenant-id": tenantId,
      },
    },
  });
}

export function startTimerRequest(tenantId: string, bearer_token: string) {
  return serverFetch<ITimer>({
    path: "/timesheet/timer/start",
    method: "POST",
    bearer_token,
    init: {
      headers: {
        "tenant-id": tenantId,
      },
    },
  });
}

export function stopTimerRequest(tenantId: string, bearer_token: string) {
  return serverFetch<ITimer>({
    path: "/timesheet/timer/stop",
    method: "POST",
    bearer_token,
    init: {
      headers: {
        "tenant-id": tenantId,
      },
    },
  });
}
