export interface IInviteCreate {
  emailIds: string[];
  projectIds?: string[];
  departmentIds?: string[];
  teamIds: string[];
  organizationContactIds?: string[];
  roleId: string;
  organizationId: string;
  tenantId: string;
  invitedById: string;
  inviteType: string;
  startedWorkOn: string;
  appliedDate?: any;
  invitationExpirationPeriod: string;
}

export interface IInviteRequest {
  name: string;
  email: string;
}
