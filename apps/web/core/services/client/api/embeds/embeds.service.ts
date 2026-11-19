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
	EmbedSiteTokens,
	createdEmbedCredentialSchema,
	embedAllowedOriginListSchema,
	embedAllowedOriginSchema,
	embedConfigSchema,
	embedCredentialListSchema,
	embedSiteTokensSchema
} from '@/core/types/schemas/embeds/embed.schema';

const CREDENTIALS = '/embed-credentials';
const ORIGINS = '/embed-allowed-origins';
const SITE_AUTHORIZE = '/embed/authorize';

/**
 * The API made the credential without the client it was asked to limit it to (an API that drops the field, behind a
 * config read that said it could): the credential was revoked at once and its secret is never shown.
 */
export class EmbedClientNotLimitedError extends Error {
	constructor() {
		super('The API did not limit the embed credential to the client it was asked for; the credential was revoked.');
		this.name = 'EmbedClientNotLimitedError';
	}
}

/**
 * The API made the credential without letting it add members, while it was asked to (an API that drops the field,
 * behind a config read that said it could): its secret is never shown, and it was revoked at once. `isRevoked` is
 * false when that revocation failed: the credential is still active, though nobody holds its secret, and the list
 * shows it to revoke.
 */
export class EmbedMembersNotAddedError extends Error {
	readonly isRevoked: boolean;

	constructor(isRevoked = true) {
		super(
			isRevoked
				? 'The API did not let the embed credential add members as it was asked; the credential was revoked.'
				: 'The API did not let the embed credential add members as it was asked; the credential could not be revoked.'
		);
		this.name = 'EmbedMembersNotAddedError';
		this.isRevoked = isRevoked;
	}
}

/** The body of `POST /embed-credentials`: each option only when it is asked for. */
type CredentialBody = {
	name: string;
	organizationId: string;
	organizationContactId?: string;
	canAddMembers?: true;
};

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

	/**
	 * Turns on or off whether the organization's people can sign in from an allowed site themselves; off, the site's
	 * renewals stop at once. Asked only of a server whose config says `personSignIn`.
	 */
	setPersonSignIn = async (id: string, allowPersonSignIn: boolean): Promise<EmbedAllowedOrigin> => {
		const path = `${ORIGINS}/${encodeURIComponent(id)}`;
		const response = await this.patch<unknown>(path, { allowPersonSignIn }, undefined, false);
		return validateApiResponse(embedAllowedOriginSchema, response.data, 'embeds.setPersonSignIn API response');
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
	 * A credential for the whole workspace, which adds no members, is asked for exactly as before clients could be
	 * named: an older API, which does not know those fields, gets nothing it would drop.
	 */
	private credentialBody(organizationId: string, input: EmbedCredentialInput): CredentialBody {
		const body: CredentialBody = { name: input.name.trim(), organizationId };
		if (input.organizationContactId) {
			body.organizationContactId = input.organizationContactId;
		}
		if (input.canAddMembers) {
			body.canAddMembers = true;
		}
		return body;
	}

	/**
	 * Creates a credential: the answer holds its secret, which no later read gives again, and stays out of the log. A
	 * credential asked for one client that comes back without that client reaches the whole workspace: it is revoked
	 * at once and the call fails with {@link EmbedClientNotLimitedError}, so a wider credential than asked never
	 * reaches a host. One asked to add members that comes back without it is revoked the same way and the call fails
	 * with {@link EmbedMembersNotAddedError}, which says whether the revocation went through: its host would count on
	 * members it cannot add. When both are dropped, the members error is the one thrown, since it has its own words.
	 */
	createCredential = async (organizationId: string, input: EmbedCredentialInput): Promise<CreatedEmbedCredential> => {
		const body = this.credentialBody(organizationId, input);
		const response = await this.post<unknown>(CREDENTIALS, body, { secretResponse: true }, false);
		const created = validateApiResponse(
			createdEmbedCredentialSchema,
			response.data,
			'embeds.createCredential API response'
		);
		const askedClient = body.organizationContactId;
		const isClientDropped = askedClient !== undefined && created.organizationContactId !== askedClient;
		const isAddingMembersDropped = body.canAddMembers === true && created.canAddMembers !== true;
		if (!isClientDropped && !isAddingMembersDropped) {
			return created;
		}
		// Best effort: the secret is dropped here, so nobody holds it even if the revocation fails
		const isRevoked = await this.tryRevokeCredential(created.id);
		if (isAddingMembersDropped) {
			throw new EmbedMembersNotAddedError(isRevoked);
		}
		throw new EmbedClientNotLimitedError();
	};

	/**
	 * Allows a site to start and stop the signed-in person's timer, with the person's own session: the answer holds the
	 * site's timer token and renewal token, which stay out of the log. A refusal is a 403 whose code names it
	 * (EMBED_ORIGIN_NOT_ALLOWED, EMBED_SITE_SIGN_IN_OFF, EMBED_MEMBER_NOT_ALLOWED); a server without the route answers
	 * 404.
	 */
	authorizeSite = async (organizationId: string, origin: string): Promise<EmbedSiteTokens> => {
		const body = { organizationId, origin };
		const response = await this.post<unknown>(SITE_AUTHORIZE, body, { secretResponse: true }, false);
		return validateApiResponse(embedSiteTokensSchema, response.data, 'embeds.authorizeSite API response');
	};

	/** Revokes a credential: its tokens are refused within 30 seconds. */
	revokeCredential = async (id: string): Promise<void> => {
		await this.delete(`${CREDENTIALS}/${encodeURIComponent(id)}`);
	};

	/** Revokes a credential the API made other than asked: false when the revocation failed, instead of throwing. */
	private async tryRevokeCredential(id: string): Promise<boolean> {
		try {
			await this.revokeCredential(id);
			return true;
		} catch {
			return false;
		}
	}
}

export const embedsService = new EmbedsService(GAUZY_API_BASE_SERVER_URL.value);
