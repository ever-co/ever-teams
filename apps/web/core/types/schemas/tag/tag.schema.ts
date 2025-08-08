import { z } from 'zod';
import { relationalOrganizationTeamSchema, uuIdSchema } from '../common/base.schema';
import { basePerTenantAndOrganizationEntityModelSchema } from '../common/tenant-organization.schema';

/**
 * Zod schemas for Tag-related interfaces
 */

// Tag type schema
export const tagTypeSchema = z
	.object({
		type: z.string()
	})
	.merge(basePerTenantAndOrganizationEntityModelSchema)
	.merge(
		z.object({
			tags: z.array(z.lazy(() => tagSchema)).optional() // Taggable interface
		})
	)
	.strict();

// Main tag schema
export const tagSchema = z
	.object({
		name: z.string(),
		color: z.string(),
		textColor: z.string().optional().nullable(),
		icon: z.string().optional().nullable(),
		description: z.string().optional().nullable(),
		isSystem: z.boolean().optional(),
		tagTypeId: uuIdSchema.optional().nullable(),
		tagTypeName: z.string().optional().nullable(),
		fix_relational_custom_fields: z.any().optional().nullable(),
		customFields: z.any().optional().nullable(),
		fullIconUrl: z.any().optional().nullable(),
		// Counter fields
		candidate_counter: z.number().optional(),
		employee_counter: z.number().optional(),
		employee_level_counter: z.number().optional(),
		equipment_counter: z.number().optional(),
		event_type_counter: z.number().optional(),
		expense_counter: z.number().optional(),
		income_counter: z.number().optional(),
		integration_counter: z.number().optional(),
		invoice_counter: z.number().optional(),
		merchant_counter: z.number().optional(),
		organization_counter: z.number().optional(),
		organization_contact_counter: z.number().optional(),
		organization_department_counter: z.number().optional(),
		organization_employment_type_counter: z.number().optional(),
		expense_category_counter: z.number().optional(),
		organization_position_counter: z.number().optional(),
		organization_project_counter: z.number().optional(),
		organization_team_counter: z.number().optional(),
		organization_vendor_counter: z.number().optional(),
		payment_counter: z.number().optional(),
		product_counter: z.number().optional(),
		request_approval_counter: z.number().optional(),
		task_counter: z.number().optional(),
		user_counter: z.number().optional(),
		warehouse_counter: z.number().optional(),
		proposals_counter: z.number().optional()
	})
	.merge(basePerTenantAndOrganizationEntityModelSchema)
	.merge(relationalOrganizationTeamSchema)
	.strict();

// Tag create schema
export const tagCreateSchema = z.object({
	name: z.string(),
	description: z.string().optional().nullable(),
	icon: z.string().optional().nullable(),
	color: z.string().optional().nullable(),
	projectId: z.string().optional().nullable(),
	organizationId: z.string().optional().nullable(),
	tenantId: z.string().optional().nullable(),
	organizationTeamId: z.string().optional().nullable(),
	customFields: z.any().optional().nullable()
});

// Export TypeScript types
export type TTag = z.infer<typeof tagSchema>;
export type TTagType = z.infer<typeof tagTypeSchema>;
export type TTagCreate = z.infer<typeof tagCreateSchema>;
