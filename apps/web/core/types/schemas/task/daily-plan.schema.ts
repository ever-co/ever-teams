import { z } from 'zod';
import { basePerTenantAndOrganizationEntityModelSchema } from '../common/tenant-organization.schema';
import { taskSchema } from './task.schema';

/**
 * Daily Plan Status Enum Schema
 * Based on EDailyPlanStatus enum
 */
export const dailyPlanStatusSchema = z.enum(['open', 'in-progress', 'completed']);

/**
 * Base Daily Plan Schema (IDailyPlanBase)
 * Represents the core properties of a daily plan extending IBasePerTenantAndOrganizationEntityModel
 */
export const dailyPlanBaseSchema = basePerTenantAndOrganizationEntityModelSchema.extend({
	id: z.string().optional(),
	date: z.string(),
	workTimePlanned: z.coerce.number(),
	status: dailyPlanStatusSchema
});

/**
 * Daily Plan Schema (TDailyPlan)
 * Extends IDailyPlanBase, IRelationalEmployee, IRelationalOrganizationTeam
 */
export const dailyPlanSchema = dailyPlanBaseSchema.extend({
	// From IRelationalEmployee
	employeeId: z.string().optional().nullable(),
	employee: z.any().optional().nullable(), // IEmployee - complex interface, using any for now

	// From IRelationalOrganizationTeam
	organizationTeamId: z.string().optional().nullable(),
	organizationTeam: z.any().optional().nullable(), // IOrganizationTeam - complex interface, using any for now

	// Tasks relation
	tasks: z.array(taskSchema).optional().nullable()
});

/**
 * Create Daily Plan Schema (ICreateDailyPlan)
 * Omits 'id' from IDailyPlanBase, includes IRelationalEmployee, IRelationalOrganizationTeam
 */
export const createDailyPlanSchema = dailyPlanBaseSchema.omit({ id: true }).extend({
	// From IRelationalEmployee
	employeeId: z.string().optional().nullable(),
	employee: z.any().optional().nullable(),

	// From IRelationalOrganizationTeam
	organizationTeamId: z.string().optional().nullable(),
	organizationTeam: z.any().optional().nullable(),

	// Additional field from ICreateDailyPlan
	taskId: z.string().optional().nullable()
});

/**
 * Update Daily Plan Schema (IUpdateDailyPlan)
 * Partial IDailyPlanBase, required employeeId, optional organizationTeamId
 */
export const updateDailyPlanSchema = dailyPlanBaseSchema.partial().extend({
	// Required from Pick<ICreateDailyPlan, 'employeeId'>
	employeeId: z.string().optional(),

	// Optional from Partial<Pick<IRelationalOrganizationTeam, 'organizationTeamId'>>
	organizationTeamId: z.string().optional().nullable()
});

/**
 * Daily Plan Tasks Update Schema (IDailyPlanTasksUpdate)
 * Pick taskId & employeeId from ICreateDailyPlan, omit 'id' from IBasePerTenantAndOrganizationEntityModel
 */
export const dailyPlanTasksUpdateSchema = z.object({
	// From Pick<ICreateDailyPlan, 'taskId' | 'employeeId'>
	taskId: z.string().optional().nullable(),
	employeeId: z.string().optional().nullable(),

	// From Omit<IBasePerTenantAndOrganizationEntityModel, 'id'>
	tenantId: z.string().optional(),
	organizationId: z.string().optional()
});

/**
 * Remove Task From Many Plans Request Schema (IRemoveTaskFromManyPlansRequest)
 */
export const removeTaskFromManyPlansRequestSchema = z.object({
	employeeId: z.string().optional().nullable(), // ID type
	plansIds: z.array(z.string()).optional().nullable(), // ID[] type
	organizationId: z.string().optional().nullable() // ID type
});

// Export TypeScript types
export type TDailyPlanStatus = z.infer<typeof dailyPlanStatusSchema>;
export type TDailyPlanBase = z.infer<typeof dailyPlanBaseSchema>;
export type TDailyPlan = z.infer<typeof dailyPlanSchema>;
export type TCreateDailyPlan = z.infer<typeof createDailyPlanSchema>;
export type TUpdateDailyPlan = z.infer<typeof updateDailyPlanSchema>;
export type TDailyPlanTasksUpdate = z.infer<typeof dailyPlanTasksUpdateSchema>;
export type TRemoveTaskFromPlansRequest = z.infer<typeof removeTaskFromManyPlansRequestSchema>;
