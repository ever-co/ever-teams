import { ITaskStatus } from "@app/interfaces/ITask";
import React from "react";
import { ClosedTaskIcon } from "./closed-task";
import { CompletedTaskIcon } from "./completed-task";
import { ProgressTaskIcon } from "./progress-task";
import { TestingTaskIcon } from "./testing-task";
import { TodoTaskIcon } from "./todo-task";
import { InReviewTaskIcon } from "./review-task";
import { UnassignedTaskIcon } from "./unassigned-task";

export const statusIcons: { [x in ITaskStatus]: React.ReactElement } = {
  Todo: <TodoTaskIcon />,
  "In Progress": <ProgressTaskIcon />,
  "In Review": <InReviewTaskIcon />,
  "For Testing": <TestingTaskIcon />,
  Completed: <CompletedTaskIcon />,
  Closed: <ClosedTaskIcon />,
  Unassigned: <UnassignedTaskIcon />,
};

export function StatusIcon({ status }: { status: ITaskStatus }) {
  return <>{statusIcons[status] || <></>}</>;
}
