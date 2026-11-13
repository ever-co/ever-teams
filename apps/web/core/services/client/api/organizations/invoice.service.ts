import qs from 'qs';
import { APIService } from '../../api.service';
import { scopedReadConfig, scopedWriteConfig } from '../../api-request-scope';
import type { APIConfig } from '../../axios';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import type { InvoiceStatusChange } from '@/core/lib/utils/invoice-actions';
import type { InvoiceUpdate } from '@/core/lib/utils/invoice-edit';
import type { InvoiceItemRequest, InvoiceRequest, InvoiceStatus } from '@/core/lib/utils/invoices';
import { validateApiResponse, validatePaginationResponse, ZodValidationError } from '@/core/types/schemas';
import {
	highestInvoiceNumberSchema,
	invoiceSchema,
	savedInvoiceSchema,
	type TInvoice,
	type TSavedInvoice
} from '@/core/types/schemas/organization/invoice.schema';

const INVOICES_PAGE_SIZE = 50;

/** The API serves at most 100 invoices a page. */
const FULL_READ_PAGE_SIZE = 100;

const invoiceStatusSchema = invoiceSchema.pick({ status: true });

export interface InvoicesPage {
	items: TInvoice[];
	total: number;
}

/** What the editor reads with an invoice: its lines, the name of each line's project, and its client. */
const SAVED_INVOICE_RELATIONS: ReadonlyArray<string> = ['invoiceItems', 'invoiceItems.project', 'toContact'];

interface SavedInvoiceReadOptions {
	signal?: AbortSignal;
	tenantId?: string | null;
	/** The token the read goes out with; the cookies' one when left out. */
	accessToken?: string | null;
}

export interface InvoiceToEmail {
	invoiceId: string;
	invoiceNumber: number | null;
	email: string;
}

export interface InvoicesScope {
	organizationId: string;
	tenantId: string;
}

/**
 * A workspace, and the token a save began with. In direct mode a request carries that token instead of the cookies'
 * one, so it reaches the workspace whatever another tab chose since; in proxy mode the route uses the cookies' one.
 */
export interface InvoiceWriteScope extends InvoicesScope {
	accessToken?: string | null;
}

function readConfigOf(options: SavedInvoiceReadOptions): APIConfig {
	if (!options.accessToken) {
		return { signal: options.signal, tenantId: options.tenantId };
	}
	const scope = { tenantId: options.tenantId, accessToken: options.accessToken };
	return scopedReadConfig({ scope, signal: options.signal });
}

function writeConfigOf(scope: InvoiceWriteScope): APIConfig {
	if (!scope.accessToken) {
		return { tenantId: scope.tenantId };
	}
	return scopedWriteConfig(scope);
}

interface InvoicesPageOptions {
	page: number;
	signal?: AbortSignal;
	/** The organization and tenant the caller's cache key holds; the cookies' when left out. */
	scope?: InvoicesScope;
}

interface InvoicesQueryOptions {
	page: number;
	pageSize: number;
	clientId?: string;
	/** Only the invoices in this status, as the API writes it. */
	status?: InvoiceStatus;
	/** The API's own screen hides the invoices it archived unless asked. */
	hidesArchived: boolean;
	scope: InvoicesScope;
}

type InvoicesListOptions = Omit<InvoicesQueryOptions, 'page' | 'pageSize'>;

class InvoiceService extends APIService {
	private logValidationError(error: unknown, message: string) {
		if (error instanceof ZodValidationError) {
			this.logger.error(message, { message: error.message, issues: error.issues }, 'InvoiceService');
		}
	}

	private currentScope(): InvoicesScope {
		return { organizationId: this.organizationId, tenantId: this.tenantId };
	}

	private invoicesQuery({ page, pageSize, clientId, status, hidesArchived, scope }: InvoicesQueryOptions) {
		const params: Record<string, string> = {
			'where[organizationId]': scope.organizationId,
			'where[tenantId]': scope.tenantId,
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
		if (status) {
			params['where[status]'] = status;
		}
		return qs.stringify(params);
	}

	private readonly readInvoicesPage = async (
		options: InvoicesQueryOptions,
		signal?: AbortSignal
	): Promise<InvoicesPage> => {
		const query = this.invoicesQuery(options);
		const response = await this.get(`/invoices/pagination?${query}`, { signal, tenantId: options.scope.tenantId });
		return validatePaginationResponse(invoiceSchema, response.data, 'getInvoices API response');
	};

	getInvoices = async ({ page, signal, scope }: InvoicesPageOptions): Promise<InvoicesPage> => {
		try {
			const pageScope = scope ?? this.currentScope();
			const options = { page, pageSize: INVOICES_PAGE_SIZE, hidesArchived: true, scope: pageScope };
			return await this.readInvoicesPage(options, signal);
		} catch (error) {
			this.logValidationError(error, 'Invoices validation failed:');
			throw error;
		}
	};

	/** Reads page after page until the API has given every invoice it counts, or the page cap is reached. */
	private readonly readEveryPage = async (list: InvoicesListOptions, signal?: AbortSignal): Promise<TInvoice[]> => {
		const invoices: TInvoice[] = [];
		let page = 1;
		let pageCount = 1;
		// Bounded by the total the API reports on each page: the sums drawn from this read must be whole
		while (page <= pageCount) {
			const options = { ...list, page, pageSize: FULL_READ_PAGE_SIZE };
			const { items, total } = await this.readInvoicesPage(options, signal);
			invoices.push(...items);
			pageCount = Math.ceil(total / FULL_READ_PAGE_SIZE);
			const isLastPage = items.length < FULL_READ_PAGE_SIZE;
			if (isLastPage) {
				break;
			}
			page += 1;
		}
		return invoices;
	};

	/** Every invoice saved for a client, archived ones included: each one billed the client. */
	getClientInvoices = async (
		clientId: string,
		signal?: AbortSignal,
		keyScope?: InvoicesScope
	): Promise<TInvoice[]> => {
		try {
			// Choosing a team of another organization changes the cookies between two pages: every page keeps the
			// organization the read started in, the one the caller's cache key holds when it names one.
			const scope = keyScope ?? this.currentScope();
			return await this.readEveryPage({ clientId, hidesArchived: false, scope }, signal);
		} catch (error) {
			this.logValidationError(error, 'Client invoices validation failed:');
			throw error;
		}
	};

	/**
	 * Every invoice of the workspace in the given statuses, one status after the other. Meant for the drafts and the
	 * invoices still owed: they are few, and the sums drawn from them must be whole.
	 */
	getInvoicesInStatuses = async (
		statuses: ReadonlyArray<InvoiceStatus>,
		signal?: AbortSignal,
		keyScope?: InvoicesScope
	): Promise<TInvoice[]> => {
		try {
			const scope = keyScope ?? this.currentScope();
			const reads = statuses.map((status) => this.readEveryPage({ status, hidesArchived: true, scope }, signal));
			const lists = await Promise.all(reads);
			return lists.flat();
		} catch (error) {
			this.logValidationError(error, 'Invoices by status validation failed:');
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
	sendInvoiceByEmail = async (
		{ invoiceId, invoiceNumber, email }: InvoiceToEmail,
		scope?: InvoicesScope
	): Promise<void> => {
		// The API signs the e-mail with the organization named here: the caller's, the cookies' when left out
		const emailScope = scope ?? this.currentScope();
		const params = {
			invoiceNumber,
			invoiceId,
			isEstimate: false,
			organizationId: emailScope.organizationId,
			tenantId: emailScope.tenantId
		};
		await this.put(`/invoices/email/${encodeURIComponent(email)}`, { params }, { tenantId: emailScope.tenantId });
	};

	getInvoiceStatus = async (invoiceId: string, scope?: InvoicesScope): Promise<string | null> => {
		try {
			const readScope = scope ?? this.currentScope();
			const url = `/invoices/${encodeURIComponent(invoiceId)}`;
			const response = await this.get(url, { tenantId: readScope.tenantId });
			const invoice = validateApiResponse(invoiceStatusSchema, response.data, 'getInvoiceStatus API response');
			return invoice.status ?? null;
		} catch (error) {
			this.logValidationError(error, 'Invoice status validation failed:');
			throw error;
		}
	};

	changeInvoiceStatus = async (
		invoiceId: string,
		change: InvoiceStatusChange,
		scope?: InvoicesScope
	): Promise<void> => {
		// A copy, with the list's workspace: the request would otherwise fill in the cookies' organization and tenant,
		// which another tab may have switched since the list was read.
		const statusScope = scope ?? this.currentScope();
		const body = { ...change, organizationId: statusScope.organizationId, tenantId: statusScope.tenantId };
		await this.put(`/invoices/${encodeURIComponent(invoiceId)}/action`, body, { tenantId: statusScope.tenantId });
	};

	deleteInvoice = async (invoiceId: string, scope?: InvoicesScope): Promise<void> => {
		const deletionScope = scope ?? this.currentScope();
		await this.delete(`/invoices/${encodeURIComponent(invoiceId)}`, { tenantId: deletionScope.tenantId });
	};

	/** One invoice with its lines, their projects and its client, read in the tenant the caller's cache key holds. */
	getInvoice = async (invoiceId: string, options: SavedInvoiceReadOptions = {}): Promise<TSavedInvoice> => {
		try {
			const data = JSON.stringify({ relations: SAVED_INVOICE_RELATIONS });
			const query = qs.stringify({ data });
			const url = `/invoices/${encodeURIComponent(invoiceId)}?${query}`;
			const response = await this.get(url, readConfigOf(options));
			return validateApiResponse(savedInvoiceSchema, response.data, 'getInvoice API response');
		} catch (error) {
			this.logValidationError(error, 'Invoice validation failed:');
			throw error;
		}
	};

	/** The invoice's own fields. Its lines are written apart, by `replaceInvoiceLines`. */
	updateInvoice = async (invoiceId: string, update: InvoiceUpdate, scope?: InvoiceWriteScope): Promise<void> => {
		// A copy: the request writes the tenant and the organization into the object it is given.
		const body = { ...update };
		const updateScope = scope ?? this.currentScope();
		await this.put(`/invoices/${encodeURIComponent(invoiceId)}`, body, writeConfigOf(updateScope));
	};

	/**
	 * Replaces every line of the invoice. The API deletes its lines, then saves these, in two steps it does not undo:
	 * a failure between them leaves the invoice without lines.
	 */
	replaceInvoiceLines = async (
		invoiceId: string,
		lines: ReadonlyArray<InvoiceItemRequest>,
		scope?: InvoiceWriteScope
	): Promise<void> => {
		const body: InvoiceItemRequest[] = [...lines];
		const linesScope = scope ?? this.currentScope();
		const config = writeConfigOf(linesScope);
		// The body is the list itself: each line already names its tenant and organization.
		await this.post(`/invoice-item/bulk/${encodeURIComponent(invoiceId)}`, body, config, false);
	};
}

export const invoiceService = new InvoiceService(GAUZY_API_BASE_SERVER_URL.value);
