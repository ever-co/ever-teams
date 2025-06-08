import { z } from 'zod';
import { basePerTenantAndOrganizationEntityModelSchema } from '../common/tenant-organization.schema';
import { idSchema, relationalEmployeeSchema, relationalOrganizationProjectSchema } from '../common/base.schema';
import { organizationTeamEmployeeSchema } from '../team/organization-team-employee.schema';
import { employeeSchema } from '../organization/employee.schema';

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
		description: z.string().optional(),
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
		id: idSchema,
		employeeId: idSchema,
		employee: employeeSchema.optional(),
		activities: z.array(z.any()).optional(), // IActivity[] - circular reference
		screenshots: z.array(z.any()).optional(),
		timeLogs: z.array(z.any()).optional(),
		timeSlotMinutes: z.array(z.any()).optional(),
		project: z.any().optional().nullable(), // Will be properly typed when organization project schema
		projectId: idSchema.optional(),
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
	.merge(basePerTenantAndOrganizationEntityModelSchema)
	.passthrough(); // [x: string]: any;

// Task schema (simplified for ITask interface)
export const taskSchema = z
	.object({
		id: idSchema,
		title: z.string(),
		number: z.number().optional(),
		public: z.boolean().optional(),
		prefix: z.string().optional(),
		description: z.string().optional(),
		status: z.string().optional(), // ETaskStatusName
		priority: z.string().optional(), // ETaskPriority
		size: z.string().optional(), // ETaskSize
		issueType: z.string().optional(), // EIssueType
		startDate: z.coerce.date().optional(),
		resolvedAt: z.coerce.date().optional(),
		dueDate: z.coerce.date().optional(),
		estimate: z.number().optional(),
		isDraft: z.boolean().optional(),
		isScreeningTask: z.boolean().optional(),
		version: z.string().optional(),
		// Associations
		children: z.array(z.any()).optional(), // ITask[]
		members: z.array(z.any()).optional(), // IEmployee[]
		teams: z.array(z.any()).optional(), // IOrganizationTeam[]
		tags: z.array(z.any()).optional(), // ITag[]
		// Relations
		parent: z.any().optional(), // ITask
		parentId: idSchema.optional(),
		taskStatus: z.any().optional(),
		taskStatusId: idSchema.optional(),
		taskSize: z.any().optional(),
		taskSizeId: idSchema.optional(),
		taskPriority: z.any().optional(),
		taskPriorityId: idSchema.optional(),
		taskType: z.any().optional(),
		taskTypeId: idSchema.optional(),
		rootEpic: z.any().optional(), // ITask
		taskNumber: z.string().optional(),
		totalWorkedTime: z.number().optional(),
		selectedTeam: z.any().optional(),
		linkedIssues: z.array(z.any()).optional(),
		label: z.string().optional(),
		estimateHours: z.number().optional(),
		estimateMinutes: z.number().optional()
	})
	.merge(basePerTenantAndOrganizationEntityModelSchema)
	.merge(relationalOrganizationProjectSchema);

// Main activity schema (IActivity interface) - pixel-perfect match
export const activitySchema = basePerTenantAndOrganizationEntityModelSchema
	.merge(relationalOrganizationProjectSchema)
	.merge(relationalEmployeeSchema)
	.extend({
		// Core activity properties
		title: z.string(),
		description: z.string().optional(),
		timeSlot: timeSlotSchema.optional(),
		timeSlotId: idSchema.optional(),
		task: taskSchema.optional(),
		taskId: idSchema.optional(),
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
export type TTask = z.infer<typeof taskSchema>;
// Note: TOrganizationTeamEmployee, TRelationalEmployee, TRelationalOrganizationProject
// are already exported from their respective schema files
