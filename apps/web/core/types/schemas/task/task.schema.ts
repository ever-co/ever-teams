import { z } from 'zod';
import { baseEntitySchema, idSchema } from '../common/base.schema';
import { tagSchema } from '../tag/tag.schema';
import { employeeSchema } from '../organization/employee.schema';
import { taskStatusNameSchema, taskTypeSchema } from '../common/enums.schema';
import { taskPrioritySchema } from './task-priority.schema';
import { taskSizeSchema } from './task-size.schema';
import { taskStatusSchema } from './task-status.schema';

export const basePerTenantAndOrganizationEntitySchema = baseEntitySchema.extend({
	tenantId: idSchema.optional(),
	organizationId: idSchema.optional()
});

// schema for IOrganizationTeam
export const organizationTeamSchema = basePerTenantAndOrganizationEntitySchema.extend({
	name: z.string(),
	prefix: z.string().optional(),
	emoji: z.string().optional(),
	teamSize: z.string().optional(),
	logo: z.string().optional(),
	imageId: z.string().optional(),
	color: z.string().optional(),
	public: z.boolean().nullable(),
	profile_link: z.string().optional(),
	tags: z.array(tagSchema).optional().nullable(),
	members: z.array(employeeSchema).optional().nullable(),
	managers: z.array(employeeSchema).optional().nullable()
});

// schema for ITaskSize
export const taskSizeEntitySchema = basePerTenantAndOrganizationEntitySchema.extend({
	name: z.string(),
	value: z.string(),
	description: z.string().optional(),
	icon: z.string().optional(),
	color: z.string().optional(),
	isSystem: z.boolean().optional(),
	template: z.string().optional()
});

// schema for ITaskPriority
export const taskPriorityEntitySchema = basePerTenantAndOrganizationEntitySchema.extend({
	name: z.string(),
	value: z.string(),
	description: z.string().optional(),
	icon: z.string().optional(),
	color: z.string().optional(),
	isSystem: z.boolean().optional(),
	template: z.string().optional()
});

// schema for IIssueType
export const issueTypeEntitySchema = basePerTenantAndOrganizationEntitySchema.extend({
	name: z.string(),
	value: z.string(),
	description: z.string().optional(),
	icon: z.string().optional(),
	color: z.string().optional(),
	isSystem: z.boolean().optional(),
	imageId: z.string().nullable().optional(),
	projectId: z.string().nullable().optional(),
	organizationTeamId: idSchema.optional(),
	image: z.string().nullable().optional(),
	fullIconUrl: z.string().optional(),
	template: z.string().optional()
});

// schema for ITaskLinkedIssue
export const taskLinkedIssueSchema = z.object({
	organizationId: z.string(),
	taskToId: z.string(),
	taskFromId: z.string(),
	action: z.number()
});

// schema for IBaseTaskProperties
export const baseTaskPropertiesSchema = basePerTenantAndOrganizationEntitySchema.extend({
	title: z.string(),
	number: z.number().optional(),
	public: z.boolean().nullable(),
	prefix: z.string().optional(),
	description: z.string().optional(),
	status: taskStatusNameSchema.optional(),
	priority: taskPrioritySchema.optional(),
	size: taskSizeSchema.optional(),
	issueType: taskTypeSchema.optional(),
	startDate: z.date().optional(),
	resolvedAt: z.date().optional(),
	dueDate: z.date().optional(),
	estimate: z.number().optional(),
	isDraft: z.boolean().optional(),
	isScreeningTask: z.boolean().optional(),
	version: z.string().optional()
});

// schema for ITaskAssociations
export const taskAssociationsSchema = z.object({
	tags: z.array(tagSchema).optional(),
	projectId: idSchema.optional(),
	members: z.array(employeeSchema).optional(),
	teams: z.array(organizationTeamSchema).optional()
});
const baseTaskSchema = z.object({
	title: z.string(),
	number: z.number().optional(),
	public: z.boolean().nullable(),
	prefix: z.string().optional(),
	description: z.string().optional(),
	status: taskStatusNameSchema.optional(),
	priority: taskPrioritySchema.optional(),
	size: taskSizeSchema.optional(),
	issueType: taskTypeSchema.optional(),
	startDate: z.date().optional(),
	resolvedAt: z.date().optional(),
	dueDate: z.date().optional(),
	estimate: z.number().optional(),
	isDraft: z.boolean().optional(),
	isScreeningTask: z.boolean().optional(),
	version: z.string().optional(),
	tags: z.array(tagSchema).optional().nullable(),
	projectId: idSchema.optional(),
	members: z.array(employeeSchema).optional(),
	teams: z.array(organizationTeamSchema).optional(),

	parentId: idSchema.optional(),
	children: z.array(z.any()).optional().nullable(),
	rootEpic: z.any().optional().nullable(),
	// Relations with the entities of status, size, priority and type
	taskStatus: taskStatusSchema.optional(),
	taskStatusId: idSchema.optional(),
	taskSize: taskSizeEntitySchema.optional(),
	taskSizeId: idSchema.optional(),
	taskPriority: taskPriorityEntitySchema.optional(),
	taskPriorityId: idSchema.optional(),
	taskType: issueTypeEntitySchema.optional(),
	taskTypeId: idSchema.optional(),

	// Additional properties specific to tasks
	taskNumber: z.string().optional(),
	totalWorkedTime: z.number().optional(),
	selectedTeam: organizationTeamSchema.optional(),
	linkedIssues: z.array(taskLinkedIssueSchema).optional(),
	label: z.string().optional(),
	estimateHours: z.number().optional(),
	estimateMinutes: z.number().optional()
});
// schema for ITask
export const taskSchema = baseTaskPropertiesSchema
	.merge(baseTaskSchema)
	.merge(taskAssociationsSchema)
	.extend({
		// Relations with other tasks
		parent: baseTaskSchema.optional().nullable(),
		parentId: idSchema.optional(),
		children: z.array(baseTaskSchema).optional().nullable(),
		rootEpic: baseTaskSchema.optional().nullable(),

		// Relations with the entities of status, size, priority and type
		taskStatus: taskStatusSchema.optional(),
		taskStatusId: idSchema.optional(),
		taskSize: taskSizeEntitySchema.optional(),
		taskSizeId: idSchema.optional(),
		taskPriority: taskPriorityEntitySchema.optional(),
		taskPriorityId: idSchema.optional(),
		taskType: issueTypeEntitySchema.optional(),
		taskTypeId: idSchema.optional(),

		// Additional properties specific to tasks
		taskNumber: z.string().optional(),
		totalWorkedTime: z.number().optional(),
		selectedTeam: organizationTeamSchema.optional(),
		linkedIssues: z.array(taskLinkedIssueSchema).optional(),
		label: z.string().optional(),
		estimateHours: z.number().optional(),
		estimateMinutes: z.number().optional()
	});

// schema for ITasksStatistics
export const taskStatisticsSchema = taskSchema.extend({
	duration: z.number().optional(),
	durationPercentage: z.number().optional()
});

// schema for ICreateTask
export const createTaskSchema = z.object({
	title: z.string().min(1, 'Title is required'),
	status: z.string().optional(),
	size: z.string().optional(),
	priority: z.string().optional(),
	taskStatusId: z.string().optional(),
	issueType: z.string().optional(),
	members: z
		.array(
			z
				.object({
					id: z.string()
				})
				.passthrough()
		)
		.optional(),
	estimateDays: z.number().optional(),
	estimateHours: z.string().optional(),
	estimateMinutes: z.string().optional(),
	dueDate: z.string().optional(),
	description: z.string(),
	tags: z.array(z.object({ id: z.string() })),
	teams: z.array(z.object({ id: z.string() })),
	estimate: z.number(),
	organizationId: z.string(),
	tenantId: z.string(),
	projectId: z.string().nullable().optional()
});

// ===== TYPES TYPESCRIPT EXPORTED =====

export type TTask = z.infer<typeof taskSchema>;
export type TTaskStatistics = z.infer<typeof taskStatisticsSchema>;
export type TCreateTask = z.infer<typeof createTaskSchema>;
export type TEmployee = z.infer<typeof employeeSchema>;
export type TTag = z.infer<typeof tagSchema>;
export type TOrganizationTeam = z.infer<typeof organizationTeamSchema>;
export type TTaskStatus = z.infer<typeof taskStatusSchema>;
export type TTaskSize = z.infer<typeof taskSizeEntitySchema>;
export type TTaskPriority = z.infer<typeof taskPriorityEntitySchema>;
export type TIssueType = z.infer<typeof issueTypeEntitySchema>;
export type TTaskLinkedIssue = z.infer<typeof taskLinkedIssueSchema>;

// Types for enums
export type ETaskStatusName = z.infer<typeof taskStatusNameSchema>;
export type ETaskPriority = z.infer<typeof taskPrioritySchema>;
export type ETaskSize = z.infer<typeof taskSizeSchema>;
export type EIssueType = z.infer<typeof taskTypeSchema>;

// ===== UTILITIES FOR VALIDATION =====

/**
 * Validate a complete task
 */
export const validateTask = (data: unknown): TTask => {
	return taskSchema.parse(data);
};

/**
 * Secure validation of a task
 */
export const safeValidateTask = (data: unknown) => {
	return taskSchema.safeParse(data);
};

/**
 * Validate the data of a task creation
 */
export const validateCreateTask = (data: unknown): TCreateTask => {
	return createTaskSchema.parse(data);
};

/**
 * Partial validation for task updates
 */
export const validatePartialTask = (data: unknown) => {
	return taskSchema.partial().parse(data);
};

/**
 * Validate the statistics of a task
 */
export const validateTaskStatistics = (data: unknown): TTaskStatistics => {
	return taskStatisticsSchema.parse(data);
};

// ===== INTERFACE OF COMPATIBILITY (if necessary) =====

/**
 * Interface ITask for retrocompatibility
 * Use the type TTask instead
 */
export interface ITask extends z.infer<typeof taskSchema> {}

export default taskSchema;
