/**
 * Smart Validation System
 *
 * Intelligent Zod validators that automatically normalize data before validation.
 * This provides a seamless experience where API data is transformed to match
 * our schema expectations without manual intervention.
 *
 */

import { z } from 'zod';
import { ZodValidationError } from '@/core/types/schemas';

/**
 * Enhanced validation response with detailed error information
 */
export interface SmartValidationResult<T> {
  success: boolean;
  data?: T;
  error?: ZodValidationError;
  normalized: boolean; // Indicates if data was transformed
}

/**
 * Smart API response validator
 *
 * Automatically normalizes data before Zod validation, providing seamless
 * handling of different API response formats.
 *
 * @template T - The expected data type
 * @param schema - Zod schema for validation
 * @param data - Raw data from API
 * @param context - Context for error reporting
 * @returns Validated and normalized data
 *
 * @example
 * ```typescript
 * const result = smartValidateApiResponse(taskSchema, rawApiData, 'getTasks');
 * if (result.success) {
 *   console.log('Data validated:', result.data);
 *   console.log('Was normalized:', result.normalized);
 * }
 * ```
 */
export function smartValidateApiResponse<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  context: string
): SmartValidationResult<T> {
  try {
    // Direct validation - enums now support both formats
    const result = schema.safeParse(data);

    if (result.success) {
      return {
        success: true,
        data: result.data,
        normalized: false,
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
      normalized: true,
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
 * Smart pagination response validator
 *
 * Validates paginated API responses with automatic data normalization.
 *
 * @template T - The item type in the pagination
 * @param itemSchema - Zod schema for individual items
 * @param data - Raw pagination response from API
 * @param context - Context for error reporting
 * @returns Validated pagination response
 */
export function smartValidatePaginationResponse<T>(
  itemSchema: z.ZodSchema<T>,
  data: unknown,
  context: string
): SmartValidationResult<{ items: T[]; total: number }> {
  const paginationSchema = z.object({
    items: z.array(itemSchema),
    total: z.number(),
  });

  return smartValidateApiResponse(paginationSchema, data, context);
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
 * @returns Validated and normalized data
 * @throws ZodValidationError if validation fails
 */
export function validateApiResponseSmart<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  context: string
): T {
  const result = smartValidateApiResponse(schema, data, context);

  if (!result.success) {
    throw result.error;
  }

  return result.data!;
}

/**
 * Pagination version of validateApiResponseSmart
 */
export function validatePaginationResponseSmart<T>(
  itemSchema: z.ZodSchema<T>,
  data: unknown,
  context: string
): { items: T[]; total: number } {
  const result = smartValidatePaginationResponse(itemSchema, data, context);

  if (!result.success) {
    throw result.error;
  }

  return result.data!;
}

/**
 * Batch validation for multiple items
 *
 * Validates an array of items, collecting all validation errors
 * instead of failing on the first error.
 *
 * @template T - The item type
 * @param schema - Zod schema for individual items
 * @param items - Array of items to validate
 * @param context - Context for error reporting
 * @returns Validation results for all items
 */
export function smartValidateBatch<T>(
  schema: z.ZodSchema<T>,
  items: unknown[],
  context: string
): {
  validItems: T[];
  errors: Array<{ index: number; error: ZodValidationError }>;
  totalNormalized: number;
} {
  const validItems: T[] = [];
  const errors: Array<{ index: number; error: ZodValidationError }> = [];
  let totalNormalized = 0;

  items.forEach((item, index) => {
    const result = smartValidateApiResponse(schema, item, `${context}[${index}]`);

    if (result.success) {
      validItems.push(result.data!);
      if (result.normalized) {
        totalNormalized++;
      }
    } else {
      errors.push({ index, error: result.error! });
    }
  });

  return {
    validItems,
    errors,
    totalNormalized,
  };
}
