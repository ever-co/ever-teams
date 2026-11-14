import { z } from 'zod';
import { RATE_REASON_MAX_LENGTH } from '@/core/lib/utils/rates';

const rateValueSchema = z.number().min(0);

/** The day a rate change prices tracked time from, as Gauzy reads it: a date, or a date-time with its offset. */
const APPLY_FROM_PATTERN = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2}))?$/;

const applyFromSchema = z.string().regex(APPLY_FROM_PATTERN);

/**
 * A project rate or a member's rate on a project: a value, or `null` to clear it, and the day it prices tracked time
 * from when the editor picked one.
 */
export const rateUpdateBodySchema = z
	.object({
		billRateValue: rateValueSchema.nullable(),
		applyFrom: applyFromSchema.optional()
	})
	.strip();

/** The rate an employee asks for. Who asks is read from the session, never from the body. */
export const rateChangeRequestBodySchema = z
	.object({
		billRateValue: rateValueSchema,
		billRateCurrency: z.string().trim().min(3).max(3).optional(),
		reason: z.string().trim().max(RATE_REASON_MAX_LENGTH).optional()
	})
	.strip();

/** One's own rates saved through one's profile: billing rate, currency and weekly limit, never a pay rate. */
export const ownProfileRatesBodySchema = z
	.object({
		billRateValue: rateValueSchema.nullable().optional(),
		billRateCurrency: z.string().trim().min(3).max(3).nullable().optional(),
		reWeeklyLimit: rateValueSchema.nullable().optional(),
		ratesApplyFrom: applyFromSchema.optional()
	})
	.strip();

export const rateRouteIdSchema = z.guid();
