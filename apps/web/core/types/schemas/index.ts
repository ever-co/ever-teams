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
export * from './task/task-status.schema';
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
