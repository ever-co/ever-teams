import { z } from 'zod';
import { basePerTenantAndOrganizationEntityModelSchema } from '../common/tenant-organization.schema';
import { idSchema } from '../common/base.schema';

/**
 * Zod schemas for Activity-related interfaces
 */

// URL metadata schema for activity metaData field
export const urlMetaDataSchema = z.object({
	title: z.string().optional(),
	description: z.string().optional(),
	image: z.string().optional(),
	url: z.string().optional()
});

// Base activity schema (IActivity interface)
export const activitySchema = basePerTenantAndOrganizationEntityModelSchema.extend({
	title: z.string(),
	description: z.string().optional(),
	timeSlotId: idSchema.optional(),
	taskId: idSchema.optional(),
	metaData: z.union([z.string(), urlMetaDataSchema]).optional(),
	date: z.string(),
	time: z.string(),
	duration: z.number().optional(),
	type: z.string().optional(),
	source: z.string().optional(),
	activityTimestamp: z.string().optional(),
	recordedAt: z.coerce.date().optional(),
	
	// Relational fields (using z.any() to avoid circular dependencies)
	timeSlot: z.any().optional(), // ITimeSlot
	task: z.any().optional(), // ITask
	project: z.any().optional(), // IOrganizationProject
	projectId: idSchema.optional(),
	employee: z.any().optional(), // IEmployee
	employeeId: idSchema.optional()
});

// Activity filter schema (IActivityFilter interface)
export const activityFilterSchema = z.object({
	type: z.enum(['DATE', 'TICKET']),
	member: z.any().nullable(), // IOrganizationTeamEmployee
	taskId: z.string().optional(),
	dateStart: z.coerce.date().optional(),
	dateStop: z.coerce.date().optional()
});

// Inferred TypeScript types from Zod schemas - use these for consistency with validation
export type TActivity = z.infer<typeof activitySchema>;
export type TActivityFilter = z.infer<typeof activityFilterSchema>;
export type TUrlMetaData = z.infer<typeof urlMetaDataSchema>;
