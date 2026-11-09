import { APIService } from '@/core/services/client/api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import type {
	ITrelloConnectionSummary,
	ITrelloList,
	ITrelloMapping,
	ITrelloMappingInput,
	ITrelloMetadata,
	ITrelloRun,
	ITrelloStatus
} from '@/core/types/interfaces/integrations/trello';

const BASE = '/integration/trello';
const segment = (value: string) => encodeURIComponent(value);

/**
 * Client of the platform's Trello integration routes. The same paths serve both transports: the platform
 * directly, or this app's proxies under `/api/integration/trello/**`, which hand each call on as it is.
 */
class TrelloIntegrationService extends APIService {
	/** Whether the platform holds the application's key and takes webhooks, and the organization's connection if any (404 where the plugin is off). */
	status = async (organizationId: string, signal?: AbortSignal): Promise<ITrelloStatus> => {
		const response = await this.get<ITrelloStatus>(`${BASE}/status?organizationId=${segment(organizationId)}`, { signal });
		return response.data;
	};

	/** Starts the connect flow: the platform's single-use state and Trello's authorize page to send the person to. */
	installState = async (organizationId: string): Promise<{ state: string; authorizeUrl: string }> => {
		const response = await this.post<{ state: string; authorizeUrl: string }>(`${BASE}/install/state`, { organizationId });
		return response.data;
	};

	/** Finishes the connect flow with the token Trello returned in the address and the state the flow started with. */
	connect = async (organizationId: string, token: string, state: string): Promise<ITrelloConnectionSummary> => {
		const response = await this.post<ITrelloConnectionSummary>(`${BASE}/connect`, { organizationId, token, state });
		return response.data;
	};

	summary = async (integrationId: string, signal?: AbortSignal): Promise<ITrelloConnectionSummary> => {
		const response = await this.get<ITrelloConnectionSummary>(`${BASE}/${segment(integrationId)}`, { signal });
		return response.data;
	};

	disconnect = async (integrationId: string): Promise<void> => {
		await this.delete(`${BASE}/${segment(integrationId)}`);
	};

	/** Who the connection is, and the open boards it may see. */
	metadata = async (integrationId: string, signal?: AbortSignal): Promise<ITrelloMetadata> => {
		const response = await this.get<ITrelloMetadata>(`${BASE}/${segment(integrationId)}/metadata`, { signal });
		return response.data;
	};

	lists = async (integrationId: string, boardId: string, signal?: AbortSignal): Promise<ITrelloList[]> => {
		const response = await this.get<ITrelloList[]>(`${BASE}/${segment(integrationId)}/boards/${segment(boardId)}/lists`, { signal });
		return response.data;
	};

	mappings = async (integrationId: string, signal?: AbortSignal): Promise<ITrelloMapping[]> => {
		const response = await this.get<ITrelloMapping[]>(`${BASE}/${segment(integrationId)}/mappings`, { signal });
		return response.data;
	};

	createMapping = async (integrationId: string, input: ITrelloMappingInput): Promise<ITrelloMapping> => {
		const response = await this.post<ITrelloMapping>(`${BASE}/${segment(integrationId)}/mappings`, { ...input });
		return response.data;
	};

	updateMapping = async (integrationId: string, mappingId: string, input: Partial<ITrelloMappingInput>): Promise<ITrelloMapping> => {
		const response = await this.put<ITrelloMapping>(`${BASE}/${segment(integrationId)}/mappings/${segment(mappingId)}`, { ...input });
		return response.data;
	};

	removeMapping = async (integrationId: string, mappingId: string): Promise<void> => {
		await this.delete(`${BASE}/${segment(integrationId)}/mappings/${segment(mappingId)}`);
	};

	/** Registers the mapping's webhook on Trello again (the platform does it behind the response). */
	registerWebhook = async (integrationId: string, mappingId: string): Promise<{ accepted: true }> => {
		const response = await this.post<{ accepted: true }>(`${BASE}/${segment(integrationId)}/mappings/${segment(mappingId)}/webhook`, {});
		return response.data;
	};

	/** Starts an import (every card, or the changes since the last one); the platform answers the run at once. */
	importNow = async (integrationId: string, mappingId: string, full: boolean): Promise<{ accepted: true; run: ITrelloRun }> => {
		const response = await this.post<{ accepted: true; run: ITrelloRun }>(`${BASE}/${segment(integrationId)}/mappings/${segment(mappingId)}/import`, { full });
		return response.data;
	};

	runs = async (integrationId: string, take = 20, signal?: AbortSignal): Promise<ITrelloRun[]> => {
		const response = await this.get<ITrelloRun[]>(`${BASE}/${segment(integrationId)}/runs?take=${take}`, { signal });
		return response.data;
	};
}

export const trelloIntegrationService = new TrelloIntegrationService(GAUZY_API_BASE_SERVER_URL.value);
