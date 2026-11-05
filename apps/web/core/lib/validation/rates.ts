import { z } from 'zod';
import { RATE_REASON_MAX_LENGTH } from '@/core/lib/utils/rates';

const rateValueSchema = z.number().min(0);

/** A project rate or a member's rate on a project: a value, or `null` to clear it. */
export const rateUpdateBodySchema = z
	.object({
		billRateValue: rateValueSchema.nullable()
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

export const rateRouteIdSchema = z.guid();
