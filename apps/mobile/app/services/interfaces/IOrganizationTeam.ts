import { types } from "mobx-state-tree";

export interface IOrganizationTeamCreate {
  name: string;
  memberIds?: any[];
  managerIds?: any[];
  tags?: any[];
  organizationId: string;
  tenantId: string;
}

export interface IOrganizationTeamEmployeeUpdate {
  organizationId: string,
  organizationTeamId: string,
  isTrackingEnabled: boolean
}

export interface IOrganizationTeam {
  tenantId: string;
  organizationId: string;
  name: string;
  tenant: {
    id: string;
  };
  members: any[];
  tags: any[];
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface IOrganizationTeamList {
  id: string;
  createdAt: string;
  updatedAt: string;
  tenantId: string;
  organizationId: string;
  name: string;
  managerIds: string[];
  members: OT_Member[];
}

export interface OT_Member {
  id: string;
  createdAt: string;
  updatedAt: string;
  tenantId: any;
  organizationId: any;
  organizationTeamId: string;
  employeeId: string;
  isTrackingEnabled:boolean;
  roleId?: string;
  role?: OT_Role;
  employee: OT_Employee;
}

interface OT_Role {
  id: string;
  createdAt: string;
  updatedAt: string;
  tenantId: string;
  name: string;
  isSystem: boolean;
}

interface OT_Employee {
  id: string;
  createdAt: string;
  updatedAt: string;
  tenantId: string;
  organizationId: string;
  valueDate: any;
  isActive: boolean;
  short_description: any;
  description: any;
  startedWorkOn?: string;
  endWork: any;
  payPeriod: string;
  billRateValue: number;
  billRateCurrency: string;
  reWeeklyLimit: number;
  offerDate: any;
  acceptDate: any;
  rejectDate: any;
  employeeLevel: string;
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
  user: OT_User;
  fullName: string;
}

interface OT_User {
  id: string;
  createdAt: string;
  updatedAt: string;
  tenantId: string;
  thirdPartyId: any;
  firstName: string;
  lastName: string;
  email: string;
  username: any;
  imageUrl: string;
  preferredLanguage: string;
  preferredComponentLayout: string;
  isActive: boolean;
  roleId: string;
  name: string;
  employeeId: any;
}



export const typeTeam = types.model({
  tenantId: types.optional(types.string, ""),
  organizationId: types.optional(types.string, ""),
  name: types.optional(types.string, ""),
  tenant: types.model({
    id: types.optional(types.string, ""),
  }),
  members: types.array(types.optional(types.string, "")),
  tags: types.array(types.optional(types.string, "")),
  id: types.optional(types.string, ""),
  createdAt: types.optional(types.string, ""),
  updatedAt: types.optional(types.string, ""),
})
