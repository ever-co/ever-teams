import { IBasePerTenantAndOrganizationEntityModel, ID, ITaggable } from '../global/base-interfaces';
import { IImageAsset, IRelationalImageAsset } from '../global/image-asset';
import { IOrganizationProject } from '../project/organization-project';
import { ITask } from '../task/task';
import { IOrganizationTeamEmployee } from './organization-team-employee';

// Base interface for common properties
interface IBaseTeamProperties extends IBasePerTenantAndOrganizationEntityModel, IRelationalImageAsset, ITaggable {
	name: string;
	color?: string;
	emoji?: string;
	teamSize?: string;
	logo?: string;
	prefix?: string;
	shareProfileView?: boolean; // Default is true
	requirePlanToTrack?: boolean; // Default is false
	public?: boolean;
	profile_link?: string;
}

// Interface for team members and related entities
interface ITeamAssociations {
	members?: IOrganizationTeamEmployee[];
	managers?: IOrganizationTeamEmployee[];
	projects?: IOrganizationProject[];
	// modules?: IOrganizationProjectModule[];
	// assignedComments?: IComment[];
	tasks?: ITask[];
}

// Main Organization Team interface
export interface IOrganizationTeam extends IBaseTeamProperties, ITeamAssociations {}

export interface IRelationalOrganizationTeam {
	organizationTeam?: IOrganizationTeam;
	organizationTeamId?: ID;
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
	image?: IImageAsset | null;
	projects?: IOrganizationProject[];
}
export type IOrganizationTeamUpdate = IOrganizationTeamCreate & { id: string };

export type ITeamRequestParams = {
	organizationId: string;
	tenantId: string;
	relations?: string[];
};
export interface IRelationalOrganizationTeam {
	organizationTeam?: IOrganizationTeam;
	organizationTeamId?: ID;
}
