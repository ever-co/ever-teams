import { z } from 'zod';

/** Gauzy's decimal columns come back as numbers or as strings ("45.00") depending on the database. */
const rateFieldSchema = z.union([z.number(), z.string()]).nullable().optional();

export const projectMemberRateSchema = z
	.object({
		employeeId: z.string(),
		billRateValue: rateFieldSchema
	})
	.passthrough();

export const projectRatesSchema = z
	.object({
		id: z.string(),
		billRateValue: rateFieldSchema,
		currency: z.string().nullable().optional(),
		members: z.array(projectMemberRateSchema).optional().default([])
	})
	.passthrough();

export const myProjectRateSchema = z
	.object({
		organizationProjectId: z.string(),
		projectName: z.string().nullable().optional(),
		billRateValue: rateFieldSchema,
		currency: z.string().nullable().optional()
	})
	.passthrough();

export const myProjectRatesSchema = z.array(myProjectRateSchema);

export const rateChangeRequestResultSchema = z
	.object({
		notified: z.number().optional()
	})
	.passthrough();

export type TProjectMemberRate = z.infer<typeof projectMemberRateSchema>;
export type TProjectRates = z.infer<typeof projectRatesSchema>;
export type TMyProjectRate = z.infer<typeof myProjectRateSchema>;
export type TRateChangeRequestResult = z.infer<typeof rateChangeRequestResultSchema>;

export interface IEmployeeRatesInput {
	billRateValue: number | null;
	billRateCurrency: string | null;
	reWeeklyLimit: number | null;
}

export interface IRateChangeRequestInput {
	billRateValue: number;
	billRateCurrency?: string;
	reason?: string;
}
