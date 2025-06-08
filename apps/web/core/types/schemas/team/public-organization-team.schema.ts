import { z } from 'zod';
import { organizationTeamSchema } from './organization-team.schema';
import { taskSizeSchema } from '../task/task-size.schema';
import { taskPrioritySchema } from '../task/task-priority.schema';
import { taskStatusSchema } from '../task/task-status.schema';
import { tagSchema } from '../tag/tag.schema';

/**
 * Zod schemas for Public Organization Team interfaces
 *
 * This schema is designed to be pixel-perfect with IOrganizationTeam interface
 * from apps/web/core/types/interfaces/team/organization-team.ts
 */

// Note: Using existing schemas from organization-team.schema.ts to avoid conflicts

// Public team data response schema - for the specific API response structure
export const publicTeamDataResponseSchema = organizationTeamSchema.extend({
	// Additional fields that might be returned by the public API
	status: z.number().optional(), // For 404 status handling
	// Misc data fields
	statuses: z.array(taskStatusSchema).optional(),
	sizes: z.array(taskSizeSchema).optional(),
	priorities: z.array(taskPrioritySchema).optional(),
	labels: z.array(tagSchema).optional(),
	issueTypes: z.array(z.any()).optional()
});

// Inferred TypeScript types from Zod schemas - use these for consistency with validation
export type TPublicTeamDataResponse = z.infer<typeof publicTeamDataResponseSchema>;
// Note: Other types (TOrganizationTeam, TOrganizationTeamCreate, etc.) are already exported from organization-team.schema.ts
