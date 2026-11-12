import qs from 'qs';
import { APIService } from '../../api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import type { InvoiceStatusChange } from '@/core/lib/utils/invoice-actions';
import type { InvoiceRequest } from '@/core/lib/utils/invoices';
import { validateApiResponse, validatePaginationResponse, ZodValidationError } from '@/core/types/schemas';
import {
	highestInvoiceNumberSchema,
	invoiceSchema,
	type TInvoice
} from '@/core/types/schemas/organization/invoice.schema';

const INVOICES_PAGE_SIZE = 50;

/** The API serves at most 100 invoices a page. */
const CLIENT_INVOICES_PAGE_SIZE = 100;

/** A client past this many invoices has its latest ones compared with a new period; the list has every one. */
const CLIENT_INVOICES_MAX_PAGES = 10;

export interface InvoicesPage {
	items: TInvoice[];
	total: number;
}

interface InvoicesPageOptions {
	page: number;
	signal?: AbortSignal;
}

export interface InvoiceToEmail {
	invoiceId: string;
	invoiceNumber: number | null;
	email: string;
}

interface InvoicesQueryOptions {
	page: number;
	pageSize: number;
	clientId?: string;
	/** The API's own screen hides the invoices it archived unless asked. */
	hidesArchived: boolean;
}

class InvoiceService extends APIService {
	private logValidationError(error: unknown, message: string) {
		if (error instanceof ZodValidationError) {
			this.logger.error(message, { message: error.message, issues: error.issues }, 'InvoiceService');
		}
	}

	private invoicesQuery({ page, pageSize, clientId, hidesArchived }: InvoicesQueryOptions) {
		const params: Record<string, string> = {
			'where[organizationId]': this.organizationId,
			'where[tenantId]': this.tenantId,
			// Estimates are invoices on the API side, in the same table and the same number sequence.
			'where[isEstimate]': 'false',
			'relations[0]': 'toContact',
			'order[invoiceDate]': 'DESC',
			'order[invoiceNumber]': 'DESC',
			take: String(pageSize),
			// The API counts pages from 1 on this route.
			skip: String(page)
		};
		if (hidesArchived) {
			params['where[isArchived]'] = 'false';
		}
		if (clientId) {
			params['where[toContactId]'] = clientId;
		}
		return qs.stringify(params);
	}

	private readonly readInvoicesPage = async (
		options: InvoicesQueryOptions,
		signal?: AbortSignal
	): Promise<InvoicesPage> => {
		const query = this.invoicesQuery(options);
		const response = await this.get(`/invoices/pagination?${query}`, { signal });
		return validatePaginationResponse(invoiceSchema, response.data, 'getInvoices API response');
	};

	getInvoices = async ({ page, signal }: InvoicesPageOptions): Promise<InvoicesPage> => {
		try {
			const options = { page, pageSize: INVOICES_PAGE_SIZE, hidesArchived: true };
			return await this.readInvoicesPage(options, signal);
		} catch (error) {
			this.logValidationError(error, 'Invoices validation failed:');
			throw error;
		}
	};

	/** Every invoice saved for a client, archived ones included: each one billed the client. */
	getClientInvoices = async (clientId: string, signal?: AbortSignal): Promise<TInvoice[]> => {
		try {
			const invoices: TInvoice[] = [];
			for (let page = 1; page <= CLIENT_INVOICES_MAX_PAGES; page += 1) {
				const options = { page, pageSize: CLIENT_INVOICES_PAGE_SIZE, clientId, hidesArchived: false };
				const { items, total } = await this.readInvoicesPage(options, signal);
				invoices.push(...items);
				const isLastPage = items.length < CLIENT_INVOICES_PAGE_SIZE;
				const hasEverything = invoices.length >= total;
				if (isLastPage || hasEverything) {
					break;
				}
			}
			return invoices;
		} catch (error) {
			this.logValidationError(error, 'Client invoices validation failed:');
			throw error;
		}
	};

	/** The highest number in use in the workspace, invoices and estimates together; null when the API states none. */
	getHighestInvoiceNumber = async (signal?: AbortSignal): Promise<number | string | null> => {
		const response = await this.get('/invoices/highest', { signal });
		const highest = validateApiResponse(
			highestInvoiceNumberSchema,
			response.data ?? {},
			'getHighestInvoiceNumber API response'
		);
		return highest.max ?? null;
	};

	/** Creates the invoice and its lines in one request: the API saves both or neither. */
	createInvoice = async (request: InvoiceRequest): Promise<TInvoice> => {
		try {
			const response = await this.post('/invoices', request);
			return validateApiResponse(invoiceSchema, response.data, 'createInvoice API response');
		} catch (error) {
			this.logValidationError(error, 'Invoice creation validation failed:');
			throw error;
		}
	};

	/** The invoice as the API's own PDF, with the labels in the API's default language. */
	downloadInvoicePdf = async (invoiceId: string): Promise<Blob> => {
		const response = await this.get<Blob>(`/invoices/download/${encodeURIComponent(invoiceId)}`, {
			responseType: 'blob'
		});
		return response.data;
	};

	/**
	 * E-mails the invoice to `email` with its PDF attached, through the organization's own e-mail settings. The API
	 * answers 202 with no body whatever its mail server did: only a refused request comes back as an error.
	 */
	sendInvoiceByEmail = async ({ invoiceId, invoiceNumber, email }: InvoiceToEmail): Promise<void> => {
		const params = {
			invoiceNumber,
			invoiceId,
			isEstimate: false,
			organizationId: this.organizationId,
			tenantId: this.tenantId
		};
		await this.put(`/invoices/email/${encodeURIComponent(email)}`, { params });
	};

	changeInvoiceStatus = async (invoiceId: string, change: InvoiceStatusChange): Promise<void> => {
		// A copy: the request writes the tenant and the organization into the object it is given.
		const body = { ...change };
		await this.put(`/invoices/${encodeURIComponent(invoiceId)}/action`, body);
	};

	deleteInvoice = async (invoiceId: string): Promise<void> => {
		await this.delete(`/invoices/${encodeURIComponent(invoiceId)}`);
	};
}

export const invoiceService = new InvoiceService(GAUZY_API_BASE_SERVER_URL.value);
