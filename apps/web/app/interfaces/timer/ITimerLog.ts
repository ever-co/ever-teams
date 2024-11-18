import { ITeamTask } from "../ITask";

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
    status: string;
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
    startedAt: string;
    stoppedAt: string;
    editedAt: string | null;
    logType: "TRACKED" | "MANUAL";
    source: "WEB_TIMER" | "MOBILE_APP" | "DESKTOP_APP";
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
