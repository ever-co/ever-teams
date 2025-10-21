import { z } from 'zod';
import { basePerTenantEntityModelSchema, relationalImageAssetSchema, taggableSchema } from '../common/base.schema';
import { defaultValueDateTypeSchema, timeFormatSchema, weekDaysSchema } from '../common/enums.schema';
import { languageZodSchemaType } from '../common/language.schema';

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
	screenshotFrequency: z.string().optional(),
	enforced: z.boolean().optional(),
	standardWorkHoursPerDay: z.number().optional()
});

// Organization language schema
export const organizationLanguageSchema = z
	.object({
		language: z.lazy(() => languageZodSchemaType),
		languageCode: z.string(),
		level: z.string(),
		name: z.string()
	})
	.merge(basePerTenantEntityModelSchema)
	.strict();

// Main organization schema
export const organizationSchema = z
	.object({
		id: z.string(),
		name: z.string(),
		isDefault: z.boolean(),
		profile_link: z.string(),
		valueDate: z.coerce.date().optional(),
		totalEmployees: z.number(),
		status: z.string().optional(),
		imageUrl: z.string().optional(),
		banner: z.string().nullable(),
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
		defaultValueDateType: defaultValueDateTypeSchema.optional().nullable(),
		defaultAlignmentType: z.string().optional().nullable(),
		dateFormat: z.string().optional().nullable(),
		brandColor: z.string().optional().nullable(),
		timeZone: z.string().optional().nullable(),
		officialName: z.string().optional().nullable(),
		startWeekOn: weekDaysSchema.optional().nullable(),
		taxId: z.string().optional().nullable(),
		numberFormat: z.string().optional().nullable(),
		bonusPercentage: z.number().optional().nullable(),
		employees: z.array(z.any()).optional(), // Will be properly typed when employee schema is created
		invitesAllowed: z.boolean().optional().nullable(),
		inviteExpiryPeriod: z.number().optional().nullable(),
		futureDateAllowed: z.boolean().optional().nullable(),
		allowManualTime: z.boolean().optional().nullable(),
		allowModifyTime: z.boolean().optional().nullable(),
		allowDeleteTime: z.boolean().optional().nullable(),
		regionCode: z.string().optional().nullable(),
		requireReason: z.boolean().optional().nullable(),
		requireDescription: z.boolean().optional().nullable(),
		requireProject: z.boolean().optional().nullable(),
		requireTask: z.boolean().optional().nullable(),
		requireClient: z.boolean().optional().nullable(),
		timeFormat: timeFormatSchema.optional().nullable(),
		defaultStartTime: z.string().optional().nullable(),
		defaultEndTime: z.string().optional().nullable(),
		registrationDate: z.coerce.date().optional().nullable(),
		separateInvoiceItemTaxAndDiscount: z.boolean().optional().nullable(),
		minimumProjectSize: z.string().optional().nullable(),
		show_clients: z.boolean().optional(),
		currencyPosition: z.string().optional().nullable(),
		website: z.string().optional().nullable(),
		fiscalInformation: z.string().optional().nullable(),
		fiscalStartDate: z.coerce.date().optional().nullable(),
		fiscalEndDate: z.coerce.date().optional().nullable(),
		discountAfterTax: z.boolean().optional().nullable(),
		languages: z.array(organizationLanguageSchema).optional(),
		defaultInvoiceEstimateTerms: z.string().optional().nullable(),
		convertAcceptedEstimates: z.boolean().optional().nullable(),
		daysUntilDue: z.number().optional().nullable(),
		upworkOrganizationId: z.string().optional().nullable(),
		upworkOrganizationName: z.string().optional().nullable()
	})
	.merge(basePerTenantEntityModelSchema)
	.merge(relationalImageAssetSchema)
	.merge(organizationTimerSettingSchema)
	.merge(taggableSchema)
	.passthrough();

// Custom fields object schema
export const customFieldsObjectSchema = z.record(z.any());

// Organization create schema
export const organizationCreateSchema = z.object({
	name: z.string(),
	currency: z.string().nullable(),
	tenantId: z.string(),
	invitesAllowed: z.boolean()
});

export type TOrganization = z.infer<typeof organizationSchema>;
