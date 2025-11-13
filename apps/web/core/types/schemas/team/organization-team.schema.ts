import { z } from 'zod';
import { taggableSchema } from '../common/base.schema';
import { basePerTenantAndOrganizationEntitySchema } from '../common/tenant-organization.schema';
import { organizationTeamEmployeeSchema, TOrganizationTeamEmployee } from './organization-team-employee.schema';
import { ECurrencies } from '../../generics/enums/currency';
import { organizationSchema } from '../organization/organization.schema';
import { tagSchema, tagZodSchemaType } from '../tag/tag.schema';
import { taskSchema, TTask } from '../task/task.schema';
import { taskStatusSchema } from '../task/task-status.schema';
import { taskPrioritySchema, taskSizeSchema } from '../common/enums.schema';
import { taskIssueTypeSchema } from '../task/task-issue-type.schema';
import { taskVersionSchema } from '../task/task-version.schema';
import { dailyPlanSchema } from '../task/daily-plan.schema';
import { organizationProjectSchema } from '../organization/organization-project.schema';
import { imageAssetSchema } from '../common/image-asset.schema';

/**
 * Zod schemas for Organization Team-related interfaces
 */

// Base team properties schema
export const baseTeamPropertiesSchema = basePerTenantAndOrganizationEntitySchema
	.extend({
		name: z.string(),
		color: z.string().optional().nullable(),
		emoji: z.string().optional().nullable(),
		teamSize: z.string().optional().nullable(),
		logo: z.string().optional(),
		prefix: z.string().optional().nullable(),
		shareProfileView: z.boolean().optional(),
		requirePlanToTrack: z.boolean().optional(),
		public: z.boolean().nullable().optional(),
		profile_link: z.string().optional(),
		image: imageAssetSchema.optional().nullable(),
		imageId: z.string().optional().nullable()
	})
	.merge(taggableSchema);

// Team associations schema

export const teamAssociationsSchema = z
	.object({
		members: z
			.array(z.lazy(() => organizationTeamEmployeeSchema))
			.optional()
			.nullable(),
		managers: z
			.array(z.lazy(() => organizationTeamEmployeeSchema))
			.optional()
			.nullable(),
		projects: z.array(organizationProjectSchema).optional(),
		tasks: z.array(z.lazy(() => taskSchema)).optional(),
		tags: z.array(z.lazy(() => tagZodSchemaType)).optional(),
		requestApprovals: z.array(z.any()).optional().nullable(),
		goals: z.array(z.any()).optional().nullable(),
		statuses: z.array(taskStatusSchema).optional().nullable(),
		priorities: z.array(taskPrioritySchema).optional().nullable(),
		sizes: z.array(taskSizeSchema).optional().nullable(),
		labels: z.array(tagSchema).optional().nullable(),
		issueTypes: z.array(taskIssueTypeSchema).optional().nullable(),
		versions: z.array(taskVersionSchema).optional().nullable(),
		dailyPlans: z
			.array(z.lazy(() => dailyPlanSchema))
			.optional()
			.nullable()
	})
	.passthrough();

// Organization team schema
export const organizationTeamSchema: z.ZodType<TOrganizationTeam> =
	baseTeamPropertiesSchema.merge(teamAssociationsSchema);

// Organization team create schema
export const organizationTeamCreateResponseSchema = baseTeamPropertiesSchema
	.merge(teamAssociationsSchema)
	.omit({
		organization: true,
		members: true,
		projects: true
	})
	.merge(
		z.object({
			organization: z.object({
				id: z.string().uuid()
			})
		})
	);

// Organization team update schema
export const organizationTeamUpdateSchema = z.object({
	tenant: z
		.object({
			id: z.string().uuid().optional().nullable()
		})
		.optional()
		.nullable(),
	tenantId: z.string().nullable().optional(),
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
	organizationId: z.string().nullable().optional(),
	sentTo: z.string().optional(),
	tags: z.array(z.lazy(() => tagZodSchemaType)).optional(), // Allow flexible tags array
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
	projects: z.array(organizationProjectSchema).optional().nullable(),
	id: z.string().optional(),
	name: z.string().optional()
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
export type TOrganizationTeam = z.infer<typeof baseTeamPropertiesSchema> & {
	members?: TOrganizationTeamEmployee[] | null;
	managers?: TOrganizationTeamEmployee[] | null;
	projects?: z.infer<typeof organizationProjectSchema>[] | null;
	tasks?: TTask[] | null;
	tags?: z.infer<typeof tagZodSchemaType>[] | null;
	statuses?: z.infer<typeof taskStatusSchema>[] | null;
	priorities?: z.infer<typeof taskPrioritySchema>[] | null;
	sizes?: z.infer<typeof taskSizeSchema>[] | null;
	labels?: z.infer<typeof tagSchema>[] | null;
	issueTypes?: z.infer<typeof taskIssueTypeSchema>[] | null;
	versions?: z.infer<typeof taskVersionSchema>[] | null;
	dailyPlans?: z.infer<typeof dailyPlanSchema>[] | null;
};
export type TOrganizationTeamCreate = z.infer<typeof organizationTeamCreateSchema>;
export type TOrganizationTeamCreateResponse = z.infer<typeof organizationTeamCreateResponseSchema>;
export type TTeamRequestParams = z.infer<typeof teamRequestParamsSchema>;
export type TOrganizationTeamUpdate = z.infer<typeof organizationTeamUpdateSchema>;

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
	lastLoginAt: z.string().optional().nullable(),
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
