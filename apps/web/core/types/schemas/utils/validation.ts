import { z } from 'zod';

/**
 * Utility functions for Zod schema validation
 */

// Custom error class for validation errors
export class ZodValidationError extends Error {
	public readonly issues: z.ZodIssue[];

	constructor(message: string, issues: z.ZodIssue[]) {
		super(message);
		this.name = 'ValidationError';
		this.issues = issues;
	}
}

/**
 * Generic function to parse data with a Zod schema
 * Throws clear exceptions on invalid data
 *
 * @param schema - The Zod schema to validate against
 * @param data - The data to validate
 * @param context - Optional context for error messages
 * @returns Parsed and validated data
 * @throws ValidationError if validation fails
 */
export function zodParse<T>(schema: z.ZodSchema<T>, data: unknown, context?: string): T {
	const result = schema.safeParse(data);

	if (!result.success) {
		const contextMessage = context ? ` in ${context}` : '';
		const errorMessage = `Validation failed${contextMessage}: ${result.error.issues
			.map((issue) => `${issue.path.join('.')}: ${issue.message}`)
			.join(', ')}`;

		throw new ZodValidationError(errorMessage, result.error.issues);
	}

	return result.data;
}

/**
 * Safe parsing function that returns a result object instead of throwing
 * Useful for graceful error handling
 *
 * @param schema - The Zod schema to validate against
 * @param data - The data to validate
 * @returns Object with success flag and either data or error
 */
export function zodSafeParse<T>(
	schema: z.ZodSchema<T>,
	data: unknown
): { success: true; data: T } | { success: false; error: ZodValidationError } {
	const result = schema.safeParse(data);

	if (result.success) {
		return { success: true, data: result.data };
	}

	const errorMessage = `Validation failed: ${result.error.issues
		.map((issue) => `${issue.path.join('.')}: ${issue.message}`)
		.join(', ')}`;

	return {
		success: false,
		error: new ZodValidationError(errorMessage, result.error.issues)
	};
}

/**
 * Validates API response data with pagination
 *
 * @param itemSchema - Schema for individual items
 * @param data - The paginated response data
 * @param context - Optional context for error messages
 * @returns Validated pagination response
 */
export function validatePaginationResponse<T>(
	itemSchema: z.ZodSchema<T>,
	data: unknown,
	context?: string
): { items: T[]; total: number } {
	const paginationSchema = z.object({
		items: z.array(itemSchema),
		total: z.number()
	});

	return zodParse(paginationSchema, data, context);
}

/**
 * Validates a single API response item
 *
 * @param schema - The Zod schema to validate against
 * @param data - The response data
 * @param context - Optional context for error messages
 * @returns Validated data
 */
export function validateApiResponse<T>(schema: z.ZodSchema<T>, data: unknown, context?: string): T {
	return zodParse(schema, data, context);
}

/**
 * Creates a validation middleware for API responses
 *
 * @param schema - The Zod schema to validate against
 * @param context - Optional context for error messages
 * @returns Function that validates data
 */
export function createValidator<T>(schema: z.ZodSchema<T>, context?: string) {
	return (data: unknown): T => zodParse(schema, data, context);
}

/**
 * Utility to format validation errors for user display
 *
 * @param error - The validation error
 * @returns Formatted error message
 */
export function formatValidationError(error: ZodValidationError): string {
	return error.issues
		.map((issue) => {
			const path = issue.path.length > 0 ? `${issue.path.join('.')}: ` : '';
			return `${path}${issue.message}`;
		})
		.join('\n');
}
