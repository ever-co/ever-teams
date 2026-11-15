import { z } from 'zod';
import { savedInvoiceSchema } from './invoice.schema';

const sharedInvoiceSenderSchema = z.object({
	name: z.string().nullable().optional(),
	officialName: z.string().nullable().optional(),
	brandColor: z.string().nullable().optional()
});

/**
 * `GET /public/invoice/:id/:token`: the invoice its share link opens, with who sent it and its lines. The API serves
 * nothing private through the link (no internal note).
 */
export const sharedInvoiceSchema = savedInvoiceSchema.extend({
	isEstimate: z.boolean().nullable().optional(),
	fromOrganization: sharedInvoiceSenderSchema.nullable().optional(),
	organization: sharedInvoiceSenderSchema.nullable().optional()
});

/** `GET /public/invoice-payments/invoice/:id/:token`: whether the public page offers to pay the invoice online. */
export const invoicePayOptionSchema = z.object({
	payable: z.boolean(),
	amountDue: z.coerce.number().nullable().optional(),
	currency: z.string().nullable().optional()
});

/** `POST /public/invoice-payments/invoice/:id/:token/checkout`: the provider's checkout page the client is sent to. */
export const invoiceCheckoutSchema = z.object({
	url: z.string().url()
});

export type TSharedInvoice = z.infer<typeof sharedInvoiceSchema>;
export type TInvoicePayOption = z.infer<typeof invoicePayOptionSchema>;

/** `GET /invoice-payments/connection`: the workspace's connection to its payment connector, without its secret. */
export const invoicePaymentConnectionSchema = z.object({
	connected: z.boolean(),
	isEnabled: z.boolean(),
	isTestMode: z.boolean(),
	checkoutEndpoint: z.string().nullable().optional(),
	notificationUrl: z.string().nullable().optional(),
	/** Only in the answer that made the connection or rotated its secret. */
	signingSecret: z.string().nullable().optional()
});

export type TInvoicePaymentConnection = z.infer<typeof invoicePaymentConnectionSchema>;

/** What the settings write: the connector's checkout endpoint and the two switches. */
export interface InvoicePaymentConnectionInput {
	checkoutEndpoint: string;
	isEnabled: boolean;
	isTestMode: boolean;
}
