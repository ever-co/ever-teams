import qs from 'qs';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { APIService } from '@/core/services/client/api.service';
import { validateApiResponse } from '@/core/types/schemas';
import {
	CreatedEmbedCredential,
	EmbedAllowedOrigin,
	EmbedConfig,
	EmbedCredential,
	EmbedCredentialInput,
	createdEmbedCredentialSchema,
	embedAllowedOriginListSchema,
	embedAllowedOriginSchema,
	embedConfigSchema,
	embedCredentialListSchema
} from '@/core/types/schemas/embeds/embed.schema';

const CREDENTIALS = '/embed-credentials';
const ORIGINS = '/embed-allowed-origins';

/**
 * Client of the platform's embeds (`/embed-credentials`, `/embed-allowed-origins`) for Settings → Embeds: the sites an
 * organization allows to embed its timer and the credentials its hosts' backends exchange for timer-only tokens. Both
 * transports (this app's proxies, or the platform directly). Every read names the organization; the writes carry it
 * in their body.
 */
class EmbedsService extends APIService {
	private organizationQuery(organizationId: string): string {
		return qs.stringify({ organizationId });
	}

	/**
	 * Whether the server has embeds on, and can limit a credential to one client; a 404 means off, a 403 that the person
	 * is not an admin of the organization.
	 */
	readConfig = async (signal?: AbortSignal): Promise<EmbedConfig> => {
		const response = await this.get<unknown>(`${CREDENTIALS}/config`, { signal });
		return validateApiResponse(embedConfigSchema, response.data, 'embeds.config API response');
	};

	listOrigins = async (organizationId: string, signal?: AbortSignal): Promise<EmbedAllowedOrigin[]> => {
		const response = await this.get<unknown>(`${ORIGINS}?${this.organizationQuery(organizationId)}`, { signal });
		return validateApiResponse(embedAllowedOriginListSchema, response.data, 'embeds.origins API response');
	};

	/** Allows a site; the platform normalizes it (scheme, host and port) and refuses anything else with a 400. */
	addOrigin = async (organizationId: string, origin: string): Promise<EmbedAllowedOrigin> => {
		const response = await this.post<unknown>(ORIGINS, { origin: origin.trim(), organizationId }, undefined, false);
		return validateApiResponse(embedAllowedOriginSchema, response.data, 'embeds.addOrigin API response');
	};

	removeOrigin = async (id: string): Promise<void> => {
		await this.delete(`${ORIGINS}/${encodeURIComponent(id)}`);
	};

	listCredentials = async (organizationId: string, signal?: AbortSignal): Promise<EmbedCredential[]> => {
		const response = await this.get<unknown>(`${CREDENTIALS}?${this.organizationQuery(organizationId)}`, {
			signal
		});
		return validateApiResponse(embedCredentialListSchema, response.data, 'embeds.credentials API response');
	};

	/**
	 * A credential for the whole workspace is asked for exactly as before clients could be named: an older API, which
	 * does not know the field, gets nothing it would drop.
	 */
	private credentialBody(organizationId: string, input: EmbedCredentialInput): Record<string, string> {
		const body: Record<string, string> = { name: input.name.trim(), organizationId };
		if (input.organizationContactId) {
			body.organizationContactId = input.organizationContactId;
		}
		return body;
	}

	/** Creates a credential: the answer holds its secret, which no later read gives again, and stays out of the log. */
	createCredential = async (organizationId: string, input: EmbedCredentialInput): Promise<CreatedEmbedCredential> => {
		const body = this.credentialBody(organizationId, input);
		const response = await this.post<unknown>(CREDENTIALS, body, { secretResponse: true }, false);
		return validateApiResponse(createdEmbedCredentialSchema, response.data, 'embeds.createCredential API response');
	};

	/** Revokes a credential: its tokens are refused within 30 seconds. */
	revokeCredential = async (id: string): Promise<void> => {
		await this.delete(`${CREDENTIALS}/${encodeURIComponent(id)}`);
	};
}

export const embedsService = new EmbedsService(GAUZY_API_BASE_SERVER_URL.value);
