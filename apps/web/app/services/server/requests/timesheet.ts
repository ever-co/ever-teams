import { ITasksTimesheet } from "@app/interfaces/ITimer";
import { serverFetch } from "../fetch";

type TTasksTimesheetStatisticsParams = {};
export function tasksTimesheetStatisticsRequest(
  params: TTasksTimesheetStatisticsParams,
  bearer_token: string
) {
  const queries = new URLSearchParams(params);

  return serverFetch<ITasksTimesheet>({
    path: `/timesheet/statistics/tasks?${queries.toString()}`,
    method: "GET",
    bearer_token,
  });
}
