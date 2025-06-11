import { z } from 'zod';
import { basePerTenantEntityModelSchema, relationalImageAssetSchema, taggableSchema } from '../common/base.schema';
import { defaultValueDateTypeSchema, timeFormatSchema, weekDaysSchema } from '../common/enums.schema';
import { languageSchema } from '../common/language.schema';

/**
 * Zod schemas for Organization-related interfaces
 */

// Organization timer setting schema
export const organizationTimerSettingSchema = z.object({
	allowTrackInactivity: z.boolean().optional(),
	inactivityTimeLimit: z.number().optional(),
	activityProofDuration: z.number().optional(),
	isRemoveIdleTime: z.boolean().optional(),
	allowScreenshotCapture: z.boolean().optional(),
	randomScreenshot: z.boolean().optional(),
	trackOnSleep: z.boolean().optional(),
	screenshotFrequency: z.number().optional(),
	enforced: z.boolean().optional(),
	standardWorkHoursPerDay: z.number().optional()
});

// Organization language schema
export const organizationLanguageSchema = z
	.object({
		language: z.lazy(() => languageSchema),
		languageCode: z.string(),
		level: z.string(),
		name: z.string()
	})
	.merge(basePerTenantEntityModelSchema)
	.strict();

// Main organization schema
export const organizationSchema = z
	.object({
		name: z.string(),
		isDefault: z.boolean(),
		profile_link: z.string(),
		valueDate: z.coerce.date().optional(),
		totalEmployees: z.number(),
		status: z.string().optional(),
		imageUrl: z.string().optional(),
		banner: z.string(),
		short_description: z.string().optional().nullable(),
		client_focus: z.string().optional().nullable(),
		show_income: z.boolean().optional(),
		show_profits: z.boolean().optional(),
		show_bonuses_paid: z.boolean().optional(),
		show_total_hours: z.boolean().optional(),
		show_minimum_project_size: z.boolean().optional(),
		show_projects_count: z.boolean().optional(),
		show_clients_count: z.boolean().optional(),
		show_employees_count: z.boolean().optional(),
		overview: z.string().optional().nullable(),
		currency: z.string().optional().nullable(),
		defaultValueDateType: defaultValueDateTypeSchema,
		defaultAlignmentType: z.string().optional(),
		dateFormat: z.string().optional(),
		brandColor: z.string().optional(),
		timeZone: z.string().optional(),
		officialName: z.string().optional(),
		startWeekOn: weekDaysSchema.optional(),
		taxId: z.string().optional(),
		numberFormat: z.string().optional(),
		bonusPercentage: z.number().optional(),
		employees: z.array(z.any()).optional(), // Will be properly typed when employee schema is created
		invitesAllowed: z.boolean().optional(),
		inviteExpiryPeriod: z.number().optional(),
		futureDateAllowed: z.boolean().optional(),
		allowManualTime: z.boolean().optional(),
		allowModifyTime: z.boolean().optional(),
		allowDeleteTime: z.boolean().optional(),
		regionCode: z.string().optional(),
		requireReason: z.boolean().optional(),
		requireDescription: z.boolean().optional(),
		requireProject: z.boolean().optional(),
		requireTask: z.boolean().optional(),
		requireClient: z.boolean().optional(),
		timeFormat: timeFormatSchema.optional(),
		defaultStartTime: z.string().optional(),
		defaultEndTime: z.string().optional(),
		registrationDate: z.coerce.date().optional(),
		separateInvoiceItemTaxAndDiscount: z.boolean().optional(),
		minimumProjectSize: z.string().optional(),
		show_clients: z.boolean().optional(),
		currencyPosition: z.string().optional(),
		website: z.string().optional(),
		fiscalInformation: z.string().optional(),
		fiscalStartDate: z.coerce.date().optional(),
		fiscalEndDate: z.coerce.date().optional(),
		discountAfterTax: z.boolean().optional(),
		languages: z.array(organizationLanguageSchema).optional(),
		defaultInvoiceEstimateTerms: z.string().optional(),
		convertAcceptedEstimates: z.boolean().optional(),
		daysUntilDue: z.number().optional(),
		upworkOrganizationId: z.string().optional(),
		upworkOrganizationName: z.string().optional()
	})
	.merge(basePerTenantEntityModelSchema)
	.merge(relationalImageAssetSchema)
	.merge(organizationTimerSettingSchema)
	.merge(taggableSchema)
	.strict();

// Custom fields object schema
export const customFieldsObjectSchema = z.record(z.any());

// Organization create schema
export const organizationCreateSchema = z.object({
	name: z.string(),
	currency: z.string(),
	tenantId: z.string(),
	invitesAllowed: z.boolean()
});
