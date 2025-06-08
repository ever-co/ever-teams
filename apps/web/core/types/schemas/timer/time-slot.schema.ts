import { z } from 'zod';

/**
 * Zod schemas for Time Slot-related interfaces
 */

// Schema for get timer logs request parameters
export const getTimerLogsRequestSchema = z.object({
	tenantId: z.string().min(1, 'Tenant ID is required'),
	organizationId: z.string().min(1, 'Organization ID is required'),
	employeeId: z.string().min(1, 'Employee ID is required'),
	todayEnd: z.date(),
	todayStart: z.date()
});

// Schema for delete time slots request parameters
export const deleteTimeSlotsRequestSchema = z.object({
	tenantId: z.string().min(1, 'Tenant ID is required'),
	organizationId: z.string().min(1, 'Organization ID is required'),
	ids: z.array(z.string().min(1, 'Time slot ID is required')).min(1, 'At least one time slot ID is required'),
	forceDelete: z.boolean().optional().nullable()
});

// Schema for time slot data (API response)
export const timeSlotsDataSchema = z
	.object({
		id: z.string(),
		employeeId: z.string(),
		duration: z.coerce.number().optional(),
		keyboard: z.coerce.number().optional(),
		mouse: z.coerce.number().optional(),
		overall: z.coerce.number().optional(),
		startedAt: z.string().or(z.date()),
		stoppedAt: z.string().or(z.date()).optional(),
		percentage: z.coerce.number().optional(),
		keyboardPercentage: z.coerce.number().optional(),
		mousePercentage: z.coerce.number().optional(),
		isAllowDelete: z.boolean().optional(),
		// Base entity fields
		tenantId: z.string().optional(),
		organizationId: z.string().optional(),
		createdAt: z.string().optional(),
		updatedAt: z.string().optional(),
		// Related entities (optional for flexibility)
		employee: z.any().optional(),
		activities: z.array(z.any()).optional(),
		screenshots: z.array(z.any()).optional(),
		timeLogs: z.array(z.any()).optional(),
		timeSlotMinutes: z.array(z.any()).optional(),
		project: z.any().optional(),
		projectId: z.string().optional(),
		tags: z.array(z.any()).optional()
	})
	.passthrough(); // Allow additional fields from API

// Schema for timer slot data request (API response wrapper)
export const timerSlotDataRequestSchema = z
	.object({
		id: z.string(),
		startedAt: z.string().or(z.date()),
		user: z
			.object({
				imageUrl: z.string(),
				name: z.string()
			})
			.optional(),
		timeSlots: z.array(timeSlotsDataSchema)
	})
	.passthrough();

// Minimal time slot schema for fallback
export const minimalTimeSlotsDataSchema = z
	.object({
		id: z.string(),
		employeeId: z.string(),
		startedAt: z.string().or(z.date())
	})
	.passthrough();

// Types inferred from schemas
export type TGetTimerLogsRequest = z.infer<typeof getTimerLogsRequestSchema>;
export type TDeleteTimeSlotsRequest = z.infer<typeof deleteTimeSlotsRequestSchema>;
export type TTimeSlotsData = z.infer<typeof timeSlotsDataSchema>;
export type TTimerSlotDataRequest = z.infer<typeof timerSlotDataRequestSchema>;
export type TMinimalTimeSlotsData = z.infer<typeof minimalTimeSlotsDataSchema>;
