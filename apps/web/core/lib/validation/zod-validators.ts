/**
 * Zod Validation System
 *
 * Enhanced Zod validators with improved error handling and type safety.
 * Provides consistent validation patterns across API services.
 *
 */

import { z } from 'zod';
import { ZodValidationError } from '@/core/types/schemas';

/**
 * Enhanced validation response with detailed error information
 */
export type ZodValidationResult<T> =
  | {
      success: true;
      data: T;
      normalized: boolean;
    }
  | {
      success: false;
      error: ZodValidationError;
      normalized: boolean;
    };

/**
 * Zod API response validator
 *
 * Validates API responses using Zod schemas with enhanced error handling.
 *
 * @template T - The expected data type
 * @param schema - Zod schema for validation
 * @param data - Raw data from API
 * @param context - Context for error reporting
 * @returns Validation result with success/error information
 *
 * @example
 * ```typescript
 * const result = zodApiResponseValidate(taskSchema, rawApiData, 'getTasks');
 * if (result.success) {
 *   console.log('Data validated:', result.data);
 * } else {
 *   console.error('Validation failed:', result.error);
 * }
 * ```
 */
export function zodApiResponseValidate<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  context: string
): ZodValidationResult<T> {
  try {
    // Validation with enum normalization (title-case → lowercase)
    const result = schema.safeParse(data);

    if (result.success) {
      // Check if normalization occurred by comparing input vs output
      const normalized = JSON.stringify(data) !== JSON.stringify(result.data);

      return {
        success: true,
        data: result.data,
        normalized,
      };
    }

    // If validation fails, create detailed error
    const error = new ZodValidationError(
      `Validation failed in ${context}`,
      result.error.issues
    );

    return {
      success: false,
      error,
      normalized: false, // No normalization on validation failure
    };

  } catch (error) {
    const validationError = error instanceof ZodValidationError
      ? error
      : new ZodValidationError(`Unexpected validation error in ${context}`, []);

    return {
      success: false,
      error: validationError,
      normalized: false,
    };
  }
}

/**
 * Zod pagination response validator
 *
 * Validates paginated API responses using expanded enum schemas.
 *
 * @template T - The item type in the pagination
 * @param itemSchema - Zod schema for individual items
 * @param data - Raw pagination response from API
 * @param context - Context for error reporting
 * @returns Validated pagination response
 */
export function zodPaginationResponseValidate<T>(
  itemSchema: z.ZodSchema<T>,
  data: unknown,
  context: string
): ZodValidationResult<{ items: T[]; total: number }> {
  const paginationSchema = z.object({
    items: z.array(itemSchema),
    total: z.number(),
  });

  return zodApiResponseValidate(paginationSchema, data, context);
}

/**
 * Throws on validation failure, returns data on success
 *
 * This is a convenience function for cases where you want to throw
 * immediately on validation failure (maintaining backward compatibility
 * with existing error handling patterns).
 *
 * @template T - The expected data type
 * @param schema - Zod schema for validation
 * @param data - Raw data from API
 * @param context - Context for error reporting
 * @returns Validated data
 * @throws ZodValidationError if validation fails
 */
export function zodStrictApiResponseValidate<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  context: string
): T {
  const result = zodApiResponseValidate(schema, data, context);

  if (!result.success) {
    throw result.error;
  }

  return result.data;
}

/**
 * Pagination version of zodStrictApiResponseValidate
 */
export function zodStrictPaginationResponseValidate<T>(
  itemSchema: z.ZodSchema<T>,
  data: unknown,
  context: string
): { items: T[]; total: number } {
  const result = zodPaginationResponseValidate(itemSchema, data, context);

  if (!result.success) {
    throw result.error;
  }

  return result.data;
}
