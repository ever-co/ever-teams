import { z } from 'zod';
import { uuIdSchema, relationalImageAssetSchema, taggableSchema } from '../common/base.schema';
import { basePerTenantAndOrganizationEntityModelSchema } from '../common/tenant-organization.schema';
import { organizationTeamEmployeeSchema } from './organization-team-employee.schema';
import { EProjectBilling, EProjectOwner } from '../../generics/enums/project';
import { ETaskListType, ETaskStatusName } from '../../generics/enums/task';
import { ECurrencies } from '../../generics/enums/currency';
import { organizationSchema } from '../organization/organization.schema';
import { teamSchema } from './team.schema';

export const baseProjectSchema = z.object({
	deletedAt: z.coerce.date().optional().nullable(),
	createdAt: z.coerce.date().optional().nullable(),
	updatedAt: z.coerce.date().optional().nullable(),
	id: z.string(),
	isActive: z.boolean(),
	isArchived: z.boolean(),
	archivedAt: z.coerce.date().optional().nullable(),
	tenantId: z.string(),
	organizationId: z.string(),
	name: z.string(),
	startDate: z.string().or(z.coerce.date()).optional().nullable(),
	endDate: z.string().or(z.coerce.date()).optional().nullable(),
	billing: z.nativeEnum(EProjectBilling).optional().nullable(),
	currency: z.nativeEnum(ECurrencies).or(z.string()).optional().nullable(), // idem
	public: z.boolean().nullable(),
	owner: z.nativeEnum(EProjectOwner).optional().nullable(),
	taskListType: z.nativeEnum(ETaskListType).optional().nullable(),
	code: z.string().nullable(),
	description: z.string().nullable(),
	color: z.string().nullable(),
	billable: z.boolean().nullable(),
	billingFlat: z.boolean().nullable(),
	openSource: z.boolean().nullable(),
	projectUrl: z.string().nullable(),
	openSourceProjectUrl: z.string().nullable(),
	budget: z.number().nullable(),
	budgetType: z.enum(['cost', 'hours']).optional(),
	imageUrl: z.string().nullable(),
	icon: z.string().nullable(),
	status: z.nativeEnum(ETaskStatusName).nullable(),
	isTasksAutoSync: z.boolean().nullable(),
	isTasksAutoSyncOnLabel: z.boolean().nullable(),
	syncTag: z.string().nullable(),
	archiveTasksIn: z.number().nullable(),
	closeTasksIn: z.number().nullable(),
	organizationContactId: z.string().nullable(),
	imageId: z.string().nullable(),
	defaultAssigneeId: z.string().nullable(),
	repository: z
		.object({
			repositoryId: z.string().optional().nullable(),
			repositoryName: z.string().optional().nullable()
		})
		.optional()
		.nullable()
});

// Organization team update schema
export const organizationTeamUpdateSchema = z.object({
	tenant: z
		.object({
			id: z.string().uuid().optional().nullable()
		})
		.optional()
		.nullable(),
	tenantId: z.string().optional(),
	organization: organizationSchema
		.merge(
			z.object({
				name: z.string(),
				currency: z.nativeEnum(ECurrencies).or(z.string()).optional().nullable(),
				isDefault: z.boolean().optional().nullable()
			})
		)
		.optional()
		.nullable(),
	organizationId: z.string().optional(),
	sentTo: z.string().optional(),
	tags: z.array(z.any()).optional(), // Allow flexible tags array
	memberIds: z.array(z.string()).optional(),
	managerIds: z.array(z.string()).optional(),
	logo: z.string().optional().nullable(),
	prefix: z.string().optional().nullable(),
	shareProfileView: z.boolean().optional(),
	requirePlanToTrack: z.boolean().optional(),
	imageId: z.string().optional().nullable(),
	image: z.any().optional().nullable(),
	public: z.boolean().nullable().optional(),
	color: z.string().nullable().optional(),
	emoji: z.string().nullable().optional(),
	teamSize: z.string().nullable().optional(),
	projects: z.array(baseProjectSchema).optional(),
	id: z.string().optional(),
	name: z.string().optional()
});

/**
 * Zod schemas for Organization Team-related interfaces
 */

// Base team properties schema
export const baseTeamPropertiesSchema = z
	.object({
		id: z.lazy(() => uuIdSchema),
		name: z.string(),
		color: z.string().optional().nullable(),
		emoji: z.string().optional().nullable(),
		teamSize: z.string().optional().nullable(),
		logo: z.string().optional(),
		prefix: z.string().optional().nullable(),
		shareProfileView: z.boolean().optional(),
		requirePlanToTrack: z.boolean().optional(),
		public: z.boolean().nullable(),
		profile_link: z.string().optional()
	})
	.merge(basePerTenantAndOrganizationEntityModelSchema)
	.merge(relationalImageAssetSchema)
	.merge(taggableSchema);

// Team associations schema

export const teamAssociationsSchema = z.object({
	members: z
		.array(z.lazy(() => organizationTeamEmployeeSchema))
		.optional()
		.nullable(),
	managers: z
		.array(z.lazy(() => organizationTeamEmployeeSchema))
		.optional()
		.nullable(),
	projects: z.array(baseProjectSchema).optional(),
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
	archivedAt: z.coerce.date().optional().nullable(),
	startDate: z.coerce.date().optional().nullable(),
	endDate: z.coerce.date().optional().nullable(),
	billing: z.any().nullable(),
	currency: z.nativeEnum(ECurrencies).or(z.string()).optional().nullable(),
	public: z.boolean().nullable(),
	owner: z.any().optional().nullable(),
	code: z.string().nullable().optional(),
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
	deletedAt: z.coerce.date().optional().nullable(),
	createdAt: z.coerce.date().optional(),
	updatedAt: z.coerce.date().optional(),
	id: uuIdSchema,
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
	public: z.boolean().nullable(),
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
export type TTeamRequestParams = z.infer<typeof teamRequestParamsSchema>;

/**
 * Schema for workspace tenant information
 */
export const workspaceTenantSchema = z.object({
	id: z.string(),
	name: z.string(),
	logo: z.string().optional()
});

/**
 * Schema for workspace user information
 */
export const workspaceUserSchema = z.object({
	id: z.string(),
	email: z.string().email(),
	name: z.string(),
	imageUrl: z.string().optional(),
	lastTeamId: z.string().nullable(),
	lastLoginAt: z.string(),
	tenant: workspaceTenantSchema
});

/**
 * Schema for current teams in workspace
 */
export const workspaceTeamSchema = z.object({
	team_id: z.string(),
	team_name: z.string(),
	team_logo: z.string().optional(),
	team_member_count: z.string(),
	profile_link: z.string(),
	prefix: z.string().nullable()
});

/**
 * Schema for individual workspace data (from API response)
 */
export const workspaceDataSchema = z.object({
	user: workspaceUserSchema,
	token: z.string(),
	current_teams: z.array(workspaceTeamSchema)
});

/**
 * Schema for complete workspace response from /auth/workspaces endpoint
 */
export const workspaceResponseSchema = z.object({
	workspaces: z.array(workspaceDataSchema),
	confirmed_email: z.string().email(),
	show_popup: z.boolean(),
	total_workspaces: z.number()
});

// Export types for the new schemas
export type TWorkspaceTenant = z.infer<typeof workspaceTenantSchema>;
export type TWorkspaceUser = z.infer<typeof workspaceUserSchema>;
export type TWorkspaceTeam = z.infer<typeof workspaceTeamSchema>;
export type TWorkspaceResponse = z.infer<typeof workspaceResponseSchema>;

// TWorkspace type based on real data structure (workspace-data.json)
export type TWorkspace = z.infer<typeof workspaceDataSchema>;
