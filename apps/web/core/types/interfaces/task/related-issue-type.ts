import { IBasePerTenantAndOrganizationEntityModel } from '../global/base-interfaces';
import { IRelationalOrganizationTeam } from '../team/organization-team';
import { IOrganizationProject } from '../project/organization-project';

export interface ITaskRelatedIssueType extends IBasePerTenantAndOrganizationEntityModel, IRelationalOrganizationTeam {
	name: string;
	value: string;
	description?: string;
	icon?: string;
	color?: string;
	isSystem?: boolean;
	fullIconUrl?: string;
	project?: IOrganizationProject;
	projectId?: IOrganizationProject['id'];
}
export interface ITaskRelatedIssueTypeCreate {
	name: string;
	description?: string;
	icon?: string;
	color?: string;
	projectId?: string;
	organizationId?: string;
	tenantId?: string | undefined | null;
	organizationTeamId?: string | undefined | null;
}
