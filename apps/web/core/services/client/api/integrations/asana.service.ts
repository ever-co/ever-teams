import { APIService } from '@/core/services/client/api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import type {
	IAsanaConnectionSummary,
	IAsanaMapping,
	IAsanaMappingInput,
	IAsanaMetadata,
	IAsanaProject,
	IAsanaRun,
	IAsanaSection,
	IAsanaStatus
} from '@/core/types/interfaces/integrations/asana';

const BASE = '/integration/asana';
const segment = (value: string) => encodeURIComponent(value);

/**
 * Client of the platform's Asana integration routes. The same paths serve both transports: the platform
 * directly, or this app's proxies under `/api/integration/asana/**`, which hand each call on as it is.
 */
class AsanaIntegrationService extends APIService {
	/** Whether the platform holds the OAuth application and takes webhooks, and the organization's connection if any (404 where the plugin is off). */
	status = async (organizationId: string, signal?: AbortSignal): Promise<IAsanaStatus> => {
		const response = await this.get<IAsanaStatus>(`${BASE}/status?organizationId=${segment(organizationId)}`, { signal });
		return response.data;
	};

	/** Starts the connect flow: the platform's single-use state and the Asana page to send the person to. */
	installState = async (organizationId: string): Promise<{ state: string; authorizeUrl: string }> => {
		const response = await this.post<{ state: string; authorizeUrl: string }>(`${BASE}/install/state`, { organizationId });
		return response.data;
	};

	summary = async (integrationId: string, signal?: AbortSignal): Promise<IAsanaConnectionSummary> => {
		const response = await this.get<IAsanaConnectionSummary>(`${BASE}/${segment(integrationId)}`, { signal });
		return response.data;
	};

	disconnect = async (integrationId: string): Promise<void> => {
		await this.delete(`${BASE}/${segment(integrationId)}`);
	};

	/** Who the connection is, and the workspaces it opens. */
	metadata = async (integrationId: string, signal?: AbortSignal): Promise<IAsanaMetadata> => {
		const response = await this.get<IAsanaMetadata>(`${BASE}/${segment(integrationId)}/metadata`, { signal });
		return response.data;
	};

	/** The (unarchived) projects of a workspace. */
	projects = async (integrationId: string, workspaceGid: string, signal?: AbortSignal): Promise<IAsanaProject[]> => {
		const response = await this.get<IAsanaProject[]>(`${BASE}/${segment(integrationId)}/workspaces/${segment(workspaceGid)}/projects`, { signal });
		return response.data;
	};

	sections = async (integrationId: string, projectGid: string, signal?: AbortSignal): Promise<IAsanaSection[]> => {
		const response = await this.get<IAsanaSection[]>(`${BASE}/${segment(integrationId)}/projects/${segment(projectGid)}/sections`, { signal });
		return response.data;
	};

	mappings = async (integrationId: string, signal?: AbortSignal): Promise<IAsanaMapping[]> => {
		const response = await this.get<IAsanaMapping[]>(`${BASE}/${segment(integrationId)}/mappings`, { signal });
		return response.data;
	};

	createMapping = async (integrationId: string, input: IAsanaMappingInput): Promise<IAsanaMapping> => {
		const response = await this.post<IAsanaMapping>(`${BASE}/${segment(integrationId)}/mappings`, { ...input });
		return response.data;
	};

	updateMapping = async (integrationId: string, mappingId: string, input: Partial<IAsanaMappingInput>): Promise<IAsanaMapping> => {
		const response = await this.put<IAsanaMapping>(`${BASE}/${segment(integrationId)}/mappings/${segment(mappingId)}`, { ...input });
		return response.data;
	};

	removeMapping = async (integrationId: string, mappingId: string): Promise<void> => {
		await this.delete(`${BASE}/${segment(integrationId)}/mappings/${segment(mappingId)}`);
	};

	/** Registers the mapping's webhook on Asana again (the platform does it behind the response). */
	registerWebhook = async (integrationId: string, mappingId: string): Promise<{ accepted: true }> => {
		const response = await this.post<{ accepted: true }>(`${BASE}/${segment(integrationId)}/mappings/${segment(mappingId)}/webhook`, {});
		return response.data;
	};

	/** Starts an import (every task, or the changes since the last one); the platform answers the run at once. */
	importNow = async (integrationId: string, mappingId: string, full: boolean): Promise<{ accepted: true; run: IAsanaRun }> => {
		const response = await this.post<{ accepted: true; run: IAsanaRun }>(`${BASE}/${segment(integrationId)}/mappings/${segment(mappingId)}/import`, { full });
		return response.data;
	};

	runs = async (integrationId: string, take = 20, signal?: AbortSignal): Promise<IAsanaRun[]> => {
		const response = await this.get<IAsanaRun[]>(`${BASE}/${segment(integrationId)}/runs?take=${take}`, { signal });
		return response.data;
	};
}

export const asanaIntegrationService = new AsanaIntegrationService(GAUZY_API_BASE_SERVER_URL.value);
