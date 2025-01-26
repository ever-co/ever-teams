import { ITeamTask, TimesheetStatus } from "../ITask";
import { TimeLogType, TimerSource } from "../ITimer";

interface BaseEntity {
    id: string;
    isActive: boolean;
    isArchived: boolean;
    tenantId: string;
    organizationId: string;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
    archivedAt: string | null;
}

interface ImageEntity {
    imageUrl: string | null;
    image: string | null;
}

interface User extends BaseEntity {
    firstName: string;
    lastName: string;
    name: string;
    imageUrl: string | null;
    image: string | null;
}

interface Employee extends BaseEntity {
    isOnline: boolean;
    isAway: boolean;
    user: User;
    fullName: string;
}

interface TaskStatus extends BaseEntity {
    name: string;
    value: string;
    description: string;
    order: number;
    icon: string;
    color: string;
    isSystem: boolean;
    isCollapsed: boolean;
    isDefault: boolean;
    isTodo: boolean;
    isInProgress: boolean;
    isDone: boolean;
    projectId: string | null;
    organizationTeamId: string | null;
    fullIconUrl: string;
}

interface Task extends ITeamTask {
    taskStatus: TaskStatus | null,
    number: number;
    description: string;
    startDate: string | null;
}

interface Timesheet extends BaseEntity {
    duration: number;
    keyboard: number;
    mouse: number;
    overall: number;
    startedAt: string;
    stoppedAt: string;
    approvedAt: string | null;
    submittedAt: string | null;
    lockedAt: string | null;
    editedAt: string | null;
    isBilled: boolean;
    status: TimesheetStatus;
    employeeId: string;
    approvedById: string | null;
    isEdited: boolean;
}

interface Project extends BaseEntity, ImageEntity {
    name: string;
    membersCount: number;
}

interface OrganizationContact extends BaseEntity, ImageEntity {
    name: string;
}

export interface TimesheetLog extends BaseEntity {
    startedAt: string | Date;
    stoppedAt: string | Date;
    editedAt: string | null;
    logType: TimeLogType.MANUAL;
    source: TimerSource.BROWSER;
    description: string;
    reason: string | null;
    isBillable: boolean;
    isRunning: boolean;
    version: string | null;
    employeeId: string;
    timesheetId: string;
    projectId: string;
    taskId: string;
    organizationContactId: string;
    organizationTeamId: string | null;
    project: Project;
    task: Task;
    organizationContact: OrganizationContact;
    employee: Employee;
    timesheet: Timesheet,
    duration: number;
    isEdited: boolean;
}

export interface UpdateTimesheetStatus extends BaseEntity {
    duration: number;
    keyboard: number;
    mouse: number;
    overall: number;
    startedAt: string | Date;
    stoppedAt: string | Date;
    approvedAt: string | null;
    submittedAt: string | null;
    lockedAt: string | null;
    editedAt: string | null;
    isBilled: boolean;
    status:
    | "DRAFT"
    | "PENDING"
    | "IN REVIEW"
    | "DENIED"
    | "APPROVED";
    employeeId: string;
    approvedById: string | null;
    employee: Employee;
    isEdited: boolean;
}

export interface UpdateTimesheet extends Pick<
    Partial<TimesheetLog>,
    | 'id'
    | 'reason'
    | 'organizationContactId'
    | 'description'
    | 'organizationTeamId'
    | 'projectId'
    | 'taskId'
    | 'employeeId'
    | 'organizationId'
    | 'tenantId'
    | 'logType'
    | 'source'
>,
    Pick<
        TimesheetLog,
        | 'startedAt'
        | 'stoppedAt'
    > {
    isBillable: boolean;
}

export interface ITimerValue {
    TRACKED: number;
    MANUAL: number;
    IDLE: number;
    RESUMED: number;
}

export interface ITimerDailyLog {
    date: string;
    value: ITimerValue;
}

export interface ITimeLogReportDailyChartProps {
    activityLevel: {
        start: number;
        end: number;
    };
    start: number;
    end: number;
    organizationId: string;
    tenantId: string;
    startDate: string;
    endDate: string;
    timeZone?: string;
    projectIds?: string[],
    employeeIds?: string[],
    logType?: string[],
    teamIds?: string[],
    groupBy?: string;
}

export interface IOrganizationContact {
    id: string;
    name: string;
    imageUrl: string;
    image: string | null;
}

export interface ITimerProject {
    id: string;
    name: string;
    imageUrl: string;
    membersCount: number;
    organizationContact: IOrganizationContact;
    image: string | null;
}

export interface ITimerUser {
    id: string;
    firstName: string;
    lastName: string;
    imageUrl: string;
    image: string | null;
    name: string;
}

export interface ITimerEmployee {
    id: string;
    isOnline: boolean;
    isAway: boolean;
    userId: string;
    user: ITimerUser;
    fullName: string;
}

export interface ITimerTask {
    id: string;
    isActive: boolean;
    isArchived: boolean;
    tenantId: string;
    organizationId: string;
    number: number;
    prefix: string;
    title: string;
    description: string;
    status: string;
    priority: string | null;
    size: string | null;
    issueType: string | null;
    estimate: string | null;
    dueDate: string;
    startDate: string | null;
    resolvedAt: string | null;
    version: string | null;
    taskStatus: string | null;
    taskNumber: string;
}

export interface ITimerTaskLog {
    task: ITimerTask;
    description: string;
    duration: number;
    client: IOrganizationContact;
}

export interface ITimerEmployeeLog {
    employee: ITimerEmployee;
    sum: number;
    tasks: ITimerTaskLog[];
    activity: number;
}

export interface ITimerProjectLog {
    project: ITimerProject;
    employeeLogs: ITimerEmployeeLog[];
}

export interface ITimerLogGrouped {
    date: string;
    logs: ITimerProjectLog[];
}
