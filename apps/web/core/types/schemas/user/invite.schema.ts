import { z } from 'zod';
import { basePerTenantAndOrganizationEntityModelSchema } from '../common/tenant-organization.schema';
import { inviteStatusSchema } from '../common/enums.schema';
import { idSchema } from '../common/base.schema';
import { userSchema } from './user.schema';
import { organizationTeamSchema } from '../team/organization-team.schema';

/**
 * Zod schemas for Invitation-related interfaces
 */

// Base invite schema (IInviteBase interface) - Made more flexible for API inconsistencies
export const baseInviteSchema = basePerTenantAndOrganizationEntityModelSchema
	.extend({
		email: z.string().email('Valid email is required').optional().nullable(),
		token: z.string().optional().nullable(),
		code: z.string().optional(),
		status: inviteStatusSchema.optional().nullable(),
		expireDate: z.coerce.date().optional().nullable(), // API returns string, keep as string for consistency
		actionDate: z.string().optional(), // API returns string, keep as string for consistency
		fullName: z.string().optional(),
		isExpired: z.boolean().optional()
	})
	.passthrough(); // - Allow additional fields from API

// Invite associations schema (IInviteAssociations interface)
// Using z.any() for complex schemas not yet imported to avoid circular dependencies
export const inviteAssociationsSchema = z.object({
	id: z.string().optional().nullable(),
	user: z.any().optional(), // TUser - will be properly typed when userSchema is available
	userId: idSchema.optional().nullable(),
	role: z.any().optional(), // IRole - will be properly typed when roleSchema is available
	roleId: idSchema.optional(),
	projects: z.array(z.any()).optional(), // IOrganizationProject[] - schema not created yet
	teams: z.array(z.any()).optional() // IOrganizationTeam[] - schema not created yet
});

// Main invite schema (IInvite interface)
export const inviteSchema = baseInviteSchema.merge(inviteAssociationsSchema).extend({
	invitedByUser: z.any().optional(), // TUser - will be properly typed when userSchema is available
	invitedByUserId: idSchema.optional()
});

// Invite create schema (IInviteCreate interface)
export const inviteCreateSchema = z.object({
	emailIds: z.array(z.string().email('Valid email is required')),
	projectIds: z.array(z.string()).optional(),
	departmentIds: z.array(z.string()).optional(),
	organizationContactIds: z.array(z.string()).optional(),
	teamIds: z.array(z.string()),
	inviteType: z.literal('TEAM'),
	appliedDate: z.null().optional(),
	invitationExpirationPeriod: z.union([z.literal('Never'), z.number()]),
	roleId: z.string(),
	organizationId: z.string(),
	fullName: z.string(),
	callbackUrl: z.string().optional(),
	startedWorkOn: z.string()
});

// Invite verify code schema (IInviteVerifyCode interface)
export const inviteVerifyCodeSchema = z.object({
	email: z.string().email('Valid email is required'),
	code: z.string().min(1, 'Verification code is required')
});

// Invite verified schema (IInviteVerified interface)
export const inviteVerifiedSchema = z.object({
	id: z.string(),
	email: z.string().email(),
	fullName: z.string(),
	organization: z.object({
		name: z.string(),
		image: z.string().nullable()
	})
});

// Invite request schema (IInviteRequest interface)
export const inviteRequestSchema = z.object({
	email: z.string().email('Valid email is required'),
	name: z.string().min(1, 'Name is required'),
	teamId: z.string(),
	organizationId: z.string()
});

// Invite resend operation result schema (TypeORM UpdateResult)
export const inviteResendResultSchema = z.object({
	generatedMaps: z.array(z.any()),
	raw: z.array(z.any()),
	affected: z.number().optional().nullable()
});

export const validateInviteByTokenAndEmailRequest = z.object({
	token: z.string(),
	email: z.string()
});

export const acceptInvitationRequest = z.object({
	user: z.object({
		firstName: z.string(),
		lastName: z.string(),
		email: z.string(),
		role: z.string().optional(),
		tenant: z.string().optional()
	}),
	password: z.string(),
	email: z.string(),
	code: z.string(),
	token: z.string().optional(),
	inviteId: z.string().optional(),
	originalUrl: z.string().optional(),
	organizationId: z.string().optional(),
	createdByUserId: z.string().optional(),
	isImporting: z.boolean().optional(),
	sourceId: z.string().optional(),
	inviteType: z.string().optional()
});

export const invitationAcceptedResponse = z.object({
	user: userSchema,
	token: z.string(),
	refresh_token: z.string(),
	team: organizationTeamSchema
});

export enum EInvitationState {
	IDLE = 'idle',
	LOADING = 'loading',
	VALIDATED = 'validated',
	FAILED = 'failed'
}

type TInvitationValidated = {
	state: EInvitationState.VALIDATED;
	loading: false;
	data: TInviteVerified;
	error: null;
};

type TInvitationValidationFailed = {
	state: EInvitationState.FAILED;
	loading: false;
	data: null;
	error: unknown;
};

type TInvitationLoading = {
	state: EInvitationState.LOADING;
	loading: true;
	data: null;
	error: null;
};

type TInvitationIdle = {
	state: EInvitationState.IDLE;
	data: null;
	error: null;
};

export type TInvitationState =
	| TInvitationValidated
	| TInvitationValidationFailed
	| TInvitationLoading
	| TInvitationIdle;

// Inferred TypeScript types from Zod schemas - use these for consistency with validation
export type TBaseInvite = z.infer<typeof baseInviteSchema>;
export type TInviteAssociations = z.infer<typeof inviteAssociationsSchema>;
export type TInvite = z.infer<typeof inviteSchema>;
export type TInviteCreate = z.infer<typeof inviteCreateSchema>;
export type TInviteVerifyCode = z.infer<typeof inviteVerifyCodeSchema>;
export type TInviteVerified = z.infer<typeof inviteVerifiedSchema>;
export type TInviteRequest = z.infer<typeof inviteRequestSchema>;
export type TInviteResendResult = z.infer<typeof inviteResendResultSchema>;
export type TValidateInviteRequest = z.infer<typeof validateInviteByTokenAndEmailRequest>;
export type TAcceptInvitationRequest = z.infer<typeof acceptInvitationRequest>;
export type TInvitationAcceptedResponse = z.infer<typeof invitationAcceptedResponse>;
