import { z } from 'zod';
import { timerStatusEnumSchema, timeLogSourceSchema } from '../common/enums.schema';

/**
 * Zod schemas for Timer Status-related interfaces
 */

// Timer status schema
export const timerStatusSchema = z.object({
	duration: z.number().optional(),
	running: z.boolean().optional(),
	lastLog: z.any().optional(), // Will be properly typed when time log schema is created
	lastWorkedTask: z.any().optional(), // Will be properly typed when task schema is created
	timerStatus: timerStatusEnumSchema.optional()
});

// Local timer status schema
export const localTimerStatusSchema = z.object({
	lastTaskId: z.string().nullable(),
	runnedDateTime: z.number(),
	running: z.boolean()
});

// Get timer status params schema
export const getTimerStatusParamsSchema = z.object({
	source: timeLogSourceSchema.optional(),
	tenantId: z.string(),
	organizationId: z.string()
});

// Update timer status params schema
export const updateTimerStatusParamsSchema = z.object({
	organizationId: z.string(),
	tenantId: z.string(),
	taskId: z.string().optional(),
	logType: z.literal('TRACKED'),
	source: timeLogSourceSchema,
	tags: z.array(z.any()),
	organizationTeamId: z.string().optional()
});

// Toggle timer status params schema
export const toggleTimerStatusParamsSchema = z
	.object({
		logType: z.literal('TRACKED').optional(),
		taskId: z.string()
	})
	.merge(getTimerStatusParamsSchema);
