/**
 * Central export file for all Zod schemas
 *
 * This file provides a single import point for all schema validation
 * functionality in the Ever Teams application.
 */

// Base schemas - Common interfaces used across entities
export * from './common/base.schema';
export * from './common/data-response.schema';
export * from './common/image-asset.schema';
export * from './common/language.schema';
export * from './common/currency.schema';

// Entity schemas - Specific business domain schemas
export * from './role/role.schema';
export * from './tag/tag.schema';
export * from './favorite/favorite.schema';
export * from './task/task-status.schema';
export * from './task/task-size.schema';
export * from './task/task-priority.schema';
export * from './task/daily-plan.schema';
export * from './organization/organization.schema';
export * from './organization/employee.schema';
export * from './organization/user-organization.schema';
export * from './organization/organization-project.schema';
export * from './team/organization-team.schema';
export * from './team/organization-team-employee.schema';
export * from './team/public-organization-team.schema';
export * from './timer/timer-status.schema';
export * from './timer/time-limit-report.schema';
export * from './timer/time-log.schema';
export * from './timer/time-slot.schema';

// User schemas
export * from './user/email-reset.schema';
export * from './user/user.schema';
export * from './user/invite.schema';

// Auth schemas
export * from './auth/email-verification.schema';

// Team schemas
export * from './team/request-to-join.schema';

// Activity schemas
export * from './activities/activity.schema';

// Integration schemas
export * from './integrations/integration-type.schema';
export * from './integrations/integration.schema';
export * from './integrations/integration-tenant.schema';
export * from './integrations/github.schema';

// Validation utilities - Helper functions for schema validation
export * from './utils/validation';

// Re-export commonly used Zod types for convenience
export { z } from 'zod';
