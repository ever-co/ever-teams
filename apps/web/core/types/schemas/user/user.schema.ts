import { z } from 'zod';
import {
	basePerTenantEntityModelSchema,
	relationalEmployeeSchema,
	relationalImageAssetSchema
} from '../common/base.schema';
import { tagSchema } from '../tag/tag.schema';
import { roleSchema } from '../role/role.schema';
import { userOrganizationSchema } from '../organization/user-organization.schema';
import { organizationSchema } from '../organization/organization.schema';
import { organizationTeamSchema } from '../team/organization-team.schema';

/**
 * Zod schemas for User entity and operations (consolidated)
 */

// =============================================================================
// USER OPERATIONS SCHEMAS (from user-operations.schema.ts)
// =============================================================================

// Schema for user delete request parameters
export const userDeleteRequestSchema = z.object({
	id: z.string().min(1, 'User ID is required')
});

// Schema for user reset request (no parameters needed)
export const userResetRequestSchema = z.object({}).optional();

// Schema for delete response (based on DeleteResponse interface)
export const deleteResponseSchema = z.object({
	raw: z.array(z.string()),
	affected: z.number()
});

// Schema for user update avatar request parameters
export const userUpdateAvatarRequestSchema = z.object({
	id: z.string().min(1, 'User ID is required'),
	imageId: z.string().nullable().optional(),
	imageUrl: z.string().nullable().optional(),
	phoneNumber: z.string().nullable().optional(),
	firstName: z.string().nullable().optional(),
	lastName: z.string().nullable().optional(),
	email: z.string().email().nullable().optional(),
	name: z.string().nullable().optional()
});

// =============================================================================
// USER ENTITY SCHEMAS
// =============================================================================

// Invite schema (simplified)
const inviteSchema = z.object({
	id: z.string(),
	email: z.string(),
	status: z.string().optional(),
	tenantId: z.string().optional(),
	organizationId: z.string().optional(),
	createdAt: z.coerce.date().optional(),
	updatedAt: z.coerce.date().optional()
});

// Social account schema (simplified)
export const socialAccountSchema = z.object({
	id: z.string(),
	provider: z.string(),
	providerAccountId: z.string(),
	userId: z.string(),
	createdAt: z.coerce.date().optional(),
	updatedAt: z.coerce.date().optional()
});

const baseUserSchema = z
	.object({
		thirdPartyId: z.string().nullable().optional(),
		name: z.string().nullable().optional(),
		firstName: z.string().nullable().optional(),
		lastName: z.string().nullable().optional(),
		email: z.string().nullable().optional(),
		phoneNumber: z.string().nullable().optional(),
		username: z.string().nullable().optional(),
		timeZone: z.string().nullable().optional(),
		timeFormat: z
			.union([z.literal(12), z.literal(24)])
			.nullable()
			.optional(),
		role: roleSchema.optional().nullable(),
		roleId: z.string().nullable().optional(),
		hash: z.string().nullable().optional(),
		candidateId: z.string().nullable().optional(),
		defaultTeam: organizationTeamSchema.optional(),
		defaultTeamId: z.string().nullable().optional(),
		lastTeam: organizationTeamSchema.optional(),
		lastTeamId: z.string().nullable().optional(),
		defaultOrganization: organizationSchema.optional(),
		defaultOrganizationId: z.string().nullable().optional(),
		lastOrganization: organizationSchema.optional(),
		lastOrganizationId: z.string().nullable().optional(),
		tags: z.array(tagSchema).optional(),
		preferredLanguage: z.string().nullable().optional(),
		fullName: z.string().nullable().optional(),
		organizations: z.array(userOrganizationSchema).optional(),
		isImporting: z.boolean().optional(),
		sourceId: z.string().nullable().optional(),
		code: z.string().nullable().optional(),
		codeExpireAt: z.string().optional(),
		emailVerifiedAt: z.string().optional(),
		lastLoginAt: z.string().optional().nullable(),
		isEmailVerified: z.boolean().optional(),
		emailToken: z.string().nullable().optional(),
		invites: z.array(inviteSchema).optional(),
		socialAccounts: z.array(socialAccountSchema).optional()
	})
	.merge(basePerTenantEntityModelSchema)
	.merge(relationalImageAssetSchema);

export const userZodSchemaType: z.ZodType<TUser> = baseUserSchema.merge(relationalEmployeeSchema);

// User schema
export const userSchema = basePerTenantEntityModelSchema
	.merge(relationalImageAssetSchema)
	.merge(baseUserSchema)
	.merge(relationalEmployeeSchema);

// =============================================================================
// EXPORTED TYPES
// =============================================================================

// User entity type
export type TUser = z.infer<typeof userSchema> & z.infer<typeof relationalEmployeeSchema>;

// Types inferred from schemas
export type TDeleteResponse = z.infer<typeof deleteResponseSchema>;
// User operations types (TDeleteResponse is exported from base.schema.ts)
export type TUserDeleteRequest = z.infer<typeof userDeleteRequestSchema>;
export type TUserResetRequest = z.infer<typeof userResetRequestSchema>;
export type TUserUpdateAvatarRequest = z.infer<typeof userUpdateAvatarRequestSchema>;
