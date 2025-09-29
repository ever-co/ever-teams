import { z } from 'zod';
import { organizationTeamSchema } from '../team/organization-team.schema';
import { ECurrencies } from '../../generics/enums/currency';
import { relationalOrganizationProjectSchema } from '@/core/types/schemas';
import { taskZodSchemaType } from '../task/task.schema';

// export const employeeBaseSchema = z
// 	.object({
// 		id: z.string(),
// 		tenantId: z.string().nullable().optional(),
// 		thirdPartyId: z.string().nullable().optional(),
// 		name: z.string().nullable().optional(),
// 		firstName: z.string().nullable().optional(),
// 		lastName: z.string().nullable().optional(),
// 		email: z.string().nullable().optional(),
// 		phoneNumber: z.string().nullable().optional(),
// 		username: z.string().nullable().optional(),
// 		timeZone: z.string().nullable().optional(),
// 		timeFormat: z
// 			.union([z.literal(12), z.literal(24)])
// 			.nullable()
// 			.optional(),
// 		endWork: z.coerce.date().optional(),
// 		startedWorkOn: z.coerce.date().optional(),
// 		userId: z.string().nullable().optional(),
// 		valueDate: z.coerce.date().optional().nullable(),
// 		short_description: z.string().optional().nullable(),
// 		description: z.string().optional().nullable(),
// 		teams: z.array(z.lazy(() => organizationTeamSchema)).optional(),
// 		// payPeriod?: PayPeriodEnum;
// 		billRateValue: z.number().optional().nullable(),
// 		billRateCurrency: z.nativeEnum(ECurrencies).or(z.string()).optional().nullable(),
// 		minimumBillingRate: z.number().optional().nullable(),
// 		reWeeklyLimit: z.number().optional().nullable(),
// 		projects: z.array(z.lazy(() => relationalOrganizationProjectSchema)).optional(),
// 		offerDate: z.coerce.date().optional().nullable(),
// 		acceptDate: z.coerce.date().optional().nullable(),
// 		rejectDate: z.coerce.date().optional().nullable(),
// 		employeeLevel: z.string().optional().nullable(),
// 		anonymousBonus: z.boolean().optional().nullable(),
// 		timesheets: z.array(z.any()).optional().nullable(),
// 		tasks: z
// 			.lazy(() => taskZodSchemaType)
// 			.optional()
// 			.nullable(),
// 		averageIncome: z.number().optional().nullable(),
// 		totalWorkHours: z.number().optional().nullable(),
// 		averageExpenses: z.number().optional().nullable(),
// 		averageBonus: z.number().optional().nullable(),
// 		show_anonymous_bonus: z.boolean().optional().nullable(),
// 		show_average_bonus: z.boolean().optional().nullable(),
// 		show_average_expenses: z.boolean().optional().nullable(),
// 		show_average_income: z.boolean().optional().nullable(),
// 		show_billrate: z.boolean().optional().nullable(),
// 		show_payperiod: z.boolean().optional().nullable(),
// 		isJobSearchActive: z.boolean().optional().nullable(),
// 		linkedInUrl: z.string().url().optional().nullable(),
// 		facebookUrl: z.string().url().optional().nullable(),
// 		instagramUrl: z.string().url().optional().nullable(),
// 		twitterUrl: z.string().url().optional().nullable(),
// 		githubUrl: z.string().url().optional().nullable(),
// 		gitlabUrl: z.string().url().optional().nullable(),
// 		upworkUrl: z.string().url().optional().nullable(),
// 		stackoverflowUrl: z.string().url().optional().nullable(),
// 		jobSuccess: z.number().optional().nullable(),
// 		isVerified: z.boolean().optional().nullable(),
// 		isVetted: z.boolean().optional().nullable(),
// 		totalJobs: z.number().optional().nullable(),
// 		fullName: z.string().optional().nullable(),
// 		profile_link: z.string().optional().nullable(),
// 		isTrackingEnabled: z.boolean().optional().nullable(),
// 		isDeleted: z.boolean().optional().nullable(),
// 		allowScreenshotCapture: z.boolean().optional().nullable(),
// 		allowManualTime: z.boolean().optional().nullable(),
// 		allowModifyTime: z.boolean().optional().nullable(),
// 		allowDeleteTime: z.boolean().optional().nullable(),

// 		/** Upwork ID For Gauzy AI*/
// 		upworkId: z.string().optional().nullable(),
// 		/** LinkedIn ID For Gauzy AI*/
// 		linkedInId: z.string().optional().nullable(),
// 		/** Employee status (Online/Offline) */
// 		isOnline: z.boolean().optional().nullable(),
// 		/** Employee time tracking status */
// 		isTrackingTime: z.boolean().optional().nullable(),
// 		// True mean active, false away
// 		isAway: z.boolean().optional().nullable(),
// 		organizationId: z.string()
// 	})
// 	.nullable()
// 	.optional();
