import { z } from 'zod';
import {
	relationalOrganizationTeamSchema,
	managerAssignableSchema,
	relationalEmployeeSchema,
	uuIdSchema
} from '../common/base.schema';
import { relationalRoleSchema } from '../role/role.schema';
import { timerStatusSchema } from '../timer/timer-status.schema';
import { basePerTenantAndOrganizationEntityModelSchema } from '../common/tenant-organization.schema';
import { imageAssetSchema } from '../common/image-asset.schema';

/**
 * Zod schemas for Organization Team Employee-related interfaces
 */

// Base organization team employee schema
export const baseOrganizationTeamEmployeeSchema = z
	.object({
		order: z.number().optional().nullable(),
		isTrackingEnabled: z.boolean().optional()
	})
	.merge(basePerTenantAndOrganizationEntityModelSchema)
	.merge(relationalOrganizationTeamSchema)
	.merge(managerAssignableSchema)
	.passthrough();

// Organization team employee schema
export const organizationTeamEmployeeSchema = z
	.object({
		id: z
			.lazy(() => uuIdSchema)
			.optional()
			.nullable(),
		activeTaskId: z
			.lazy(() => uuIdSchema)
			.optional()
			.nullable(),
		activeTask: z.any().optional(), // Will be properly typed when task schema is created
		isManager: z.boolean().optional(),
		isActive: z.boolean().optional(),
		name: z.string().nullable().optional(),
		firstName: z.string().nullable().optional(),
		lastName: z.string().nullable().optional(),
		fullName: z.string().nullable().optional(),
		email: z.string().nullable().optional(),
		phoneNumber: z.string().nullable().optional(),
		username: z.string().nullable().optional(),
		timeZone: z.string().nullable().optional(),
		user: z
			.object({
				thirdPartyId: z.string().nullable().optional(),
				name: z.string().nullable().optional(),
				firstName: z.string().nullable().optional(),
				lastName: z.string().nullable().optional(),
				email: z.string().nullable().optional(),
				phoneNumber: z.string().nullable().optional(),
				username: z.string().nullable().optional(),
				timeZone: z.string().nullable().optional(),
				timeFormat: z
					.union([z.literal(12), z.literal(24)])
					.nullable()
					.optional(),
				role: z.string().optional().nullable(),
				roleId: z.string().nullable().optional(),
				hash: z.string().nullable().optional()
			})
			.nullable()
			.optional(),
		totalWorkedTasks: z.array(z.any()).optional(), // Will be properly typed when task statistics schema is created
		totalTodayTasks: z.array(z.any()).optional() // Will be properly typed when task statistics schema is created
	})
	.merge(baseOrganizationTeamEmployeeSchema)
	.merge(relationalEmployeeSchema)
	.merge(relationalRoleSchema)
	.merge(timerStatusSchema)
	.passthrough();
// Organization team employee create schema
export const organizationTeamEmployeeCreateSchema = z.object({
	name: z.string().optional(),
	organizationId: z.string().optional(),
	organizationTeamId: z.string().optional(),
	tenantId: z.string().optional(),
	employeeId: z.string().optional(),
	roleId: z.string().optional().nullable(),
	isTrackingEnabled: z.boolean().optional(),
	activeTaskId: z.string().optional().nullable(),
	memberIds: z.array(z.string()).optional(),
	managerIds: z.array(z.string()).optional(),
	tags: z.array(z.string()).optional(),
	order: z.number().optional().nullable(),
	imageId: z.string().optional().nullable(),
	image: z
		.lazy(() => imageAssetSchema)
		.optional()
		.nullable()
});

// Organization team employee update schema
export const organizationTeamEmployeeUpdateSchema = z
	.object({
		id: z.string().optional()
	})
	.merge(organizationTeamEmployeeCreateSchema);

// Inferred types
export type TBaseOrganizationTeamEmployee = z.infer<typeof baseOrganizationTeamEmployeeSchema>;
export type TOrganizationTeamEmployee = z.infer<typeof organizationTeamEmployeeSchema>;
export type TOrganizationTeamEmployeeCreate = z.infer<typeof organizationTeamEmployeeCreateSchema>;
export type TOrganizationTeamEmployeeUpdate = z.infer<typeof organizationTeamEmployeeUpdateSchema>;
