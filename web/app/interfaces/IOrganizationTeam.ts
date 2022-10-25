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
