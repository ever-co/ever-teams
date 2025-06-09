import { z } from 'zod';

/**
 * Zod schemas for Time Log-related interfaces
 */

// Add manual time request schema
export const addManualTimeRequestSchema = z.object({
	employeeId: z.string().min(1, 'Employee ID is required'),
	tenantId: z.string().min(1, 'Tenant ID is required'),
	organizationId: z.string().optional(),
	projectId: z.string().optional(),
	taskId: z.string().optional(),
	organizationContactId: z.string().optional(),
	description: z.string().optional(),
	reason: z.string().optional(),
	startedAt: z.date(),
	stoppedAt: z.date(),
	editedAt: z.date().optional(),
	tags: z.array(z.string()).optional(),
	isBillable: z.boolean().optional(),
	logType: z.string(), // ETimeLogType
	source: z.string() // ETimeLogSource
});

// Time log response schema (for API responses)
// This schema matches the actual API response structure
export const timeLogSchema = z
	.object({
		id: z.string(),
		createdAt: z.coerce.date().optional(),
		updatedAt: z.coerce.date().optional(),
		tenantId: z.string(),
		organizationId: z.string(),
		employeeId: z.string(),
		projectId: z.string().optional().nullable(),
		taskId: z.string().optional().nullable(),
		organizationContactId: z.string().optional().nullable(),
		description: z.string().optional().nullable(),
		reason: z.string().optional().nullable(),
		startedAt: z.string(), // ISO string from API
		stoppedAt: z.string(), // ISO string from API
		editedAt: z.string().optional().nullable(),
		duration: z.coerce.number().min(0),
		isBillable: z.coerce.boolean().optional().nullable(),
		isRunning: z.coerce.boolean().optional().nullable(),
		isEdited: z.coerce.boolean().optional().nullable(),
		logType: z.string().optional().nullable(),
		source: z.string().optional().nullable(),
		version: z.string().optional().nullable(),
		// Additional fields that might be returned by the API
		deletedAt: z.string().optional().nullable(),
		createdByUserId: z.string().optional().nullable(),
		updatedByUserId: z.string().optional().nullable(),
		deletedByUserId: z.string().optional().nullable(),
		isActive: z.coerce.boolean().optional().nullable(),
		isArchived: z.coerce.boolean().optional().nullable(),
		archivedAt: z.string().optional().nullable(),
		timesheetId: z.string().optional().nullable()
	})
	.passthrough(); // Allow any additional fields from API

// Minimal time log schema for essential fields only (fallback option)
export const minimalTimeLogSchema = z
	.object({
		id: z.string(),
		duration: z.coerce.number(),
		startedAt: z.string(),
		stoppedAt: z.string(),
		employeeId: z.string(),
		tenantId: z.string(),
		organizationId: z.string()
	})
	.passthrough(); // Allow any additional fields

// Schema for time log daily report (ITimeLogReportDaily interface)
export const timeLogReportDailySchema = z.object({
	activity: z.number(),
	date: z.string(), // '2024-07-19' format
	sum: z.number() // in seconds
});

// Schema for get timer logs daily report request parameters
export const getTimerLogsDailyReportRequestSchema = z.object({
	tenantId: z.string().min(1, 'Tenant ID is required'),
	organizationId: z.string().min(1, 'Organization ID is required'),
	employeeIds: z.array(z.string().min(1, 'Employee ID is required')).min(1, 'At least one employee ID is required'),
	startDate: z.date(),
	endDate: z.date()
});

// Inferred TypeScript types from Zod schemas
export type TAddManualTimeRequest = z.infer<typeof addManualTimeRequestSchema>;
export type TTimeLog = z.infer<typeof timeLogSchema>;
export type TMinimalTimeLog = z.infer<typeof minimalTimeLogSchema>;
export type TTimeLogReportDaily = z.infer<typeof timeLogReportDailySchema>;
export type TGetTimerLogsDailyReportRequest = z.infer<typeof getTimerLogsDailyReportRequestSchema>;
