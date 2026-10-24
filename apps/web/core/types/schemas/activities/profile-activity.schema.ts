import moment from 'moment-timezone';
import { z } from 'zod';
import { uuIdSchema } from '../common/base.schema';

const LOCAL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DATE_RANGE_DAYS = 366;

const localDateSchema = z
	.string()
	.refine(
		(value) => LOCAL_DATE_PATTERN.test(value) && moment.utc(value, 'YYYY-MM-DD', true).isValid(),
		'must be a valid date in YYYY-MM-DD format'
	);

const ianaTimeZoneSchema = z
	.string()
	.refine((value) => moment.tz.zone(value) !== null, 'must be a valid IANA time zone');

export const profileActivityScopeSchema = z
	.object({
		tenantId: uuIdSchema,
		organizationId: uuIdSchema,
		organizationTeamId: uuIdSchema.optional(),
		employeeId: uuIdSchema,
		timeZone: ianaTimeZoneSchema
	})
	.strict();

export const profileActivityRequestSchema = profileActivityScopeSchema
	.extend({
		startDate: localDateSchema,
		endDate: localDateSchema,
		includeDaily: z.boolean()
	})
	.strict()
	.superRefine((value, context) => {
		const start = moment.utc(value.startDate, 'YYYY-MM-DD', true);
		const end = moment.utc(value.endDate, 'YYYY-MM-DD', true);
		const span = end.diff(start, 'days');

		if (!end.isAfter(start) || span > MAX_DATE_RANGE_DAYS) {
			context.addIssue({
				code: z.ZodIssueCode.custom,
				path: ['endDate'],
				message: `must be after startDate with a half-open span no greater than ${MAX_DATE_RANGE_DAYS} days`
			});
		}
	});

const profileActivityPeriodSchema = z
	.object({
		startDate: localDateSchema,
		endDate: localDateSchema,
		timeZone: ianaTimeZoneSchema
	})
	.strict();

const profileActivityDaySchema = z
	.object({
		date: localDateSchema,
		duration: z.number().finite().nonnegative()
	})
	.strict();

export const profileActivityResponseSchema = z
	.object({
		employeeId: uuIdSchema,
		activeDays: z.number().int().nonnegative(),
		totalDuration: z.number().finite().nonnegative(),
		firstActiveOn: localDateSchema.nullable(),
		lastActiveOn: localDateSchema.nullable(),
		period: profileActivityPeriodSchema,
		daily: z.array(profileActivityDaySchema).optional()
	})
	.strict();

export type TProfileActivityScope = z.infer<typeof profileActivityScopeSchema>;
export type TProfileActivityRequest = z.infer<typeof profileActivityRequestSchema>;
export type TProfileActivityResponse = z.infer<typeof profileActivityResponseSchema>;
