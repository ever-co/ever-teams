import { z } from 'zod';

/**
 * Zod schemas for common data response interfaces
 *
 * This schema is designed to be pixel-perfect with data response interfaces
 * from apps/web/core/types/interfaces/common/data-response.ts
 */

// Response status enum schema (ResStatusEnum)
export const resStatusEnumSchema = z.enum(['error', 'success']);

// Response metadata schema (IResponseMetadata)
export const responseMetadataSchema = z.object({
	status: resStatusEnumSchema,
	message: z.string(),
	error: z.any().nullable() // Error object can be complex, using z.any()
});

// Generic data response schema (IDataResponse<T>)
export const dataResponseSchema = <T extends z.ZodRawShape>(dataSchema: z.ZodObject<T>) =>
	responseMetadataSchema.merge(dataSchema);

// Pagination response schema (PaginationResponse<T>)
export const paginationResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
	z.object({
		items: z.array(itemSchema),
		total: z.number()
	});

// Delete response schema (DeleteResponse) - Note: Also exported from user.schema.ts
export const commonDeleteResponseSchema = z.object({
	raw: z.array(z.string()),
	affected: z.number()
});

// Create response schema (CreateResponse<T>)
export const createResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
	z.object({
		data: dataSchema,
		response: z.any() // Response can be any type
	});

// Single data response schema (SingleDataResponse<T>)
export const singleDataResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
	z.object({
		data: dataSchema
	});

// Success response schema (ISuccessResponse)
export const successResponseSchema = z.object({
	status: z.number(),
	message: z.string()
});

// Inferred TypeScript types from Zod schemas - use these for consistency with validation
export type TResStatusEnum = z.infer<typeof resStatusEnumSchema>;
export type TResponseMetadata = z.infer<typeof responseMetadataSchema>;
export type TDataResponse<T = any> = TResponseMetadata & T;
export type TPaginationResponse<T> = {
	items: T[];
	total: number;
};
export type TCommonDeleteResponse = z.infer<typeof commonDeleteResponseSchema>;
export type TCreateResponse<T> = {
	data: T;
	response: any;
};
export type TSingleDataResponse<T> = {
	data: T;
};
export type TSuccessResponse = z.infer<typeof successResponseSchema>;
// Note: TDeleteResponse is exported from user.schema.ts to avoid conflicts
