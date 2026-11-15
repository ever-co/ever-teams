import { APIService } from '../../api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { SHARED_INVOICE_RELATIONS } from '@/core/lib/utils/shared-invoice';
import { validateApiResponse } from '@/core/types/schemas';
import {
	invoiceCheckoutSchema,
	invoicePayOptionSchema,
	sharedInvoiceSchema,
	type TInvoicePayOption,
	type TSharedInvoice
} from '@/core/types/schemas/organization/shared-invoice.schema';

const linkPathOf = (id: string, token: string) => `${encodeURIComponent(id)}/${encodeURIComponent(token)}`;

/** The address of every call holds the token of the link: no log of the API client writes it (`secretAddress`). */
const SECRET_ADDRESS = { secretAddress: true } as const;

/**
 * The public page of an invoice (ever-co/ever-gauzy#11856): the invoice its share link opens, its PDF, and paying it
 * online. Nobody needs to be signed in: the link is what opens the invoice, and the API refuses a revoked one, or one of
 * a voided invoice, with 403. The amount paid is the API's: the checkout is asked with the page to come back to only.
 */
class SharedInvoiceService extends APIService {
	getSharedInvoice = async (id: string, token: string): Promise<TSharedInvoice> => {
		const response = await this.get(
			`/public/invoice/${linkPathOf(id, token)}?relations=${SHARED_INVOICE_RELATIONS}`,
			SECRET_ADDRESS
		);
		return validateApiResponse(sharedInvoiceSchema, response.data, 'getSharedInvoice API response');
	};

	downloadSharedInvoicePdf = async (id: string, token: string): Promise<Blob> => {
		const response = await this.get<Blob>(`/public/invoice/${linkPathOf(id, token)}/download`, {
			...SECRET_ADDRESS,
			responseType: 'blob'
		});
		return response.data;
	};

	getPayOption = async (id: string, token: string): Promise<TInvoicePayOption> => {
		const response = await this.get(`/public/invoice-payments/invoice/${linkPathOf(id, token)}`, SECRET_ADDRESS);
		return validateApiResponse(invoicePayOptionSchema, response.data, 'getPayOption API response');
	};

	/** Opens a checkout for what is still due, and answers the provider's page the client pays on. */
	startCheckout = async (id: string, token: string, returnUrl: string): Promise<string> => {
		const response = await this.post(
			`/public/invoice-payments/invoice/${linkPathOf(id, token)}/checkout`,
			{ returnUrl },
			SECRET_ADDRESS,
			false
		);
		return validateApiResponse(invoiceCheckoutSchema, response.data, 'startCheckout API response').url;
	};
}

export const sharedInvoiceService = new SharedInvoiceService(GAUZY_API_BASE_SERVER_URL.value);
