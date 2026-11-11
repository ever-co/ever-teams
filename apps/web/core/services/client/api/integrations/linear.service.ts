import { APIService } from '@/core/services/client/api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { conflictQueryString } from '@/core/lib/utils/integration-sync-conflicts';
import type { IIntegrationConflictQuery, IIntegrationSyncConflict, TIntegrationConflictKeep } from '@/core/types/interfaces/integrations/integration-sync-conflict';
import type {
	ILinearConnectionSummary,
	ILinearMapping,
	ILinearMappingInput,
	ILinearRun,
	ILinearStatus,
	ILinearTeam,
	ILinearTeamDetail
} from '@/core/types/interfaces/integrations/linear';

const BASE = '/integration/linear';
const segment = (value: string) => encodeURIComponent(value);

/**
 * Client of the platform's Linear integration routes. The same paths serve both transports: the platform
 * directly, or this app's proxies under `/api/integration/linear/**`, which hand each call on as it is.
 */
class LinearIntegrationService extends APIService {
	/** Whether the platform holds the OAuth application, and the organization's connection if any (404 where the plugin is off). */
	status = async (organizationId: string, signal?: AbortSignal): Promise<ILinearStatus> => {
		const response = await this.get<ILinearStatus>(`${BASE}/status?organizationId=${segment(organizationId)}`, { signal });
		return response.data;
	};

	/** Starts the connect flow: the platform's single-use state and the Linear page to send the person to. */
	installState = async (organizationId: string): Promise<{ state: string; authorizeUrl: string }> => {
		const response = await this.post<{ state: string; authorizeUrl: string }>(`${BASE}/install/state`, { organizationId });
		return response.data;
	};

	summary = async (integrationId: string, signal?: AbortSignal): Promise<ILinearConnectionSummary> => {
		const response = await this.get<ILinearConnectionSummary>(`${BASE}/${segment(integrationId)}`, { signal });
		return response.data;
	};

	disconnect = async (integrationId: string): Promise<void> => {
		await this.delete(`${BASE}/${segment(integrationId)}`);
	};

	teams = async (integrationId: string, signal?: AbortSignal): Promise<ILinearTeam[]> => {
		const response = await this.get<ILinearTeam[]>(`${BASE}/${segment(integrationId)}/teams`, { signal });
		return response.data;
	};

	team = async (integrationId: string, teamId: string, signal?: AbortSignal): Promise<ILinearTeamDetail> => {
		const response = await this.get<ILinearTeamDetail>(`${BASE}/${segment(integrationId)}/teams/${segment(teamId)}`, { signal });
		return response.data;
	};

	mappings = async (integrationId: string, signal?: AbortSignal): Promise<ILinearMapping[]> => {
		const response = await this.get<ILinearMapping[]>(`${BASE}/${segment(integrationId)}/mappings`, { signal });
		return response.data;
	};

	createMapping = async (integrationId: string, input: ILinearMappingInput): Promise<ILinearMapping> => {
		const response = await this.post<ILinearMapping>(`${BASE}/${segment(integrationId)}/mappings`, { ...input });
		return response.data;
	};

	updateMapping = async (integrationId: string, mappingId: string, input: Partial<ILinearMappingInput>): Promise<ILinearMapping> => {
		const response = await this.put<ILinearMapping>(`${BASE}/${segment(integrationId)}/mappings/${segment(mappingId)}`, { ...input });
		return response.data;
	};

	removeMapping = async (integrationId: string, mappingId: string): Promise<void> => {
		await this.delete(`${BASE}/${segment(integrationId)}/mappings/${segment(mappingId)}`);
	};

	/** Starts an import (every issue, or the changes since the last one); the platform answers the run at once. */
	importNow = async (integrationId: string, mappingId: string, full: boolean): Promise<{ accepted: true; run: ILinearRun }> => {
		const response = await this.post<{ accepted: true; run: ILinearRun }>(`${BASE}/${segment(integrationId)}/mappings/${segment(mappingId)}/import`, { full });
		return response.data;
	};

	/** The latest runs, each with how many conflicts it found (`conflictCount`). */
	runs = async (integrationId: string, take = 20, signal?: AbortSignal): Promise<ILinearRun[]> => {
		const response = await this.get<ILinearRun[]>(`${BASE}/${segment(integrationId)}/runs?take=${take}`, { signal });
		return response.data;
	};

	/** The connection's sync conflicts, newest first: open ones unless the query says otherwise. */
	conflicts = async (integrationId: string, query: IIntegrationConflictQuery = {}, signal?: AbortSignal): Promise<IIntegrationSyncConflict[]> => {
		const response = await this.get<IIntegrationSyncConflict[]>(`${BASE}/${segment(integrationId)}/conflicts${conflictQueryString(query)}`, { signal });
		return response.data;
	};

	/**
	 * Resolves an open conflict: `external` keeps Linear's value (already the task's), `platform` writes the task's back
	 * (and a mapping that sends changes out sends it to the issue). 409 when the task changed since, 404 when it is
	 * resolved already.
	 */
	resolveConflict = async (integrationId: string, conflictId: string, keep: TIntegrationConflictKeep): Promise<IIntegrationSyncConflict> => {
		const response = await this.post<IIntegrationSyncConflict>(`${BASE}/${segment(integrationId)}/conflicts/${segment(conflictId)}/resolve`, { keep });
		return response.data;
	};
}

export const linearIntegrationService = new LinearIntegrationService(GAUZY_API_BASE_SERVER_URL.value);
