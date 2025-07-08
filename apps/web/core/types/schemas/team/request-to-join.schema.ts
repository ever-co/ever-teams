import { z } from 'zod';

/**
 * Zod schemas for Request to Join Team-related interfaces
 */

// Base join team request schema
export const joinTeamRequestSchema = z
	.object({
		email: z.string().email('Invalid email format'),
		fullName: z.string().min(1, 'Full name is required'),
		linkAddress: z.string().min(1, 'Link address is required'),
		position: z.string().min(1, 'Position is required'),
		organizationTeamId: z.string().min(1, 'Organization team ID is required')
	})
	.passthrough();

// Validate request to join team schema
export const validateRequestToJoinTeamSchema = z
	.object({
		email: z.string().email('Invalid email format'),
		organizationTeamId: z.string().min(1, 'Organization team ID is required'),
		code: z.string().min(1, 'Verification code is required')
	})
	.passthrough();

// Join team response schema
export const joinTeamResponseSchema = z
	.object({
		id: z.string(),
		createdAt: z.string(),
		updatedAt: z.string(),
		status: z.string(),
		email: z.string().email(),
		fullName: z.string(),
		linkAddress: z.string(),
		position: z.string(),
		organizationTeamId: z.string()
	})
	.passthrough();

// Validate response schema (partial of join team response)
export const validateResponseSchema = z
	.object({
		email: z.string().email(),
		organizationTeamId: z.string()
	})
	.passthrough();

// Success response schema for resend code
export const resendCodeResponseSchema = z
	.object({
		data: z
			.object({
				message: z.string().optional(),
				success: z.boolean().optional()
			})
			.passthrough()
	})
	.passthrough();

// Accept/Reject response schema (pagination response)
export const acceptRejectResponseSchema = z
	.object({
		items: z.array(joinTeamResponseSchema),
		total: z.number(),
		page: z.number().optional(),
		limit: z.number().optional()
	})
	.passthrough();

// Get request to join response schema (pagination response)
export const getRequestToJoinResponseSchema = z
	.object({
		items: z.array(joinTeamResponseSchema),
		total: z.number(),
		page: z.number().optional(),
		limit: z.number().optional()
	})
	.passthrough();

// Request parameters schemas for service methods
export const getRequestToJoinParamsSchema = z
	.object({
		organizationId: z.string().optional(),
		tenantId: z.string().optional()
	})
	.passthrough();

export const acceptRejectParamsSchema = z
	.object({
		id: z.string().min(1, 'Request ID is required'),
		action: z.enum(['ACCEPTED', 'REJECTED', 'PENDING'])
	})
	.passthrough();

//  Types inferred from schemas - use these for consistency with validation
export type TJoinTeamRequest = z.infer<typeof joinTeamRequestSchema>;
export type TValidateRequestToJoinTeam = z.infer<typeof validateRequestToJoinTeamSchema>;
export type TJoinTeamResponse = z.infer<typeof joinTeamResponseSchema>;
export type TValidateResponse = z.infer<typeof validateResponseSchema>;
export type TResendCodeResponse = z.infer<typeof resendCodeResponseSchema>;
export type TAcceptRejectResponse = z.infer<typeof acceptRejectResponseSchema>;
export type TGetRequestToJoinResponse = z.infer<typeof getRequestToJoinResponseSchema>;
export type TGetRequestToJoinParams = z.infer<typeof getRequestToJoinParamsSchema>;
export type TAcceptRejectParams = z.infer<typeof acceptRejectParamsSchema>;
