import { z } from 'zod';
import { ECurrencies } from '../../generics/enums/currency';
import { taggableSchema, idSchema } from '../common/base.schema';
import { basePerTenantAndOrganizationEntityModelSchema } from '../common/tenant-organization.schema';

/**
 * Zod schemas for Employee-related interfaces
 */

// Employee schema
export const employeeSchema = z
	.object({
		id: idSchema,
		endWork: z.coerce.date().optional(),
		startedWorkOn: z.coerce.date().optional(),
		user: z.any(), // Will be properly typed when user schema is created
		userId: idSchema,
		valueDate: z.coerce.date().optional(),
		short_description: z.string().optional(),
		description: z.string().optional(),
		teams: z.array(z.any()).optional(), // Will be properly typed when organization team schema is created
		billRateValue: z.number().optional(),
		billRateCurrency: z.nativeEnum(ECurrencies).optional(),
		minimumBillingRate: z.number().optional(),
		reWeeklyLimit: z.number().optional(),
		projects: z.array(z.any()).optional(), // Will be properly typed when organization project schema is created
		offerDate: z.coerce.date().optional(),
		acceptDate: z.coerce.date().optional(),
		rejectDate: z.coerce.date().optional(),
		employeeLevel: z.string().optional(),
		anonymousBonus: z.boolean().optional(),
		timesheets: z.array(z.any()).optional(), // Will be properly typed when timesheet schema is created
		tasks: z.array(z.any()).optional(), // Will be properly typed when task schema is created
		timeSlots: z.array(z.any()).optional(), // Will be properly typed when time slot schema is created
		averageIncome: z.number().optional(),
		totalWorkHours: z.number().optional(),
		averageExpenses: z.number().optional(),
		averageBonus: z.number().optional(),
		show_anonymous_bonus: z.boolean().optional(),
		show_average_bonus: z.boolean().optional(),
		show_average_expenses: z.boolean().optional(),
		show_average_income: z.boolean().optional(),
		show_billrate: z.boolean().optional(),
		show_payperiod: z.boolean().optional(),
		isJobSearchActive: z.boolean().optional(),
		linkedInUrl: z.string().optional(),
		facebookUrl: z.string().optional(),
		instagramUrl: z.string().optional(),
		twitterUrl: z.string().optional(),
		githubUrl: z.string().optional(),
		gitlabUrl: z.string().optional(),
		upworkUrl: z.string().optional(),
		stackoverflowUrl: z.string().optional(),
		jobSuccess: z.number().optional(),
		isVerified: z.boolean().optional(),
		isVetted: z.boolean().optional(),
		totalJobs: z.number().optional(),
		fullName: z.string().optional(),
		profile_link: z.string().optional(),
		isTrackingEnabled: z.boolean(),
		isDeleted: z.boolean().optional(),
		allowScreenshotCapture: z.boolean().optional(),
		allowManualTime: z.boolean().optional(),
		allowModifyTime: z.boolean().optional(),
		allowDeleteTime: z.boolean().optional(),
		upworkId: z.string().optional(),
		linkedInId: z.string().optional(),
		isOnline: z.boolean().optional(),
		isTrackingTime: z.boolean().optional(),
		isAway: z.boolean().optional()
	})
	.merge(basePerTenantAndOrganizationEntityModelSchema)
	.merge(taggableSchema)
	.strict();

// Create employee schema
export const createEmployeeSchema = z.object({
	tenantId: z.string(),
	userId: z.string(),
	organizationId: z.string(),
	startedWorkOn: z.coerce.date().optional()
});

// Update employee schema
export const updateEmployeeSchema = z.object({
	id: z.string(),
	isTrackingEnabled: z.boolean(),
	organizationId: z.string(),
	tenantId: z.string(),
	isActive: z.boolean()
});

// Member card editable values schema
export const memberCardEditableValuesSchema = z.object({
	memberName: z.string(),
	memberTask: z.string(),
	estimateHours: z.number(),
	estimateMinutes: z.number()
});
