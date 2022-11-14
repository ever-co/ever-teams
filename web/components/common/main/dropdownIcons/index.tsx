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
  Todo: <TodoTaskIcon color="#3d9a6c" />,
  "In Progress": <ProgressTaskIcon color="#24a9d5" />,
  "In Review": <InReviewTaskIcon color="#0a6bd9" />,
  "For Testing": <TestingTaskIcon color="#736efb" />,
  Completed: <CompletedTaskIcon color="#a371f7" />,
  Closed: <ClosedTaskIcon color="#9ea7ad" />,
  Unassigned: <UnassignedTaskIcon color="#5f5f5f" />,
};

export function StatusIcon({ status }: { status: ITaskStatus }) {
  return <>{statusIcons[status] || ""}</>;
}

export function BadgedTaskStatus({ status }: { status: ITaskStatus }) {
  const node = statusIcons[status];

  return (
    <div
      style={{
        background: (node.props.color || "") + "46",
        color: node.props.color,
      }}
      className={`px-2 py-1 rounded-2xl text-xs flex items-center justify-center`}
    >
      {node} {status}
    </div>
  );
}
