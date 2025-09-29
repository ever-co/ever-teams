import { z } from 'zod';
import { basePerTenantAndOrganizationEntitySchema } from '../common/tenant-organization.schema';
import { uuIdSchema, relationalEmployeeSchema, relationalOrganizationProjectSchema } from '../common/base.schema';
import { organizationTeamEmployeeSchema } from '../team/organization-team-employee.schema';
import { employeeBaseSchema } from '../common/employee.schema';
import { taskSchema } from '../task/task.schema';

/**
 * Zod schemas for Activity-related interfaces
 *
 * This schema is designed to be pixel-perfect with IActivity interface
 * from apps/web/core/types/interfaces/activity/activity.ts
 */

// URL metadata schema for activity metaData field (IUrlMetaData interface)
export const urlMetaDataSchema = z
	.object({
		title: z.string().optional(),
		description: z.string().nullable(),
		image: z.string().optional(),
		url: z.string().optional()
		// Allow additional properties as per interface definition
		// [x: string]: any;
	})
	.catchall(z.any());

// Note: Using existing relationalEmployeeSchema and relationalOrganizationProjectSchema from common/base.schema.ts

// Time Slot schema (simplified for ITimeSlot interface)
export const timeSlotSchema = z
	.object({
		id: uuIdSchema,
		employeeId: uuIdSchema,
		employee: z.lazy(() => employeeBaseSchema).optional(),
		activities: z.array(z.any()).optional(), // IActivity[] - circular reference
		screenshots: z.array(z.any()).optional(),
		timeLogs: z.array(z.any()).optional(),
		timeSlotMinutes: z.array(z.any()).optional(),
		project: z.any().optional().nullable(), // Will be properly typed when organization project schema
		projectId: uuIdSchema.optional(),
		duration: z.number().optional(),
		keyboard: z.number().optional(),
		mouse: z.number().optional(),
		overall: z.number().optional(),
		startedAt: z.coerce.date(),
		stoppedAt: z.coerce.date().optional(),
		percentage: z.number().optional(),
		keyboardPercentage: z.number().optional(),
		mousePercentage: z.number().optional(),
		tags: z.array(z.any()).optional(),
		isAllowDelete: z.boolean().optional()
	})
	.merge(basePerTenantAndOrganizationEntitySchema)
	.passthrough(); // [x: string]: any;

// Main activity schema (IActivity interface) - pixel-perfect match
export const activitySchema = basePerTenantAndOrganizationEntitySchema
	.merge(relationalOrganizationProjectSchema)
	.merge(relationalEmployeeSchema)
	.extend({
		// Core activity properties
		title: z.string(),
		description: z.string().nullable(),
		timeSlot: timeSlotSchema.optional(),
		timeSlotId: uuIdSchema.optional(),
		task: taskSchema.optional(),
		taskId: uuIdSchema.optional(),
		metaData: z.union([z.string(), urlMetaDataSchema]).optional(),
		date: z.string(),
		time: z.string(),
		duration: z.number().optional(),
		type: z.string().optional(),
		source: z.string().optional(),
		activityTimestamp: z.string().optional(),
		recordedAt: z.coerce.date().optional()
	});

// Note: Using existing organizationTeamEmployeeSchema from team/organization-team-employee.schema.ts

// Activity filter schema (IActivityFilter interface) - pixel-perfect match
export const activityFilterSchema = z.object({
	type: z.enum(['DATE', 'TICKET']),
	member: organizationTeamEmployeeSchema.nullable(),
	taskId: z.string().optional(),
	dateStart: z.coerce.date().optional(),
	dateStop: z.coerce.date().optional()
});

// Inferred TypeScript types from Zod schemas - use these for consistency with validation
export type TActivity = z.infer<typeof activitySchema>;
export type TActivityFilter = z.infer<typeof activityFilterSchema>;
export type TUrlMetaData = z.infer<typeof urlMetaDataSchema>;
export type TTimeSlot = z.infer<typeof timeSlotSchema>;
// Note: TOrganizationTeamEmployee, TRelationalEmployee, TRelationalOrganizationProject
// are already exported from their respective schema files
