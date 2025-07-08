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
 * Inferred TypeScript types from Zod schemas
 */
export type TEmailVerificationRequest = z.infer<typeof emailVerificationRequestSchema>;
export type TEmailVerificationResponse = z.infer<typeof emailVerificationResponseSchema>;
