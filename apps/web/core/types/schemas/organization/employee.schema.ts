import { z } from 'zod';
import { ECurrencies } from '../../generics/enums/currency';
import { taggableSchema, uuIdSchema } from '../common/base.schema';
import { basePerTenantAndOrganizationEntitySchema } from '../common/tenant-organization.schema';
import { teamSchema } from '../team/team.schema';
import { relationalUserSchema } from '../user/user.schema';

/**
 * Zod schemas for Employee-related interfaces
 */

const employeeAssociationsSchema = z.object({
	teams: z.array(teamSchema).optional().nullable(),
	projects: z.array(z.any()).optional().nullable(),
	timesheets: z.array(z.any()).optional().nullable(),
	tasks: z.array(z.any()).optional().nullable(),
	timeSlots: z.array(z.any()).optional().nullable()
});

const baseEmployeeSchema = z
	.object({
		endWork: z.coerce.date().optional(),
		startedWorkOn: z.coerce.date().optional(),
		valueDate: z.coerce.date().optional(),
		short_description: z.string().optional().nullable(),
		description: z.string().optional().nullable(),
		billRateValue: z.number().optional(),
		billRateCurrency: z.nativeEnum(ECurrencies).or(z.string()).optional().nullable(),
		minimumBillingRate: z.number().optional(),
		reWeeklyLimit: z.number().optional(),
		offerDate: z.coerce.date().optional(),
		acceptDate: z.coerce.date().optional(),
		rejectDate: z.coerce.date().optional(),
		employeeLevel: z.string().optional().nullable(),
		anonymousBonus: z.boolean().optional().nullable(),
		averageIncome: z.number().optional().nullable(),
		totalWorkHours: z.number().optional().nullable(),
		averageExpenses: z.number().optional().nullable(),
		averageBonus: z.number().nullable().optional(),
		show_anonymous_bonus: z.boolean().optional().nullable(),
		show_average_bonus: z.boolean().optional().nullable(),
		show_average_expenses: z.boolean().optional().nullable(),
		show_average_income: z.boolean().optional().nullable(),
		show_billrate: z.boolean().optional().nullable(),
		show_payperiod: z.boolean().optional().nullable(),
		isJobSearchActive: z.boolean().optional().nullable(),
		linkedInUrl: z.string().url().nullable().optional(),
		facebookUrl: z.string().url().nullable().optional(),
		instagramUrl: z.string().url().nullable().optional(),
		twitterUrl: z.string().url().nullable().optional(),
		githubUrl: z.string().url().nullable().optional(),
		gitlabUrl: z.string().url().nullable().optional(),
		upworkUrl: z.string().url().nullable().optional(),
		stackoverflowUrl: z.string().url().nullable().optional(),
		jobSuccess: z.number().nullable().optional(),
		isVerified: z.boolean().optional().nullable(),
		isVetted: z.boolean().optional().nullable(),
		totalJobs: z.number().nullable().optional(),
		fullName: z.string().optional().nullable(),
		profile_link: z.string().optional().nullable(),
		isTrackingEnabled: z.boolean().optional().nullable(),
		isDeleted: z.boolean().optional().nullable(),
		allowScreenshotCapture: z.boolean().optional().nullable(),
		allowManualTime: z.boolean().optional().nullable(),
		allowModifyTime: z.boolean().optional(),
		allowDeleteTime: z.boolean().optional(),
		upworkId: z.string().nullable().optional(),
		linkedInId: z.string().nullable().optional(),
		isOnline: z.boolean().optional(),
		isTrackingTime: z.boolean().optional(),
		isAway: z.boolean().optional(),
		// Additional fields from API responses
		payPeriod: z.any().optional(), // Will be properly typed when pay period schema is created
		show_start_work_on: z.boolean().nullable().optional(),
		contactId: z.string().nullable().optional(),
		organizationPositionId: z.string().nullable().optional(),
		employee: z
			.object({
				id: uuIdSchema,
				fullName: z.string(),
				email: z.string(),
				phone: z.string().nullable().optional(),
				avatar: z.string().nullable().optional()
			})
			.passthrough()
			.optional()
	})
	.merge(basePerTenantAndOrganizationEntitySchema)
	.merge(taggableSchema);

// Employee schema
export const employeeSchema = baseEmployeeSchema.merge(employeeAssociationsSchema).merge(relationalUserSchema);

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
export type TEmployee = z.infer<typeof baseEmployeeSchema> &
	z.infer<typeof employeeAssociationsSchema> &
	z.infer<typeof relationalUserSchema>;
export type TUpdateEmployee = Pick<TEmployee, 'id' | 'isTrackingEnabled' | 'organizationId' | 'tenantId' | 'isActive'>;
