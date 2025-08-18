import { z } from 'zod';
import { basePerTenantAndOrganizationEntitySchema } from '../task/task.schema';
import { relationalOrganizationProjectSchema, relationalOrganizationTeamSchema } from '../common/base.schema';
import { ETimeLogSource, ETimeLogType } from '../../generics/enums/timer';
import { ETimesheetStatus } from '../../generics/enums/timesheet';
import { employeeSchema } from '../organization/employee.schema';

/**
 * Zod schemas for Time Log-related interfaces
 */

export const timeLogSchema = z
	.object({
		employeeId: z.string(),
		employee: employeeSchema.optional().nullable(),
		projectId: z.string().optional().nullable(),
		taskId: z.string().optional().nullable(),
		organizationContactId: z.string().optional().nullable(),
		description: z.string().optional().nullable(),
		reason: z.string().optional().nullable(),
		startedAt: z.string(),
		stoppedAt: z.string(),
		editedAt: z.string().optional().nullable(),
		duration: z.coerce.number().min(0),
		isBillable: z.coerce.boolean().optional().nullable(),
		isRunning: z.coerce.boolean().optional().nullable(),
		isEdited: z.coerce.boolean().optional().nullable(),
		logType: z.nativeEnum(ETimeLogType).optional().nullable(),
		source: z.nativeEnum(ETimeLogSource).optional().nullable(),
		version: z.string().optional().nullable(),
		timesheetId: z.string().optional().nullable()
	})
	.merge(relationalOrganizationProjectSchema)
	.merge(relationalOrganizationTeamSchema)
	.merge(basePerTenantAndOrganizationEntitySchema);

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
	logType: z.nativeEnum(ETimeLogType),
	source: z.nativeEnum(ETimeLogSource)
});

export const timerLogFiltersSchema = z.object({
	date: z.date().or(z.string()).optional(),
	startDate: z.date().or(z.string()).optional(),
	endDate: z.date().or(z.string()),
	isCustomDate: z.boolean().optional(),
	employeeIds: z.array(z.string()).optional(),
	projectIds: z.array(z.string()).optional(),
	teamIds: z.array(z.string()).optional(),
	taskIds: z.array(z.string()).optional(),
	logType: z.nativeEnum(ETimeLogType).optional(),
	source: z.nativeEnum(ETimeLogSource).optional(),
	activityLevel: z
		.object({
			start: z.number(),
			end: z.number()
		})
		.optional(),
	defaultRange: z.boolean().optional(),
	unitOfTime: z.any().optional(),
	categoryId: z.string().optional(),
	timeZone: z.string().optional(),
	timeFormat: z.string().optional(),
	status: z.array(z.nativeEnum(ETimesheetStatus)).optional()
});

export const timerLogRequestSchema = z
	.object({
		onlyMe: z.boolean().optional(),
		timesheetId: z.string().optional()
	})
	.merge(timerLogFiltersSchema);

export const timerLogReportRequestSchema = z
	.object({
		isEdited: z.boolean().optional(),
		groupBy: z.enum(['date', 'employee', 'project', 'client']).optional()
	})
	.merge(timerLogRequestSchema);

// Schema for get timer logs daily report request parameters
export const getTimerLogsDailyReportRequestSchema = z.object({
	employeeIds: z.array(z.string().min(1, 'Employee ID is required')).min(1, 'At least one employee ID is required'),
	startDate: z.date(),
	endDate: z.date()
});

const employeeLogSchema = z.object({
	employee: employeeSchema,
	sum: z.number(),
	tasks: z.array(z.any()),
	activity: z.number()
});

export const logSchema = z.object({
	employeeLogs: z.array(employeeLogSchema),
	project: z.any().nullable()
	// Add other fields as needed
});

export const timeLogReportDailySchema = z.object({
	date: z.string(),
	logs: z.array(logSchema),
	sum: z.number(),
	activity: z.number()
});

// Inferred TypeScript types from Zod schemas
export type TAddManualTimeRequest = z.infer<typeof addManualTimeRequestSchema>;
export type TTimeLog = z.infer<typeof timeLogSchema>;
export type TTimeLogReportDaily = z.infer<typeof timeLogReportDailySchema>;
export type TGetTimerLogsDailyReportRequest = z.infer<typeof timerLogReportRequestSchema>;
