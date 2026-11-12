import qs from 'qs';
import { APIService } from '../../api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { CLIENT_CONTACT_TYPE } from '@/core/lib/utils/clients';
import {
	clientRequestSchema,
	clientSchema,
	validateApiResponse,
	validatePaginationResponse,
	ZodValidationError,
	TClient,
	TClientRequest
} from '@/core/types/schemas';

/** The API serves at most 100 contacts a page. */
const CLIENTS_PAGE_SIZE = 100;

/** A workspace past this many clients shows the first ones; the list has no paging of its own. */
const CLIENTS_MAX_PAGES = 20;

interface GetClientsOptions {
	/** Archived clients come with the active ones, told apart by `deletedAt`. */
	includeArchived?: boolean;
	signal?: AbortSignal;
}

interface ClientsScope {
	organizationId: string;
	tenantId: string;
}

class OrganizationContactService extends APIService {
	private logValidationError(error: unknown, message: string) {
		if (error instanceof ZodValidationError) {
			this.logger.error(message, { message: error.message, issues: error.issues }, 'OrganizationContactService');
		}
	}

	private clientsPageQuery(page: number, includeArchived: boolean, scope: ClientsScope) {
		const params: Record<string, string> = {
			'where[organizationId]': scope.organizationId,
			'where[tenantId]': scope.tenantId,
			'where[contactType]': CLIENT_CONTACT_TYPE,
			'order[name]': 'ASC',
			take: String(CLIENTS_PAGE_SIZE),
			// The API counts pages from 1 on this route.
			skip: String(page)
		};
		if (includeArchived) {
			params.withDeleted = 'true';
		}
		return qs.stringify(params);
	}

	/**
	 * The organization's clients, by name. Active ones only unless `includeArchived` is set.
	 */
	getClients = async ({ includeArchived = false, signal }: GetClientsOptions = {}): Promise<TClient[]> => {
		try {
			// Choosing a team of another organization changes the cookies between two pages: every page keeps the
			// organization the read started in, so one list never mixes the clients of two organizations.
			const scope: ClientsScope = { organizationId: this.organizationId, tenantId: this.tenantId };
			const clients: TClient[] = [];
			for (let page = 1; page <= CLIENTS_MAX_PAGES; page += 1) {
				const query = this.clientsPageQuery(page, includeArchived, scope);
				const response = await this.get(`/organization-contact/pagination?${query}`, {
					signal,
					tenantId: scope.tenantId
				});
				const { items, total } = validatePaginationResponse(
					clientSchema,
					response.data,
					'getClients API response'
				);
				clients.push(...items);
				const isLastPage = items.length < CLIENTS_PAGE_SIZE;
				const hasEverything = clients.length >= total;
				if (isLastPage || hasEverything) {
					break;
				}
			}
			return clients;
		} catch (error) {
			this.logValidationError(error, 'Clients validation failed:');
			throw error;
		}
	};

	createClient = async (data: TClientRequest): Promise<TClient> => {
		try {
			const body = validateApiResponse(clientRequestSchema, data, 'createClient input data');
			const response = await this.post('/organization-contact', body);
			return validateApiResponse(clientSchema, response.data, 'createClient API response');
		} catch (error) {
			this.logValidationError(error, 'Client creation validation failed:');
			throw error;
		}
	};

	updateClient = async ({ clientId, data }: { clientId: string; data: TClientRequest }): Promise<TClient> => {
		try {
			const body = validateApiResponse(clientRequestSchema, data, 'updateClient input data');
			const response = await this.put(`/organization-contact/${clientId}`, body);
			return validateApiResponse(clientSchema, response.data, 'updateClient API response');
		} catch (error) {
			this.logValidationError(error, 'Client update validation failed:');
			throw error;
		}
	};

	private scopeQuery() {
		return qs.stringify({ organizationId: this.organizationId, tenantId: this.tenantId });
	}

	/** Archiving withdraws the client and keeps its row, its projects and their time. */
	archiveClient = async (clientId: string): Promise<void> => {
		await this.delete(`/organization-contact/${clientId}/soft?${this.scopeQuery()}`);
	};

	restoreClient = async (clientId: string): Promise<void> => {
		await this.put(`/organization-contact/${clientId}/recover?${this.scopeQuery()}`, {});
	};
}

export const organizationContactService = new OrganizationContactService(GAUZY_API_BASE_SERVER_URL.value);
