import { z } from 'zod';

/**
 * Zod schemas for Email Reset related interfaces
 */

// Schema for email reset request parameters
export const emailResetRequestSchema = z.object({
	email: z.string().email('Valid email is required').min(1, 'Email is required')
});

// Schema for verify change email request parameters
export const verifyChangeEmailRequestSchema = z.object({
	code: z.string().min(1, 'Verification code is required')
});

// Schema for success response (common for both operations)
export const emailResetSuccessResponseSchema = z
	.object({
		message: z.string().optional(),
		success: z.boolean().optional(),
		status: z.number().optional()
	})
	.passthrough(); // Allow additional fields from API

// Minimal success response schema for fallback
export const minimalEmailResetSuccessResponseSchema = z
	.object({
		success: z.boolean().default(true)
	})
	.passthrough();

// Types inferred from schemas
export type TEmailResetRequest = z.infer<typeof emailResetRequestSchema>;
export type TVerifyChangeEmailRequest = z.infer<typeof verifyChangeEmailRequestSchema>;
export type TEmailResetSuccessResponse = z.infer<typeof emailResetSuccessResponseSchema>;
export type TMinimalEmailResetSuccessResponse = z.infer<typeof minimalEmailResetSuccessResponseSchema>;
