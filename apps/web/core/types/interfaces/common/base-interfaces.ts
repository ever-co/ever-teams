import { TUser } from '@/core/types/schemas';
import { IOrganization } from '../organization/organization';
import { ITag } from '../tag/tag';
import { ITenant } from '../tenant/tenant';

export type ID = string;

export interface IBaseEntityActionByUserModel {
	createdByUser?: TUser;
	createdByUserId?: ID;

	updatedByUser?: TUser;
	updatedByUserId?: ID;

	deletedByUser?: TUser;
	deletedByUserId?: ID;
}

// Common properties for soft delete entities
export interface IBaseSoftDeleteEntityModel {
	deletedAt?: Date; // Indicates if the record is soft deleted
}

// Common properties for entities
export interface IBaseEntity extends IBaseEntityActionByUserModel, IBaseSoftDeleteEntityModel {
	id: ID;

	readonly createdAt?: Date;
	readonly updatedAt?: Date;

	isActive?: boolean;
	isArchived?: boolean;
	archivedAt?: Date;
}

// Common properties for entities associated with a tenant
export interface IBasePerTenantEntityModel extends IBaseEntity {
	tenantId?: ID; // Identifier of the associated tenant
	tenant?: ITenant; // Reference to the associated tenant
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

export interface IBasePerTenantEntityMutationInput extends Pick<IBasePerTenantEntityModel, 'tenantId'>, IBaseEntity {
	tenant?: Pick<ITenant, 'id'>;
}

export interface IBasePerTenantAndOrganizationEntityModel extends IBasePerTenantEntityModel {
	organizationId?: IOrganization['id'];
	organization?: IOrganization;
}

export interface IBasePerTenantAndOrganizationEntityMutationInput
	extends Pick<IBasePerTenantAndOrganizationEntityModel, 'organizationId'>,
		Partial<IBasePerTenantEntityMutationInput> {
	organization?: Pick<IOrganization, 'id'>;
}
