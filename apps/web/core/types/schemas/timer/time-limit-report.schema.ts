import { z } from 'zod';
import { employeeSchema } from '../organization/employee.schema';

/**
 * Zod schemas for Time Limit Report-related interfaces
 */

// Time limit report request parameters schema
export const getTimeLimitReportSchema = z.object({
	startDate: z.coerce.date().optional(),
	endDate: z.coerce.date().optional(),
	employeeIds: z.array(z.string()).optional(),
	groupBy: z.string().optional(),
	timeZone: z.string().optional(),
	duration: z.string().optional()
});

// Time limit report list schema (for API responses)
// This schema matches the actual API response structure
export const timeLimitReportListSchema = z
	.object({
		date: z.string(),
		employees: z.array(
			z.object({
				employee: z.lazy(() => employeeSchema),
				duration: z.coerce.number().min(0),
				durationPercentage: z.coerce.number().min(0).max(100),
				limit: z.coerce.number().min(0)
			})
		)
	})
	.passthrough(); // Allow any additional fields from API

// Minimal time limit report schema for essential fields only (fallback option)
export const minimalTimeLimitReportListSchema = z
	.object({
		date: z.string(),
		employees: z.array(
			z.object({
				duration: z.coerce.number(),
				limit: z.coerce.number()
			})
		)
	})
	.passthrough(); // Allow any additional fields

export const timeLimitReportByEmployeeSchema = z.object({
	employee: z.lazy(() => employeeSchema),
	reports: z.array(
		z.object({
			date: z.string(),
			duration: z.coerce.number(),
			durationPercentage: z.coerce.number(),
			limit: z.coerce.number()
		})
	)
});
// Inferred TypeScript types from Zod schemas
export type TGetTimeLimitReport = z.infer<typeof getTimeLimitReportSchema>;
export type TTimeLimitReportList = z.infer<typeof timeLimitReportListSchema>;
export type TMinimalTimeLimitReportList = z.infer<typeof minimalTimeLimitReportListSchema>;
export type TTimeLimitReportByEmployee = z.infer<typeof timeLimitReportByEmployeeSchema>;
