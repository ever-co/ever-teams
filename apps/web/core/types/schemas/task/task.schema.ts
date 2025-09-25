import { z } from 'zod';
import { baseEntitySchema, uuIdSchema } from '../common/base.schema';
import { tagSchema } from '../tag/tag.schema';
import { employeeSchema } from '../organization/employee.schema';
import { taskStatusNameSchema } from '../common/enums.schema';
import { taskPrioritySchema } from './task-priority.schema';
import { taskSizeSchema } from './task-size.schema';
import { taskStatusSchema } from './task-status.schema';
import { organizationTeamSchema } from '../team/organization-team.schema';
import { EIssueType } from '../../generics/enums/task';

export const basePerTenantAndOrganizationEntitySchema = baseEntitySchema.extend({
	tenantId: uuIdSchema.optional(),
	organizationId: uuIdSchema.optional()
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
	organizationTeamId: uuIdSchema.optional(),
	image: z.string().nullable().optional(),
	fullIconUrl: z.string().optional(),
	template: z.string().optional()
});

// schema for ITaskLinkedIssue
export const taskLinkedIssueSchema = z.object({
	organizationId: z.string(),
	taskToId: z.string(),
	taskFromId: z.string(),
	action: z.number(),
	taskFrom: z.any().optional(),
	taskTo: z.any().optional(),
	id: z.string()
});

// schema for IBaseTaskProperties
export const baseTaskPropertiesSchema = basePerTenantAndOrganizationEntitySchema.extend({
	title: z.string(),
	number: z.number().optional(),
	public: z.boolean().nullable(),
	prefix: z.string().optional().nullable(),
	description: z.string().optional(),
	status: z.any().optional(),
	priority: z.any().optional().nullable(),
	size: z.any().optional().nullable(),
	issueType: z.any().optional(),
	startDate: z.any().optional(),
	resolvedAt: z.any().optional(),
	dueDate: z.any().optional(),
	estimate: z.number().optional(),
	isDraft: z.boolean().optional(),
	isScreeningTask: z.boolean().optional(),
	version: z.string().optional().nullable()
});

// schema for ITaskAssociations
export const taskAssociationsSchema = z.object({
	tags: z.array(tagSchema).optional(),
	members: z.array(employeeSchema).optional(),
	teams: z.array(organizationTeamSchema).optional(),
	taskStatus: taskStatusSchema.optional(),
	taskSize: taskSizeEntitySchema.optional(),
	taskPriority: taskPriorityEntitySchema.optional(),
	taskType: issueTypeEntitySchema.optional()
});

export const taskSelfReferencesSchema = z.object({
	parent: z
		.lazy(() => taskZodSchemaType)
		.optional()
		.nullable(),
	rootEpic: z
		.lazy(() => taskZodSchemaType)
		.optional()
		.nullable(),
	children: z.array(z.lazy(() => taskZodSchemaType)).optional()
});

// Task Estimations
export const taskEstimationsSchema = z
	.object({
		estimate: z.number().min(0),
		employeeId: uuIdSchema,
		taskId: uuIdSchema
	})
	.merge(basePerTenantAndOrganizationEntitySchema);

export const createTaskEstimationSchema = taskEstimationsSchema.omit({ id: true });

const baseTaskSchema = z
	.object({
		id: uuIdSchema,
		title: z.string(),
		number: z.number().optional().nullable(),
		public: z.boolean().nullable(),
		prefix: z.string().optional().nullable(),
		description: z.string().optional(),
		status: z.any().optional(),
		priority: z.any().optional().nullable(),
		size: z.any().optional().nullable(),
		issueType: z.nativeEnum(EIssueType).optional().nullable(),
		startDate: z.any().optional().nullable(),
		resolvedAt: z.any().optional().nullable(),
		dueDate: z.any().optional().nullable(),
		estimate: z.number().optional(),
		isDraft: z.boolean().optional(),
		isScreeningTask: z.boolean().optional(),
		version: z.string().optional().nullable(),
		projectId: z.string().optional().nullable(),
		parentId: z.string().optional().nullable(),
		taskStatusId: z.string().optional().nullable(),
		taskSizeId: z.string().optional().nullable(),
		taskPriorityId: z.string().optional().nullable(),
		taskTypeId: z.string().optional().nullable(),
		taskNumber: z.string().optional(),
		totalWorkedTime: z.number().optional(),
		selectedTeam: organizationTeamSchema.optional(),
		linkedIssues: z.array(taskLinkedIssueSchema).optional(),
		label: z.string().optional(),
		estimateHours: z.number().optional(),
		estimateMinutes: z.number().optional(),
		estimations: z.array(taskEstimationsSchema).optional()
	})
	.merge(basePerTenantAndOrganizationEntitySchema);
/**
 * TaskZodSchemaType
 *
 * Help to keep type safety while solve the problem of recursive (self-references , references from associations).
 *
 * Recursive fields parent/rootEpic/children point back to taskZodSchemaType via z.lazy
 */
const taskZodSchemaType: z.ZodType<TTask> = baseTaskSchema
	.merge(taskSelfReferencesSchema)
	.merge(taskAssociationsSchema);

/**
 * Concrete task schema
 *
 * For validation / etc
 */
export const taskSchema = baseTaskSchema.merge(taskSelfReferencesSchema).merge(taskAssociationsSchema);

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
	tags: z.array(z.object({ id: z.string() })).nullable(),
	teams: z.array(z.object({ id: z.string() })),
	estimate: z.number(),
	organizationId: z.string(),
	tenantId: z.string(),
	projectId: z.string().nullable().optional()
});

export const updateActiveTaskSchema = z.object({
	affected: z.number(),
	generatedMaps: z.array(z.any()),
	raw: z.array(z.any())
});

// ===== TYPES TYPESCRIPT EXPORTED =====

export type TTask = z.infer<typeof baseTaskSchema> & {
	parent?: TTask | null;
	rootEpic?: TTask | null;
	children?: TTask[];
} & z.infer<typeof taskAssociationsSchema>;
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
// export type EIssueType = z.infer<typeof taskTypeSchema>;

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
