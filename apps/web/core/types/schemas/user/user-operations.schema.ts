import { z } from 'zod';

/**
 * Zod schemas for User Operations (delete, reset)
 */

// Schema for delete response (based on DeleteResponse interface)
export const deleteResponseSchema = z.object({
	raw: z.array(z.string()),
	affected: z.number()
});

// Schema for user delete request parameters
export const userDeleteRequestSchema = z.object({
	id: z.string().min(1, 'User ID is required')
});

// Schema for user reset request (no parameters needed)
export const userResetRequestSchema = z.object({}).optional();

// Types inferred from schemas
export type TDeleteResponse = z.infer<typeof deleteResponseSchema>;
export type TUserDeleteRequest = z.infer<typeof userDeleteRequestSchema>;
export type TUserResetRequest = z.infer<typeof userResetRequestSchema>;
