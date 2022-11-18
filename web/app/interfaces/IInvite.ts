export interface IInviteCreate {
  emailIds: string[];
  projectIds?: string[];
  departmentIds?: string[];
  organizationContactIds?: string[];
  roleId: string;
  organizationId: string;
  tenantId: string;
  invitedById: string;
  inviteType: string;
  startedWorkOn: string;
  appliedDate?: any;
  teams?: string[];
  invitationExpirationPeriod: string;
}

export interface IInviteRequest {
  name: string;
  email: string;
}
