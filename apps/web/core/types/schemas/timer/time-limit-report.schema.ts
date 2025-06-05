import { z } from 'zod';

/**
 * Zod schemas for Time Limit Report-related interfaces
 */

// Time limit report request parameters schema
export const getTimeLimitReportSchema = z.object({
	organizationId: z.string().min(1, 'Organization ID is required'),
	tenantId: z.string().min(1, 'Tenant ID is required'),
	startDate: z.string().optional(),
	endDate: z.string().optional(),
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
				employee: z
					.object({
						id: z.string(),
						userId: z.string(),
						fullName: z.string().optional()
						// Allow any additional employee fields from API
					})
					.passthrough(),
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

// Inferred TypeScript types from Zod schemas
export type TGetTimeLimitReport = z.infer<typeof getTimeLimitReportSchema>;
export type TTimeLimitReportList = z.infer<typeof timeLimitReportListSchema>;
export type TMinimalTimeLimitReportList = z.infer<typeof minimalTimeLimitReportListSchema>;
