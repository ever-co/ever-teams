import { z } from 'zod';
import { relationalOrganizationTeamSchema } from '../common/base.schema';
import { basePerTenantAndOrganizationEntityModelSchema } from '../common/tenant-organization.schema';
import { relationalOrganizationProjectSchema } from '../common/base.schema';
import { taskStatusNameSchema } from '../common/enums.schema';

/**
 * Zod schemas for Task Status-related interfaces
 */

// Task Status Workflow schema
export const taskStatusWorkFlowSchema = z.object({
	isTodo: z.boolean().optional(),
	isInProgress: z.boolean().optional(),
	isDone: z.boolean().optional()
});

// Main task status schema
export const taskStatusSchema = z
	.object({
		name: z.string(),
		value: z.string(),
		description: z.string().optional().nullable(),
		icon: z.string().optional().nullable(),
		color: z.string().optional().nullable(),
		order: z.number().optional().nullable(),
		isSystem: z.boolean().optional(),
		isCollapsed: z.boolean().optional(),
		isDefault: z.boolean().optional(),
		fullIconUrl: z.string().optional().nullable(),
		template: taskStatusNameSchema.optional().nullable()
	})
	.merge(basePerTenantAndOrganizationEntityModelSchema)
	.merge(relationalOrganizationTeamSchema)
	.merge(relationalOrganizationProjectSchema)
	.merge(taskStatusWorkFlowSchema)
	.strict();

// Task status create schema
export const taskStatusCreateSchema = z.object({
	name: z.string().optional(),
	value: z.string().optional(),
	description: z.string().optional().nullable(),
	icon: z.string().optional().nullable(),
	color: z.string().optional().nullable(),
	order: z.number().optional().nullable(),
	isSystem: z.boolean().optional(),
	isCollapsed: z.boolean().optional(),
	isDefault: z.boolean().optional(),
	fullIconUrl: z.string().optional().nullable(),
	template: taskStatusNameSchema.optional().nullable(),
	projectId: z.string().optional().nullable(),
	organizationId: z.string().optional().nullable(),
	tenantId: z.string().optional().nullable(),
	organizationTeamId: z.string().optional().nullable(),
	isTodo: z.boolean().optional(),
	isInProgress: z.boolean().optional(),
	isDone: z.boolean().optional()
});

// Task status order schema
export const taskStatusOrderSchema = z.object({
	organizationId: z.string(),
	reorder: z.array(
		z.object({
			id: z.string(),
			order: z.number()
		})
	)
});

// Export TypeScript types
export type TTaskStatus = z.infer<typeof taskStatusSchema>;
export type TTaskStatusCreate = z.infer<typeof taskStatusCreateSchema>;
export type TTaskStatusOrder = z.infer<typeof taskStatusOrderSchema>;
export type TTaskStatusWorkFlow = z.infer<typeof taskStatusWorkFlowSchema>;
