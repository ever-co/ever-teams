import { IEmployee } from "./IEmployee";
import { IOrganizationTeam } from "./IOrganizationTeam";

export interface ITeamTask {
  id: string;
  createdAt: string;
  updatedAt: string;
  tenantId: string;
  organizationId: string;
  number: number;
  title: string;
  description: string;
  status: ITaskStatus;
  estimate: null | number;
  estimateDays?: number;
  estimateHours?: number;
  estimateMinutes?: number;
  dueDate: string;
  projectId: string;
  creatorId: string;
  organizationSprintId: any;
  project: Project;
  tags: Tag[];
  organizationSprint: any;
  members: IEmployee[];
  teams: Pick<
    IOrganizationTeam,
    "id" | "createdAt" | "name" | "organizationId" | "tenantId" | "updatedAt"
  >[];
  creator: Creator;
  taskNumber: string;
}

interface Project {
  id: string;
  createdAt: string;
  updatedAt: string;
  tenantId: string;
  organizationId: string;
  name: string;
  startDate: any;
  endDate: any;
  billing: any;
  currency: any;
  public: any;
  owner: any;
  taskListType: string;
  code: any;
  description: any;
  color: any;
  billable: any;
  billingFlat: any;
  openSource: any;
  projectUrl: any;
  openSourceProjectUrl: any;
  budget: number;
  budgetType: string;
  membersCount: number;
  imageUrl: string;
  organizationContactId: string;
}

interface Tag {
  id: string;
  createdAt: string;
  updatedAt: string;
  tenantId: string;
  organizationId: string;
  name: string;
  description: string;
  color: string;
  isSystem: boolean;
}

interface Creator {
  id: string;
  createdAt: string;
  updatedAt: string;
  tenantId: string;
  thirdPartyId: any;
  firstName: string;
  lastName: string;
  email: string;
  username: any;
  hash: string;
  refreshToken: any;
  imageUrl: string;
  preferredLanguage: string;
  preferredComponentLayout: string;
  isActive: boolean;
  roleId: string;
  name: string;
  employeeId: any;
}

export type ITaskStatus =
  | "Todo"
  | "In Progress"
  | "For Testing"
  | "Completed"
  | "Closed"
  | "In Review"
  | "Unassigned";

export interface ICreateTask {
  title: string;
  status: ITaskStatus;
  members?: [];
  estimateDays?: number;
  estimateHours?: string;
  estimateMinutes?: string;
  dueDate?: string;
  description: string;
  tags: { id: string }[];
  teams: { id: string }[];
  estimate: number;
  organizationId: string;
  tenantId: string;
}
