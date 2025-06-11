import { z } from 'zod';
import { relationalImageAssetSchema, relationalOrganizationProjectSchema, taggableSchema } from '../common/base.schema';
import { basePerTenantAndOrganizationEntityModelSchema } from '../common/tenant-organization.schema';
import { organizationTeamEmployeeSchema } from './organization-team-employee.schema';
import { EProjectBilling, EProjectOwner } from '../../generics/enums/project';
import { ETaskListType, ETaskStatusName } from '../../generics/enums/task';
import { ECurrencies } from '../../generics/enums/currency';
import { organizationSchema } from '../organization/organization.schema';

export const baseProjectSchema = z.object({
	deletedAt: z.string().datetime(),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
	id: z.string(),
	isActive: z.boolean(),
	isArchived: z.boolean(),
	archivedAt: z.string().datetime(),
	tenantId: z.string(),
	organizationId: z.string(),
	name: z.string(),
	startDate: z.string().or(z.coerce.date()).optional().nullable(),
	endDate: z.string().or(z.coerce.date()).optional().nullable(),
	billing: z.nativeEnum(EProjectBilling).optional().nullable(),
	currency: z.nativeEnum(ECurrencies).optional().nullable(), // idem
	public: z.boolean(),
	owner: z.nativeEnum(EProjectOwner).optional().nullable(),
	taskListType: z.nativeEnum(ETaskListType).optional().nullable(),
	code: z.string(),
	description: z.string(),
	color: z.string(),
	billable: z.boolean(),
	billingFlat: z.boolean(),
	openSource: z.boolean(),
	projectUrl: z.string(),
	openSourceProjectUrl: z.string(),
	budget: z.number(),
	budgetType: z.enum(['cost', 'hours']).optional(),
	imageUrl: z.string(),
	icon: z.string(),
	status: z.nativeEnum(ETaskStatusName),
	isTasksAutoSync: z.boolean(),
	isTasksAutoSyncOnLabel: z.boolean(),
	syncTag: z.string(),
	archiveTasksIn: z.number(),
	closeTasksIn: z.number(),
	organizationContactId: z.string(),
	imageId: z.string(),
	defaultAssigneeId: z.string()
});

// Organization team update schema
export const organizationTeamUpdateSchema = z.object({
	tenant: z
		.object({
			id: z.string().uuid().optional().nullable()
		})
		.optional()
		.nullable(),
	tenantId: z.string(),
	organization: organizationSchema
		.merge(
			z.object({
				name: z.string(),
				currency: z.nativeEnum(ECurrencies).optional().nullable(),
				isDefault: z.boolean().optional().nullable()
			})
		)
		.optional()
		.nullable(),
	organizationId: z.string(),
	sentTo: z.string(),
	tags: z.array(z.null()), // ou z.array(z.string().nullable()) si mix
	memberIds: z.array(z.string()),
	managerIds: z.array(z.string()),
	logo: z.string(),
	prefix: z.string(),
	shareProfileView: z.boolean(),
	requirePlanToTrack: z.boolean(),
	imageId: z.string(),
	public: z.boolean(),
	color: z.string(),
	emoji: z.string(),
	teamSize: z.string(),
	projects: z.array(baseProjectSchema),
	id: z.string(),
	name: z.string()
});

/**
 * Zod schemas for Organization Team-related interfaces
 */

// Base team properties schema
export const baseTeamPropertiesSchema = z
	.object({
		name: z.string(),
		color: z.string().optional().nullable(),
		emoji: z.string().optional().nullable(),
		teamSize: z.string().optional().nullable(),
		logo: z.string().optional(),
		prefix: z.string().optional().nullable(),
		shareProfileView: z.boolean().optional(),
		requirePlanToTrack: z.boolean().optional(),
		public: z.boolean().optional(),
		profile_link: z.string().optional()
	})
	.merge(basePerTenantAndOrganizationEntityModelSchema)
	.merge(relationalImageAssetSchema)
	.merge(taggableSchema);

// Team associations schema

export const teamAssociationsSchema = z.object({
	members: z.array(organizationTeamEmployeeSchema).optional().nullable(),
	managers: z.array(organizationTeamEmployeeSchema).optional().nullable(),
	projects: z.array(relationalOrganizationProjectSchema).optional().nullable(),
	tasks: z.array(z.any()).optional()
});

// Main organization team schema
export const organizationTeamSchema = z
	.object({})
	.merge(baseTeamPropertiesSchema)
	.merge(teamAssociationsSchema)
	.passthrough();

// Organization team create schema

export const organizationTeamCreateResponseSchema = z.object({
	name: z.string(),
	tenantId: z.string().uuid(),
	organizationId: z.string().uuid(),
	tenant: z
		.object({
			id: z.string().uuid()
		})
		.optional()
		.nullable(),
	members: z.array(z.any()).optional().nullable(),
	tags: z.array(z.any()).optional(),
	imageUrl: z.string().url().optional().nullable(),
	createdByUserId: z.string().uuid(),
	updatedByUserId: z.string().uuid().nullable(),
	deletedByUserId: z.string().uuid().nullable(),
	isActive: z.boolean(),
	isArchived: z.boolean(),
	archivedAt: z.string().datetime().nullable(),
	startDate: z.string().datetime().nullable(),
	endDate: z.string().datetime().nullable(),
	billing: z.any().nullable(),
	currency: z.any().nullable().optional(),
	public: z.boolean().optional().nullable(),
	owner: z.any().optional().nullable(),
	code: z.string().optional().nullable(),
	description: z.string().optional().nullable(),
	color: z.string().optional().nullable(),
	billable: z.boolean().optional().nullable(),
	billingFlat: z.boolean().optional().nullable(),
	openSource: z.boolean().optional().nullable(),
	projectUrl: z.string().url().optional().nullable(),
	openSourceProjectUrl: z.string().url().optional().nullable(),
	budget: z.number().optional().nullable(),
	budgetType: z.enum(['cost', 'time']).optional().nullable(),
	icon: z.string().optional().nullable(),
	status: z.string().optional().nullable(),
	isTasksAutoSync: z.boolean().optional().nullable(),
	isTasksAutoSyncOnLabel: z.boolean().optional().nullable(),
	syncTag: z.any().optional().nullable(),
	archiveTasksIn: z.any().optional().nullable(),
	closeTasksIn: z.any().nullable().optional(),
	membersCount: z.number().optional().nullable(),
	organizationContactId: z.string().uuid().optional().nullable(),
	imageId: z.string().uuid().optional().nullable(),
	defaultAssigneeId: z.string().uuid().optional().nullable(),
	customFields: z
		.object({
			repositoryId: z.string().nullable(),
			fix_relational_custom_fields: z.any().nullable()
		})
		.optional(),
	deletedAt: z.string().datetime().optional().nullable(),
	createdAt: z.string().datetime().optional().nullable(),
	updatedAt: z.string().datetime().optional().nullable(),
	id: z.string().uuid().optional().nullable(),
	taskListType: z.enum(['GRID', 'KANBAN', 'LIST']).optional().nullable(),

	emoji: z.string().optional().nullable(),
	teamSize: z.string().optional().nullable(),
	memberIds: z.array(z.string()).optional(),
	managerIds: z.array(z.string()).optional(),
	shareProfileView: z.boolean().optional(),
	requirePlanToTrack: z.boolean().optional(),
	image: z.any().optional().nullable(), // Will be properly typed when image asset schema is created
	projects: z.array(z.any()).optional() // Will be properly typed when organization project schema is created
});

export const organizationTeamCreateSchema = z.object({
	name: z.string(),
	tenantId: z.string().uuid(),
	organizationId: z.string().uuid(),
	managerIds: z.array(z.string()).optional(),
	public: z.boolean().optional(),
	projects: z.array(z.any()).optional()
});
// Team request params schema
export const teamRequestParamsSchema = z.object({
	organizationId: z.string(),
	tenantId: z.string(),
	relations: z.array(z.string()).optional()
});

export type TOrganizationTeam = z.infer<typeof organizationTeamSchema>;
export type TOrganizationTeamCreate = z.infer<typeof organizationTeamCreateSchema>;
export type TOrganizationTeamCreateResponse = z.infer<typeof organizationTeamCreateResponseSchema>;
export type TOrganizationTeamUpdate = z.infer<typeof organizationTeamUpdateSchema>;
export type TTeamRequestParams = z.infer<typeof teamRequestParamsSchema>;
