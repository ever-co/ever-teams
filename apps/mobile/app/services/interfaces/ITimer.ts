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
  taskId: any;
  organizationContactId: any;
  duration: number;
  isEdited: boolean;
}

export interface ITimerStatus {
  duration: number;
  lastLog: ITimer;
  running: boolean;
}
