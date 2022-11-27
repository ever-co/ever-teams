import { IOrganizationTeam } from "./IOrganizationTeam";
import { IUser } from "./IUserData";

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
  dueDate: string;
  projectId: string;
  creatorId: string;
  organizationSprintId: any;
  project: Project;
  tags: Tag[];
  organizationSprint: any;
  members: Member[];
  teams: Pick<
    IOrganizationTeam,
    "id" | "createdAt" | "name" | "organizationId" | "tenantId" | "updatedAt"
  >[];
  creator: Creator;
  taskNumber: string;
}

interface Member {
  id: string;
  createdAt: string;
  updatedAt: string;
  tenantId: string;
  organizationId: string;
  valueDate: any;
  isActive: boolean;
  short_description: any;
  description: any;
  startedWorkOn: string;
  endWork: any;
  payPeriod: string;
  billRateValue: number;
  billRateCurrency: string;
  reWeeklyLimit: number;
  offerDate: any;
  acceptDate: any;
  rejectDate: any;
  employeeLevel: any;
  anonymousBonus: any;
  averageIncome: any;
  averageBonus: any;
  totalWorkHours: any;
  averageExpenses: any;
  show_anonymous_bonus: any;
  show_average_bonus: any;
  show_average_expenses: any;
  show_average_income: any;
  show_billrate: any;
  show_payperiod: any;
  show_start_work_on: any;
  isJobSearchActive: any;
  linkedInUrl: any;
  facebookUrl: any;
  instagramUrl: any;
  twitterUrl: any;
  githubUrl: any;
  gitlabUrl: any;
  upworkUrl: any;
  stackoverflowUrl: any;
  isVerified: any;
  isVetted: any;
  totalJobs: any;
  jobSuccess: any;
  profile_link: string;
  isTrackingEnabled: boolean;
  userId: string;
  contactId: any;
  organizationPositionId: any;
  user: IUser;
  fullName: string;
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
