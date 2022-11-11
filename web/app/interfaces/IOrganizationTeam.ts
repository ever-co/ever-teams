import { IEmployee } from "./IEmployee";

export interface IOrganizationTeamCreate {
  name: string;
  members?: any[];
  tags?: any[];
  managers?: any[];
  organizationId: string;
  tenantId: string;
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
  members: OT_Member[];
}

interface OT_Member {
  id: string;
  createdAt: string;
  updatedAt: string;
  tenantId: any;
  organizationId: any;
  organizationTeamId: string;
  employeeId: string;
  roleId?: string;
  role?: OT_Role;
  employee: IEmployee;
}

interface OT_Role {
  id: string;
  createdAt: string;
  updatedAt: string;
  tenantId: string;
  name: string;
  isSystem: boolean;
}
