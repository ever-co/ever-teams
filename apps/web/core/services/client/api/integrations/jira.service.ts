import { APIService } from '@/core/services/client/api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { conflictQueryString } from '@/core/lib/utils/integration-sync-conflicts';
import type { IIntegrationConflictQuery, IIntegrationSyncConflict, TIntegrationConflictKeep } from '@/core/types/interfaces/integrations/integration-sync-conflict';
import type {
	IJiraConnectionSummary,
	IJiraMapping,
	IJiraMappingInput,
	IJiraProject,
	IJiraProjectDetail,
	IJiraRun,
	IJiraSite,
	IJiraStatus,
	TJiraWebhookOutcome
} from '@/core/types/interfaces/integrations/jira';

const BASE = '/integration/jira';
const segment = (value: string) => encodeURIComponent(value);

/**
 * Client of the platform's Jira Cloud integration routes. The same paths serve both transports: the platform
 * directly, or this app's proxies under `/api/integration/jira/**`, which hand each call on as it is.
 */
class JiraIntegrationService extends APIService {
	/** Whether the platform holds the OAuth app and takes webhooks, and the organization's connection if any (404 where the sync is off). */
	status = async (organizationId: string, signal?: AbortSignal): Promise<IJiraStatus> => {
		const response = await this.get<IJiraStatus>(`${BASE}/status?organizationId=${segment(organizationId)}`, { signal });
		return response.data;
	};

	/** Starts the connect flow: the platform's single-use state and the Atlassian page to send the person to. */
	installState = async (organizationId: string): Promise<{ state: string; authorizeUrl: string }> => {
		const response = await this.post<{ state: string; authorizeUrl: string }>(`${BASE}/install/state`, { organizationId });
		return response.data;
	};

	summary = async (integrationId: string, signal?: AbortSignal): Promise<IJiraConnectionSummary> => {
		const response = await this.get<IJiraConnectionSummary>(`${BASE}/${segment(integrationId)}`, { signal });
		return response.data;
	};

	/** Disconnects: the platform removes the connection's webhook from Jira first, then the connection and its mappings. */
	disconnect = async (integrationId: string): Promise<void> => {
		await this.delete(`${BASE}/${segment(integrationId)}`);
	};

	/** The Jira Cloud sites the connection's token reaches; the connection's own is `selected`. */
	sites = async (integrationId: string, signal?: AbortSignal): Promise<IJiraSite[]> => {
		const response = await this.get<IJiraSite[]>(`${BASE}/${segment(integrationId)}/sites`, { signal });
		return response.data;
	};

	/** Chooses the connection's site (one of `sites`); the platform answers the connection as it now is. */
	selectSite = async (integrationId: string, cloudId: string): Promise<IJiraConnectionSummary> => {
		const response = await this.put<IJiraConnectionSummary>(`${BASE}/${segment(integrationId)}/site`, { cloudId });
		return response.data;
	};

	/** The projects of the connection's site. */
	projects = async (integrationId: string, signal?: AbortSignal): Promise<IJiraProject[]> => {
		const response = await this.get<IJiraProject[]>(`${BASE}/${segment(integrationId)}/projects`, { signal });
		return response.data;
	};

	/** A project with its issue types and the statuses its workflows use. */
	project = async (integrationId: string, jiraProjectId: string, signal?: AbortSignal): Promise<IJiraProjectDetail> => {
		const response = await this.get<IJiraProjectDetail>(`${BASE}/${segment(integrationId)}/projects/${segment(jiraProjectId)}`, { signal });
		return response.data;
	};

	mappings = async (integrationId: string, signal?: AbortSignal): Promise<IJiraMapping[]> => {
		const response = await this.get<IJiraMapping[]>(`${BASE}/${segment(integrationId)}/mappings`, { signal });
		return response.data;
	};

	createMapping = async (integrationId: string, input: IJiraMappingInput): Promise<IJiraMapping> => {
		const response = await this.post<IJiraMapping>(`${BASE}/${segment(integrationId)}/mappings`, { ...input });
		return response.data;
	};

	updateMapping = async (integrationId: string, mappingId: string, input: Partial<IJiraMappingInput>): Promise<IJiraMapping> => {
		const response = await this.put<IJiraMapping>(`${BASE}/${segment(integrationId)}/mappings/${segment(mappingId)}`, { ...input });
		return response.data;
	};

	removeMapping = async (integrationId: string, mappingId: string): Promise<void> => {
		await this.delete(`${BASE}/${segment(integrationId)}/mappings/${segment(mappingId)}`);
	};

	/** Brings the connection's webhook in line with its mappings now (after a failed registration). */
	registerWebhook = async (integrationId: string): Promise<{ outcome: TJiraWebhookOutcome; connection: IJiraConnectionSummary }> => {
		const response = await this.post<{ outcome: TJiraWebhookOutcome; connection: IJiraConnectionSummary }>(`${BASE}/${segment(integrationId)}/webhook`, {});
		return response.data;
	};

	/** Starts an import (every issue, or the changes since the last one); the platform answers the run at once. */
	importNow = async (integrationId: string, mappingId: string, full: boolean): Promise<{ accepted: true; run: IJiraRun }> => {
		const response = await this.post<{ accepted: true; run: IJiraRun }>(`${BASE}/${segment(integrationId)}/mappings/${segment(mappingId)}/import`, { full });
		return response.data;
	};

	/** The latest runs, each with its report and how many conflicts it found (`conflictCount`). */
	runs = async (integrationId: string, take = 20, signal?: AbortSignal): Promise<IJiraRun[]> => {
		const response = await this.get<IJiraRun[]>(`${BASE}/${segment(integrationId)}/runs?take=${take}`, { signal });
		return response.data;
	};

	/** The connection's sync conflicts, newest first: open ones unless the query says otherwise. */
	conflicts = async (integrationId: string, query: IIntegrationConflictQuery = {}, signal?: AbortSignal): Promise<IIntegrationSyncConflict[]> => {
		const response = await this.get<IIntegrationSyncConflict[]>(`${BASE}/${segment(integrationId)}/conflicts${conflictQueryString(query)}`, { signal });
		return response.data;
	};

	/**
	 * Resolves an open conflict: `external` keeps Jira's value (already the task's), `platform` writes the task's back
	 * (and a mapping that sends changes out sends it to the issue). 409 when the task changed since, 404 when it is
	 * resolved already.
	 */
	resolveConflict = async (integrationId: string, conflictId: string, keep: TIntegrationConflictKeep): Promise<IIntegrationSyncConflict> => {
		const response = await this.post<IIntegrationSyncConflict>(`${BASE}/${segment(integrationId)}/conflicts/${segment(conflictId)}/resolve`, { keep });
		return response.data;
	};
}

export const jiraIntegrationService = new JiraIntegrationService(GAUZY_API_BASE_SERVER_URL.value);
