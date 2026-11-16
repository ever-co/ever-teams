import { z } from 'zod';

/** How often a schedule bills its client. */
export const INVOICE_SCHEDULE_FREQUENCIES = ['WEEKLY', 'BIWEEKLY', 'MONTHLY'] as const;

export type InvoiceScheduleFrequency = (typeof INVOICE_SCHEDULE_FREQUENCIES)[number];

/** How a scheduled invoice groups its lines, as the manual invoice offers. */
export const INVOICE_SCHEDULE_GROUPINGS = ['PROJECT', 'MEMBER', 'TASK'] as const;

export type InvoiceScheduleGrouping = (typeof INVOICE_SCHEDULE_GROUPINGS)[number];

/** Where a run stands, or how it ended. */
const INVOICE_SCHEDULE_RUN_STATUSES = ['CLAIMED', 'DRAFTED', 'SENT', 'NOT_SENT', 'NO_TIME', 'FAILED'] as const;

export type InvoiceScheduleRunStatus = (typeof INVOICE_SCHEDULE_RUN_STATUSES)[number];

/** Why a run made no invoice, did not send it, or left time out of it. */
const INVOICE_SCHEDULE_RUN_REASONS = [
	'NO_BILLABLE_TIME',
	'NO_PRICED_TIME',
	'TIME_LEFT_OUT',
	'AUTHOR_CANNOT_INVOICE',
	'CLIENT_HAS_NO_EMAIL',
	'EMAIL_NOT_SENT',
	'INVOICE_NOT_SAVED'
] as const;

export type InvoiceScheduleRunReason = (typeof INVOICE_SCHEDULE_RUN_REASONS)[number];

/** A day, `YYYY-MM-DD`. */
const dayKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** A period of a schedule: its first and last days, and the day its invoice is made. */
const invoiceSchedulePeriodSchema = z.object({
	startDay: dayKeySchema,
	endDay: dayKeySchema,
	runDay: dayKeySchema
});

const runInvoiceSchema = z.object({
	id: z.string(),
	invoiceNumber: z.coerce.number().nullable().optional().catch(null),
	status: z.string().nullable().optional(),
	totalValue: z.coerce.number().nullable().optional().catch(null),
	currency: z.string().nullable().optional()
});

/** A run of a schedule: the invoice it made for one period, or why it made none. */
export const invoiceScheduleRunSchema = z.object({
	id: z.string(),
	periodStart: dayKeySchema,
	periodEnd: dayKeySchema,
	status: z.enum(INVOICE_SCHEDULE_RUN_STATUSES).catch('FAILED'),
	/** A reason this app does not know reads as none, rather than failing the whole list. */
	reason: z.enum(INVOICE_SCHEDULE_RUN_REASONS).nullable().optional().catch(null),
	claimedAt: z.string(),
	finishedAt: z.string().nullable().optional(),
	leftOutSeconds: z.coerce.number().nullable().optional().catch(null),
	invoiceId: z.string().nullable().optional(),
	invoice: runInvoiceSchema.nullable().optional()
});

export type TInvoiceScheduleRun = z.infer<typeof invoiceScheduleRunSchema>;

/** A client's billing schedule, with its next period and its latest run, as the API answers it. */
export const invoiceScheduleSchema = z.object({
	id: z.string(),
	organizationContactId: z.string(),
	organizationContact: z.object({ id: z.string(), name: z.string().nullable().optional() }).nullable().optional(),
	frequency: z.enum(INVOICE_SCHEDULE_FREQUENCIES),
	startDay: dayKeySchema,
	grouping: z.enum(INVOICE_SCHEDULE_GROUPINGS),
	sendInvoice: z.boolean(),
	pausedAt: z.string().nullable().optional(),
	activeSince: z.string(),
	authorId: z.string().nullable().optional(),
	nextPeriod: invoiceSchedulePeriodSchema.nullable().optional(),
	lastRun: invoiceScheduleRunSchema.nullable().optional()
});

export type TInvoiceSchedule = z.infer<typeof invoiceScheduleSchema>;

/** What the schedule's form sends: everything a schedule states that its user chooses. */
export interface InvoiceScheduleInput {
	frequency: InvoiceScheduleFrequency;
	startDay: string;
	grouping: InvoiceScheduleGrouping;
	sendInvoice: boolean;
}
