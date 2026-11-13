import { z } from 'zod';

/** The API's numeric columns come back as numbers or as strings ("120.00") depending on the database. */
const decimalSchema = z.coerce.number().nullable().optional();

const invoiceClientSchema = z.object({
	id: z.string(),
	name: z.string().nullable().optional(),
	imageUrl: z.string().nullable().optional()
});

/** An invoice as the list shows it. Its lines, taxes and payment fields are left out of what the page holds. */
export const invoiceSchema = z.object({
	id: z.string(),
	invoiceNumber: decimalSchema,
	invoiceDate: z.string().nullable().optional(),
	dueDate: z.string().nullable().optional(),
	currency: z.string().nullable().optional(),
	totalValue: decimalSchema,
	status: z.string().nullable().optional(),
	terms: z.string().nullable().optional(),
	toContactId: z.string().nullable().optional(),
	toContact: invoiceClientSchema.nullable().optional()
});

/** `GET /invoices/highest`: the highest number the workspace holds, read by a raw query (a string on PostgreSQL). */
export const highestInvoiceNumberSchema = z.object({
	max: z.union([z.number(), z.string()]).nullable().optional()
});

const billableTaskSchema = z.object({
	id: z.string(),
	title: z.string().nullable().optional(),
	number: z.coerce.number().nullable().optional().catch(null)
});

export const billableTimeLogSchema = z.object({
	id: z.string(),
	projectId: z.string().nullable().optional(),
	employeeId: z.string().nullable().optional(),
	taskId: z.string().nullable().optional(),
	isBillable: z.boolean().nullable().optional(),
	duration: z.coerce.number().nullable().optional().catch(null),
	startedAt: z.string().nullable().optional(),
	stoppedAt: z.string().nullable().optional(),
	task: billableTaskSchema.nullable().optional()
});

export type TInvoice = z.infer<typeof invoiceSchema>;
export type TBillableTimeLog = z.infer<typeof billableTimeLogSchema>;
