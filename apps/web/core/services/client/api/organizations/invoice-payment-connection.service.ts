import { APIService } from '../../api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { validateApiResponse } from '@/core/types/schemas';
import {
	invoicePaymentConnectionSchema,
	type InvoicePaymentConnectionInput,
	type TInvoicePaymentConnection
} from '@/core/types/schemas/organization/shared-invoice.schema';

/** A write whose answer may hold the signing secret: the development log of the API client leaves the answer out. */
const SECRET_ANSWER = { secretResponse: true } as const;

/**
 * The workspace's connection to its payment connector (ever-co/ever-gauzy#11856): the connector opens checkouts for the
 * invoices clients pay online, and posts back the payments its provider confirms. The API answers the signing secret
 * only when the connection is made and when the secret is rotated. Reading the connection takes the
 * `PAYMENT_PROVIDERS_VIEW` permission, writing it `PAYMENT_PROVIDERS_EDIT`; the API checks both.
 *
 * The bodies hold the connection's fields only, never the tenant or organization ids `APIService` adds by default: the
 * API refuses a field it does not know there, and the session names both.
 */
class InvoicePaymentConnectionService extends APIService {
	getConnection = async (): Promise<TInvoicePaymentConnection> => {
		const response = await this.get('/invoice-payments/connection');
		return validateApiResponse(invoicePaymentConnectionSchema, response.data, 'getConnection API response');
	};

	connect = async (input: InvoicePaymentConnectionInput): Promise<TInvoicePaymentConnection> => {
		const response = await this.put('/invoice-payments/connection', { ...input }, SECRET_ANSWER, false);
		return validateApiResponse(invoicePaymentConnectionSchema, response.data, 'connect API response');
	};

	rotateSecret = async (): Promise<TInvoicePaymentConnection> => {
		const response = await this.post('/invoice-payments/connection/rotate-secret', {}, SECRET_ANSWER, false);
		return validateApiResponse(invoicePaymentConnectionSchema, response.data, 'rotateSecret API response');
	};
}

export const invoicePaymentConnectionService = new InvoicePaymentConnectionService(GAUZY_API_BASE_SERVER_URL.value);
