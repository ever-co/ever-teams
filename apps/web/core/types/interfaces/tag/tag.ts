import { IBasePerTenantAndOrganizationEntityModel, ID, ITaggable } from '../common/base-interfaces';
import { ICustomFieldsObject } from '../organization/organization';
import { IRelationalOrganizationTeam } from '../team/organization-team';

export interface ITag extends IBasePerTenantAndOrganizationEntityModel, IRelationalOrganizationTeam {
	name: string;
	color: string;
	textColor?: string;
	icon?: string;
	description?: string;
	isSystem?: boolean;
	tagTypeId?: ID;
	tagType?: ITagType;
	tagTypeName?: string;
	fix_relational_custom_fields?: any;
	customFields?: ICustomFieldsObject | null;
	fullIconUrl?: Record<string, any> | null;
	// Counter fields
	candidate_counter?: number;
	employee_counter?: number;
	employee_level_counter?: number;
	equipment_counter?: number;
	event_type_counter?: number;
	expense_counter?: number;
	income_counter?: number;
	integration_counter?: number;
	invoice_counter?: number;
	merchant_counter?: number;
	organization_counter?: number;
	organization_contact_counter?: number;
	organization_department_counter?: number;
	organization_employment_type_counter?: number;
	expense_category_counter?: number;
	organization_position_counter?: number;
	organization_project_counter?: number;
	organization_team_counter?: number;
	organization_vendor_counter?: number;
	payment_counter?: number;
	product_counter?: number;
	request_approval_counter?: number;
	task_counter?: number;
	user_counter?: number;
	warehouse_counter?: number;
	proposals_counter?: number;
}

export interface ITagType extends IBasePerTenantAndOrganizationEntityModel, ITaggable {
	type: string;
}
export interface ITagCreate {
	name: string;
	description?: string;
	icon?: string;
	color?: string;
	projectId?: string;
	organizationId?: string;
	tenantId?: string | undefined | null;
	organizationTeamId?: string;
}
