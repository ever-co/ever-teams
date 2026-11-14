import { z } from 'zod';

/**
 * A client: an organization contact of the client type. Only the fields the app shows are kept; the API's
 * commercial fields (credit, tax, pricing) are left out of what the page holds.
 */
export const clientSchema = z.object({
	id: z.string(),
	name: z.string(),
	primaryEmail: z.string().optional().nullable(),
	primaryPhone: z.string().optional().nullable(),
	notes: z.string().optional().nullable(),
	contactType: z.string().optional().nullable(),
	imageUrl: z.string().optional().nullable(),
	contactId: z.string().optional().nullable(),
	organizationId: z.string().optional().nullable(),
	tenantId: z.string().optional().nullable(),
	createdAt: z.coerce.string().optional().nullable(),
	updatedAt: z.coerce.string().optional().nullable(),
	deletedAt: z.coerce.string().optional().nullable(),
	/** The one commercial field kept: a new invoice of the client is due this many days after its issue. */
	paymentTermsDays: z.number().int().nullable().optional().catch(null)
});

export const clientRequestSchema = z.object({
	name: z.string().min(1),
	primaryEmail: z.string().nullable(),
	primaryPhone: z.string().nullable(),
	notes: z.string().nullable(),
	contactType: z.literal('CLIENT'),
	organizationId: z.string().min(1),
	tenantId: z.string().min(1),
	contact: z.object({ id: z.string().min(1) }).optional()
});

export type TClient = z.infer<typeof clientSchema>;
export type TClientRequest = z.infer<typeof clientRequestSchema>;
