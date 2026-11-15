import { z } from 'zod';

/** Gauzy's decimal columns come back as numbers or as strings ("45.00") depending on the database. */
const rateFieldSchema = z.union([z.number(), z.string()]).nullable().optional();

const projectMemberRateSchema = z
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

/** What an employee is paid, read only by the employee and by holders of ORG_EMPLOYEES_EDIT. */
export const employeePayRateSchema = z
	.object({
		employeeId: z.string(),
		payRateValue: rateFieldSchema,
		payRateCurrency: z.string().nullable().optional(),
		currency: z.string().nullable().optional()
	})
	.passthrough();

/** What a rate save answers beside the saved rates: how many time entries took the new rate, when it re-priced any. */
export const rateSaveAnswerSchema = z
	.object({
		repricedTimeLogs: z.number().int().min(0).optional()
	})
	.passthrough();

export const rateChangeRequestResultSchema = z
	.object({
		notified: z.number().optional()
	})
	.passthrough();

/** @public A member's client rate on a project, as Gauzy answers it; kept for callers outside these files. */
export type TProjectMemberRate = z.infer<typeof projectMemberRateSchema>;
export type TProjectRates = z.infer<typeof projectRatesSchema>;
export type TRateChangeRequestResult = z.infer<typeof rateChangeRequestResultSchema>;
export type TEmployeePayRate = z.infer<typeof employeePayRateSchema>;
export type TRateSaveAnswer = z.infer<typeof rateSaveAnswerSchema>;

export interface IEmployeeRatesInput {
	billRateValue?: number | null;
	billRateCurrency?: string | null;
	reWeeklyLimit?: number | null;
	payRateValue?: number | null;
	payRateCurrency?: string | null;
	/**
	 * The day the changed rates price tracked time from (a date, or a date-time with its offset): the entries started
	 * on or after it take them. Without it Gauzy applies the organization's rule (`timeLogsKeepTheirRates`).
	 */
	ratesApplyFrom?: string;
}

/** The rates one changes on one's own profile (`PUT /employee/:id/profile`), which never takes a pay rate. */
export type IOwnProfileRatesInput = Pick<
	IEmployeeRatesInput,
	'billRateValue' | 'billRateCurrency' | 'reWeeklyLimit' | 'ratesApplyFrom'
>;

/** How many time entries a rate save gave the new rate; null when Gauzy re-priced none or does not say. */
export interface RateSaveOutcome {
	repricedTimeLogs: number | null;
}

export interface IRateChangeRequestInput {
	billRateValue: number;
	billRateCurrency?: string;
	reason?: string;
}
