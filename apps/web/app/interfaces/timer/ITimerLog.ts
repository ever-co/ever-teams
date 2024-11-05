interface Project {
    id: string;
    name: string;
    imageUrl: string;
    membersCount: number;
    image: string | null;
}

interface Task {
    id: string;
    title: string;
    estimate: number | null;
    taskNumber: string;
}

interface OrganizationContact {
    id: string;
    name: string;
    imageUrl: string;
    image: string | null;
}

interface User {
    id: string;
    firstName: string;
    lastName: string;
    imageUrl: string;
    image: string | null;
    name: string;
}

interface Employee {
    id: string;
    isOnline: boolean;
    isAway: boolean;
    user: User;
    fullName: string;
}

export interface ITimeSheet {
    deletedAt: string | null;
    id: string;
    createdAt: string;
    updatedAt: string;
    isActive: boolean;
    isArchived: boolean;
    archivedAt: string | null;
    tenantId: string;
    organizationId: string;
    startedAt: string;
    stoppedAt: string;
    editedAt: string | null;
    logType: string;
    source: string;
    description: string;
    reason: string | null;
    isBillable: boolean;
    isRunning: boolean;
    version: number | null;
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
    duration: number;
    isEdited: boolean;
}
