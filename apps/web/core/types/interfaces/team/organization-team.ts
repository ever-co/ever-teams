import { TImageAsset, TOrganizationTeamEmployee } from '../../schemas';
import { TTask } from '../../schemas/task/task.schema';
import { IBasePerTenantAndOrganizationEntityModel, ID, ITaggable } from '../common/base-interfaces';
import { IRelationalImageAsset } from '../common/image-asset';
import { IOrganizationProject } from '../project/organization-project';

// Base interface for common properties
interface IBaseTeamProperties extends IBasePerTenantAndOrganizationEntityModel, IRelationalImageAsset, ITaggable {
	name: string;
	color?: string | null;
	emoji?: string | null;
	teamSize?: string | null;
	logo?: string | null;
	prefix?: string | null;
	shareProfileView?: boolean | null; // Default is true
	requirePlanToTrack?: boolean | null; // Default is false
	public?: boolean | null;
	profile_link?: string | null;
}

// Interface for team members and related entities
interface ITeamAssociations {
	members?: TOrganizationTeamEmployee[];
	managers?: TOrganizationTeamEmployee[];
	projects?: IOrganizationProject[];
	// modules?: IOrganizationProjectModule[];
	// assignedComments?: IComment[];
	tasks?: TTask[];
}

// Main Organization Team interface
export interface IOrganizationTeam extends IBaseTeamProperties, ITeamAssociations {}

export interface IRelationalOrganizationTeam {
	organizationTeam?: IOrganizationTeam | null;
	organizationTeamId?: ID | null;
}
export interface IOrganizationTeamCreate {
	name: string;
	color?: string;
	emoji?: string;
	teamSize?: string;
	memberIds?: string[];
	managerIds?: string[];
	tags?: any[];
	organizationId?: string;
	tenantId?: string;
	shareProfileView?: boolean;
	requirePlanToTrack?: boolean;
	public?: boolean;
	imageId?: string | null;
	image?: TImageAsset | null;
	projects?: IOrganizationProject[];
}
export type IOrganizationTeamUpdate = IOrganizationTeamCreate & { id: string };

export type ITeamRequestParams = {
	organizationId: string;
	tenantId: string;
	relations?: string[];
};
