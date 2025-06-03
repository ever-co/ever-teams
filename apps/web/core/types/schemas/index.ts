/**
 * Central export file for all Zod schemas
 *
 * This file provides a single import point for all schema validation
 * functionality in the Ever Teams application.
 */

// Base schemas - Common interfaces used across entities
export * from './common/base.schema';
export * from './common/image-asset.schema';
export * from './common/language.schema';
export * from './common/currency.schema';

// Entity schemas - Specific business domain schemas
export * from './role/role.schema';
export * from './tag/tag.schema';
export * from './organization/organization.schema';
export * from './organization/employee.schema';
export * from './organization/user-organization.schema';
export * from './team/organization-team.schema';
export * from './team/organization-team-employee.schema';
export * from './timer/timer-status.schema';

// Validation utilities - Helper functions for schema validation
export * from './utils/validation';

// Re-export commonly used Zod types for convenience
export { z } from 'zod';

/**
 * Usage Examples:
 *
 * Basic validation:
 * import { roleSchema, validateApiResponse } from '@/core/types/schemas';
 * const validatedRole = validateApiResponse(roleSchema, apiData);
 *
 * Safe validation:
 * import { zodSafeParse, tagSchema } from '@/core/types/schemas';
 * const result = zodSafeParse(tagSchema, apiData);
 *
 * Pagination validation:
 * import { validatePaginationResponse, roleSchema } from '@/core/types/schemas';
 * const validatedRoles = validatePaginationResponse(roleSchema, paginatedData);
 */
