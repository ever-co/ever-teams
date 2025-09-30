import { z } from 'zod';
import { uuIdSchema } from '../common/base.schema';
import { tagSchema } from '../tag/tag.schema';
import { employeeSchema } from '../organization/employee.schema';
import { taskPrioritySchema } from './task-priority.schema';
import { taskSizeSchema } from './task-size.schema';
import { taskStatusSchema } from './task-status.schema';
import { organizationTeamSchema } from '../team/organization-team.schema';
import { EIssueType, ETaskPriority, ETaskSize, ETaskStatusName } from '../../generics/enums/task';
import { basePerTenantAndOrganizationEntitySchema } from '../common/tenant-organization.schema';
import { taskIssueTypeSchema } from './task-issue-type.schema';
import { taskLinkedIssueSchema, TTaskLinkedIssue } from './task-linked-issue.schema';
import { taskEstimationsSchema } from './task-estimation.schema';

// schema for ITaskAssociations
export const taskAssociationsSchema = z.object({
	tags: z.array(tagSchema).optional(),
	members: z.array(employeeSchema).optional(),
	teams: z.array(organizationTeamSchema).optional(),
	taskStatus: taskStatusSchema.optional(),
	taskSize: taskSizeSchema.optional(),
	taskPriority: taskPrioritySchema.optional(),
	taskType: taskIssueTypeSchema.optional(),
	estimations: z.array(taskEstimationsSchema).optional(),
	selectedTeam: organizationTeamSchema.optional()
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
	children: z.array(z.lazy(() => taskZodSchemaType)).optional(),
	linkedIssues: z.array(taskLinkedIssueSchema).optional()
});

// Task Estimations

const baseTaskSchema = z
	.object({
		id: uuIdSchema,
		title: z.string(),
		number: z.number().optional().nullable(),
		public: z.boolean().nullable(),
		prefix: z.string().optional().nullable(),
		description: z.string().optional(),
		status: z.nativeEnum(ETaskStatusName).optional().nullable(),
		priority: z.nativeEnum(ETaskPriority).optional().nullable(),
		size: z.nativeEnum(ETaskSize).optional().nullable(),
		issueType: z.nativeEnum(EIssueType).optional().nullable(),
		startDate: z.coerce.date().optional().nullable(),
		resolvedAt: z.coerce.date().optional().nullable(),
		dueDate: z.coerce.date().optional().nullable(),
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
		label: z.string().optional(),
		estimateHours: z.number().optional(),
		estimateMinutes: z.number().optional()
	})
	.merge(basePerTenantAndOrganizationEntitySchema);
/**
 * TaskZodSchemaType
 *
 * Help to keep type safety while solve the problem of recursive (self-references , references from associations).
 *
 * Recursive fields parent/rootEpic/children point back to taskZodSchemaType via z.lazy
 */
export const taskZodSchemaType: z.ZodType<TTask> = baseTaskSchema
	.merge(taskSelfReferencesSchema)
	.merge(taskAssociationsSchema);

/**
 * Concrete task schema
 *
 * For validation / etc
 */
export const taskSchema = baseTaskSchema.merge(taskSelfReferencesSchema).merge(taskAssociationsSchema);

// schema for ICreateTask
export const createTaskSchema = taskSchema
	.pick({
		title: true,
		status: true,
		size: true,
		priority: true,
		issueType: true,
		taskType: true,
		taskSizeId: true,
		taskPriorityId: true,
		taskTypeId: true,
		taskStatusId: true,
		estimateHours: true,
		estimateMinutes: true,
		dueDate: true,
		description: true,
		estimate: true,
		organizationId: true,
		tenantId: true,
		projectId: true
	})
	.extend({
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
		tags: z.array(z.object({ id: z.string() })).nullable(),
		teams: z.array(z.object({ id: z.string() }))
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
	linkedIssues?: TTaskLinkedIssue[];
} & z.infer<typeof taskAssociationsSchema>;
export type TCreateTask = z.infer<typeof createTaskSchema>;

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
