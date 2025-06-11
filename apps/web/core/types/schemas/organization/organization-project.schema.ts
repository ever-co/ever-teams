import { z } from 'zod';
import { EProjectBilling, EProjectBudgetType, EProjectOwner, EProjectRelation } from '../../generics/enums/project';
import { ECurrencies } from '../../generics/enums/currency';
import { ETaskListType, ETaskStatusName } from '../../generics/enums/task';

/**
 * Zod schemas for Organization Project-related interfaces
 */

export const organizationProjectSettingSchema = z
	.object({
		id: z.string().optional(),
		createdAt: z.coerce.date().optional(),
		updatedAt: z.coerce.date().optional(),
		tenantId: z.string().optional(),
		organizationId: z.string().optional(),
		customFields: z.record(z.any()).optional(),
		isTasksAutoSync: z.boolean().optional(),
		isTasksAutoSyncOnLabel: z.boolean().optional(),
		syncTag: z.string().optional()
	})
	.passthrough();

// Project relation schema
export const projectRelationSchema = z
	.object({
		projectId: z.string(),
		relationType: z.nativeEnum(EProjectRelation).nullable()
	})
	.passthrough();

// Organization project repository schema
export const organizationProjectRepositorySchema = z
	.object({
		id: z.string(),
		createdAt: z.coerce.string().optional(),
		updatedAt: z.coerce.string().optional(),
		isActive: z.boolean(),
		isArchived: z.boolean(),
		tenantId: z.string(),
		organizationId: z.string(),
		repositoryId: z.coerce.number(),
		name: z.string(),
		fullName: z.string(),
		owner: z.nativeEnum(EProjectOwner).nullable(),
		integrationId: z.string()
	})
	.passthrough();

export const organizationProjectBaseSchema = z
	.object({
		id: z.string(),
		createdAt: z.coerce.date().optional(),
		updatedAt: z.coerce.date().optional(),
		archivedAt: z.coerce.string().nullable().optional(),
		tenantId: z.string().optional(),
		organizationId: z.string().optional(),
		name: z.string(),
		startDate: z.coerce.date().optional(),
		endDate: z.coerce.date().optional(),
		billing: z.nativeEnum(EProjectBilling).optional().nullable(),
		currency: z
			.union([
				z.nativeEnum(ECurrencies),
				z.string() // fallback to any string
			])
			.optional()
			.nullable(),
		public: z.boolean().nullable(),
		owner: z.nativeEnum(EProjectOwner).nullable().nullable(),
		taskListType: z.nativeEnum(ETaskListType).optional().nullable(),
		code: z.string().optional().nullable(),
		description: z.string().optional().nullable(),
		color: z.string().optional().nullable(),
		billable: z.boolean().optional().nullable(),
		billingFlat: z.boolean().optional().nullable(),
		openSource: z.boolean().optional().nullable(),
		projectUrl: z.string().optional().nullable(),
		openSourceProjectUrl: z.string().optional().nullable(),
		budget: z.coerce.number().optional(),
		budgetType: z.nativeEnum(EProjectBudgetType).optional(),
		membersCount: z.coerce.number().optional(),
		imageUrl: z.string().optional().nullable(),
		status: z.nativeEnum(ETaskStatusName).optional().nullable(),
		icon: z.string().optional().nullable(),
		archiveTasksIn: z.coerce.number().optional(),
		closeTasksIn: z.coerce.number().optional(),
		defaultAssigneeId: z.string().optional().nullable(),
		// Relations (will be populated by API)
		members: z.array(z.any()).optional(),
		teams: z.array(z.any()).optional(),
		tasks: z.array(z.any()).optional(),
		timeLogs: z.array(z.any()).optional(),
		tags: z.array(z.any()).optional(),
		defaultAssignee: z.any().optional(),
		relations: z.array(projectRelationSchema).optional(),
		repository: organizationProjectRepositorySchema.optional(),
		// Image asset fields
		imageId: z.string().optional().nullable(),
		image: z.any().optional()
	})
	.passthrough();

export const organizationProjectSchema = organizationProjectBaseSchema.extend({
	name: z.string().min(1, 'Project name is required')
});

export const createProjectRequestSchema = z
	.object({
		name: z.string().min(1, 'Project name is required'),
		organizationId: z.string().min(1, 'Organization ID is required'),
		tenantId: z.string().min(1, 'Tenant ID is required'),
		projectUrl: z.string().optional().nullable(),
		description: z.string().optional(),
		color: z.string().optional(),
		tags: z.array(z.any()).optional(),
		imageUrl: z.string().optional(),
		imageId: z.string().optional().nullable(),
		budget: z.coerce.number().optional(),
		budgetType: z.nativeEnum(EProjectBudgetType).optional(),
		startDate: z.coerce.string(),
		endDate: z.coerce.string(),
		archivedAt: z.coerce.string().nullable().optional(),
		billing: z.string().optional(),
		currency: z.nativeEnum(ECurrencies).optional().nullable(),
		memberIds: z.array(z.string()).optional(),
		managerIds: z.array(z.string()).optional(),
		teams: z.array(z.any()).optional(),
		status: z.nativeEnum(ETaskStatusName).optional().nullable(),
		isActive: z.boolean().optional(),
		isArchived: z.boolean().optional(),
		isTasksAutoSync: z.boolean().optional(),
		isTasksAutoSyncOnLabel: z.boolean().optional(),
		owner: z.nativeEnum(EProjectOwner).optional().nullable(),
		relations: z.array(projectRelationSchema).optional()
	})
	.passthrough();

export const editProjectRequestSchema = createProjectRequestSchema.partial().passthrough();

export const getOrganizationProjectsRequestSchema = z
	.object({
		queries: z.record(z.string()).optional()
	})
	.passthrough();

export const getOrganizationProjectRequestSchema = z
	.object({
		id: z.string().min(1, 'Project ID is required'),
		tenantId: z.string().optional()
	})
	.passthrough();

export const minimalOrganizationProjectSchema = z
	.object({
		id: z.string(),
		name: z.string(),
		organizationId: z.string().optional(),
		tenantId: z.string().optional()
	})
	.passthrough();

export type TOrganizationProjectSetting = z.infer<typeof organizationProjectSettingSchema>;
export type TProjectRelation = z.infer<typeof projectRelationSchema>;
export type TOrganizationProjectRepository = z.infer<typeof organizationProjectRepositorySchema>;
export type TOrganizationProjectBase = z.infer<typeof organizationProjectBaseSchema>;
export type TOrganizationProject = z.infer<typeof organizationProjectSchema>;
export type TCreateProjectRequest = z.infer<typeof createProjectRequestSchema>;
export type TEditProjectRequest = z.infer<typeof editProjectRequestSchema>;
export type TGetOrganizationProjectsRequest = z.infer<typeof getOrganizationProjectsRequestSchema>;
export type TGetOrganizationProjectRequest = z.infer<typeof getOrganizationProjectRequestSchema>;
export type TMinimalOrganizationProject = z.infer<typeof minimalOrganizationProjectSchema>;
