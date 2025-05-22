import { IOrganization } from './organization/IOrganization';
import { ITag } from './tag/ITag';
import { ITenant } from './tenant/ITenant';
import { IUser } from './user/IUser';

export type ID = string;

export interface IBaseEntityActionByUserModel {
	createdByUser?: IUser;
	createdByUserId?: ID;

	updatedByUser?: IUser;
	updatedByUserId?: ID;

	deletedByUser?: IUser;
	deletedByUserId?: ID;
}

// Common properties for soft delete entities
export interface IBaseSoftDeleteEntityModel {
	deletedAt?: Date; // Indicates if the record is soft deleted
}

// Common properties for entities
export interface IBaseEntityModel extends IBaseEntityActionByUserModel, IBaseSoftDeleteEntityModel {
	id?: ID;

	readonly createdAt?: Date;
	readonly updatedAt?: Date;

	isActive?: boolean;
	isArchived?: boolean;
	archivedAt?: Date;
}

// Common properties for entities associated with a tenant
export interface IBasePerTenantEntityModel extends IBaseEntityModel {
	tenantId?: ID; // Identifier of the associated tenant
	tenant?: ITenant; // Reference to the associated tenant
}

// Common properties for entities associated with both tenant and organization
export interface IBasePerTenantAndOrganizationEntityModel extends IBasePerTenantEntityModel {
	organizationId?: ID; // Identifier of the associated organization
	organization?: IOrganization; // Reference to the associated organization
}

/**
 * Interface for entities that can have tags.
 */
export interface ITaggable {
	tags?: ITag[];
}

export interface IUrlMetaData {
	title?: string;
	description?: string;
	image?: string;
	[x: string]: any;
}
