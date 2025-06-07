import { z } from 'zod';
import {
	relationalOrganizationTeamSchema,
	managerAssignableSchema,
	relationalEmployeeSchema,
	idSchema
} from '../common/base.schema';
import { relationalRoleSchema } from '../role/role.schema';
import { timerStatusSchema } from '../timer/timer-status.schema';
import { basePerTenantAndOrganizationEntityModelSchema } from '../common/tenant-organization.schema';
import { employeeSchema } from '../organization/employee.schema';

/**
 * Zod schemas for Organization Team Employee-related interfaces
 */

// Base organization team employee schema
export const baseOrganizationTeamEmployeeSchema = z
	.object({
		order: z.number().optional(),
		isTrackingEnabled: z.boolean().optional()
	})
	.merge(basePerTenantAndOrganizationEntityModelSchema)
	.merge(relationalOrganizationTeamSchema)
	.merge(managerAssignableSchema)
	.strict();

// Organization team employee schema
export const organizationTeamEmployeeSchema = z
	.object({
		activeTaskId: idSchema.optional(),
		activeTask: z.any().optional(), // Will be properly typed when task schema is created
		isManager: z.boolean().optional(),
		isActive: z.boolean().optional(),
		totalWorkedTasks: z.array(z.any()).optional(), // Will be properly typed when task statistics schema is created
		totalTodayTasks: z.array(z.any()).optional() // Will be properly typed when task statistics schema is created
	})
	.merge(baseOrganizationTeamEmployeeSchema)
	.merge(relationalEmployeeSchema)
	.merge(employeeSchema)
	.merge(relationalRoleSchema)
	.merge(timerStatusSchema)
	.strict();

// Organization team employee create schema
export const organizationTeamEmployeeCreateSchema = z.object({
	name: z.string().optional(),
	organizationId: z.string().optional(),
	organizationTeamId: z.string().optional(),
	tenantId: z.string().optional(),
	employeeId: z.string().optional(),
	roleId: z.string().optional(),
	isTrackingEnabled: z.boolean().optional(),
	activeTaskId: z.string().optional(),
	order: z.number().optional()
});

// Organization team employee update schema
export const organizationTeamEmployeeUpdateSchema = z
	.object({
		id: z.string()
	})
	.merge(organizationTeamEmployeeCreateSchema);

// Inferred types
export type TBaseOrganizationTeamEmployee = z.infer<typeof baseOrganizationTeamEmployeeSchema>;
export type TOrganizationTeamEmployee = z.infer<typeof organizationTeamEmployeeSchema>;
export type TOrganizationTeamEmployeeCreate = z.infer<typeof organizationTeamEmployeeCreateSchema>;
export type TOrganizationTeamEmployeeUpdate = z.infer<typeof organizationTeamEmployeeUpdateSchema>;
