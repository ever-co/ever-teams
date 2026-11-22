import { z } from 'zod';

/**
 * Schema for email verification request parameters
 */
export const emailVerificationRequestSchema = z.object({
	email: z.string().email('Invalid email format'),
	token: z.string().min(1, 'Token is required')
});

/**
 * Schema for email verification response
 * Based on ISuccessResponse interface
 */
export const emailVerificationResponseSchema = z.object({
	status: z.number(),
	message: z.string()
});

/**
 * Gauzy's `GET /auth/email/verify/status`: whether the signed-in user's address is verified, and whether a
 * verification e-mail that is still valid went out to them.
 */
export const emailVerificationStatusSchema = z.object({
	isEmailVerified: z.boolean(),
	verificationEmailSent: z.boolean().optional()
});

/**
 * Inferred TypeScript types from Zod schemas
 */
export type TEmailVerificationRequest = z.infer<typeof emailVerificationRequestSchema>;
export type TEmailVerificationResponse = z.infer<typeof emailVerificationResponseSchema>;
export type TEmailVerificationStatus = z.infer<typeof emailVerificationStatusSchema>;
