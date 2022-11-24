export interface ITimer {
  id: string;
  createdAt: string;
  updatedAt: string;
  tenantId: string;
  organizationId: string;
  startedAt: string;
  stoppedAt: string;
  logType: string;
  source: string;
  description: any;
  reason: any;
  isBillable: boolean;
  deletedAt: any;
  isRunning: boolean;
  employeeId: string;
  timesheetId: string;
  projectId: any;
  taskId: string | null;
  organizationContactId: any;
  duration: number;
  isEdited: boolean;
}

export interface ITimerStatus {
  duration: number;
  lastLog: ITimer;
  running: boolean;
}

export type ITimerStatusParams = {
  source?: "BROWSER";
  tenantId: string;
  organizationId: string;
};

export type ITimerParams = {
  organizationId: string;
  tenantId: string;
  taskId: string;
  logType: "TRACKED";
  source: "BROWSER";
  tags: any[];
};

export type IToggleTimerParams = ITimerStatusParams & {
  logType?: "TRACKED";
  taskId: string;
};

// ===================== TImesheet ===============

export interface ITasksTimesheet {
  title: string;
  id: string;
  duration: number;
  durationPercentage: number;
}
