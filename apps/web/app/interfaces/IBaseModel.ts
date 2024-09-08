import { IOrganization } from './IOrganization';
import { ITenant } from './ITenant';

export interface IBaseDelete {
	deletedAt?: Date;
}

/**
 * @description
 * An entity ID. Represents a unique identifier as a string.
 *
 * @docsCategory Type Definitions
 * @docsSubcategory Identifiers
 */
export type ID = string;

export interface IBaseEntity extends IBaseDelete {
	id?: string;
	readonly createdAt?: Date;
	readonly updatedAt?: Date;
	isActive?: boolean;
	isArchived?: boolean;
}

export interface IBasePerTenant extends IBaseEntity {
	tenantId?: ITenant['id'];
	tenant?: ITenant;
}

export interface IBasePerTenantEntityMutationInput extends Pick<IBasePerTenant, 'tenantId'>, IBaseEntity {
	tenant?: Pick<ITenant, 'id'>;
}

export interface IBasePerTenantAndOrganizationEntity extends IBasePerTenant {
	organizationId?: IOrganization['id'];
	organization?: IOrganization;
}

export interface IBasePerTenantAndOrganizationEntityMutationInput
	extends Pick<IBasePerTenantAndOrganizationEntity, 'organizationId'>,
		Partial<IBasePerTenantEntityMutationInput> {
	organization?: Pick<IOrganization, 'id'>;
}
