import { APIService } from '../../api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { validateApiResponse } from '@/core/types/schemas';
import {
	invoicePaymentConnectionSchema,
	type InvoicePaymentConnectionInput,
	type TInvoicePaymentConnection
} from '@/core/types/schemas/organization/shared-invoice.schema';

/**
 * The workspace's connection to its payment connector (ever-co/ever-gauzy#11856): the connector opens checkouts for the
 * invoices clients pay online, and posts back the payments its provider confirms. The API answers the signing secret
 * only when the connection is made and when the secret is rotated.
 */
class InvoicePaymentConnectionService extends APIService {
	getConnection = async (): Promise<TInvoicePaymentConnection> => {
		const response = await this.get('/invoice-payments/connection');
		return validateApiResponse(invoicePaymentConnectionSchema, response.data, 'getConnection API response');
	};

	connect = async (input: InvoicePaymentConnectionInput): Promise<TInvoicePaymentConnection> => {
		const response = await this.put('/invoice-payments/connection', input);
		return validateApiResponse(invoicePaymentConnectionSchema, response.data, 'connect API response');
	};

	rotateSecret = async (): Promise<TInvoicePaymentConnection> => {
		const response = await this.post('/invoice-payments/connection/rotate-secret', {});
		return validateApiResponse(invoicePaymentConnectionSchema, response.data, 'rotateSecret API response');
	};
}

export const invoicePaymentConnectionService = new InvoicePaymentConnectionService(GAUZY_API_BASE_SERVER_URL.value);
