import { z } from 'zod';
import { relationalImageAssetSchema, taggableSchema } from '../common/base.schema';
import { basePerTenantAndOrganizationEntityModelSchema } from '../common/tenant-organization.schema';

/**
 * Zod schemas for Organization Team-related interfaces
 */

// Base team properties schema
export const baseTeamPropertiesSchema = z
	.object({
		name: z.string(),
		color: z.string().optional(),
		emoji: z.string().optional(),
		teamSize: z.string().optional(),
		logo: z.string().optional(),
		prefix: z.string().optional(),
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
	members: z.array(z.any()).optional(), // Will be properly typed when organization team employee schema is created
	managers: z.array(z.any()).optional(), // Will be properly typed when organization team employee schema is created
	projects: z.array(z.any()).optional(), // Will be properly typed when organization project schema is created
	tasks: z.array(z.any()).optional() // Will be properly typed when task schema is created
});

// Main organization team schema
export const organizationTeamSchema = z
	.object({})
	.merge(baseTeamPropertiesSchema)
	.merge(teamAssociationsSchema)
	.strict();

// Organization team create schema
export const organizationTeamCreateSchema = z.object({
	name: z.string(),
	color: z.string().optional(),
	emoji: z.string().optional(),
	teamSize: z.string().optional(),
	memberIds: z.array(z.string()).optional(),
	managerIds: z.array(z.string()).optional(),
	tags: z.array(z.any()).optional(),
	organizationId: z.string().optional(),
	tenantId: z.string().optional(),
	shareProfileView: z.boolean().optional(),
	requirePlanToTrack: z.boolean().optional(),
	public: z.boolean().optional(),
	imageId: z.string().optional().nullable(),
	image: z.any().optional().nullable(), // Will be properly typed when image asset schema is created
	projects: z.array(z.any()).optional() // Will be properly typed when organization project schema is created
});

// Organization team update schema
export const organizationTeamUpdateSchema = z
	.object({
		id: z.string()
	})
	.merge(organizationTeamCreateSchema);

// Team request params schema
export const teamRequestParamsSchema = z.object({
	organizationId: z.string(),
	tenantId: z.string(),
	relations: z.array(z.string()).optional()
});
