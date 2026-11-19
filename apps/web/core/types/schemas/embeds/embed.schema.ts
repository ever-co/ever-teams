import { z } from 'zod';

/** Gauzy refuses a longer credential name (`CreateEmbedCredentialDTO`). */
export const EMBED_CREDENTIAL_NAME_MAX_LENGTH = 100;

/**
 * `GET /embed-credentials/config`: whether this server has embeds on (an organization admin may ask), whether it can
 * limit a credential to one client, and whether a credential can add the people it signs in as members. An older API
 * answers neither `clientLimits` nor `addMembers`, and drops the client or the permission it is sent.
 * `personSignIn` says that an allowed site can let people sign in from it themselves (ever-gauzy #12094); an API
 * without it answers nothing.
 */
export const embedConfigSchema = z.object({
	enabled: z.boolean(),
	clientLimits: z.boolean().default(false),
	addMembers: z.boolean().default(false),
	personSignIn: z.boolean().optional()
});

/**
 * A site allowed to embed the organization's timer, with who added it and when, and whether people can sign in from
 * it themselves (`allowPersonSignIn`, absent from an API without that setting).
 */
export const embedAllowedOriginSchema = z.object({
	id: z.string().min(1),
	origin: z.string(),
	allowPersonSignIn: z.boolean().nullish(),
	createdByUserId: z.string().nullish(),
	createdAt: z.string().nullish()
});

export const embedAllowedOriginListSchema = z.array(embedAllowedOriginSchema);

/**
 * A credential as the list shows it: never its secret. `organizationContactId` is the client it is limited to;
 * `canAddMembers` says whether it adds the people it signs in as members (false from an API that does not say).
 */
export const embedCredentialSchema = z.object({
	id: z.string().min(1),
	name: z.string(),
	prefix: z.string(),
	organizationContactId: z.string().nullish(),
	canAddMembers: z
		.boolean()
		.nullish()
		.transform((value) => value === true),
	createdByUserId: z.string().nullish(),
	createdAt: z.string().nullish(),
	lastUsedAt: z.string().nullish()
});

export const embedCredentialListSchema = z.array(embedCredentialSchema);

/** `POST /embed-credentials`: the credential just created, with its secret, which Gauzy answers this once. */
export const createdEmbedCredentialSchema = embedCredentialSchema.extend({
	secret: z.string().min(1)
});

/**
 * `POST /embed/authorize`: what a site gets when the signed-in person allows it, a timer token and the renewal token
 * that gets the next pair. Shown in this answer only, and handed to the site's page alone: never logged, stored or
 * put in an address.
 */
export const embedSiteTokensSchema = z.object({
	token: z.string().min(1),
	expiresAt: z.string().min(1),
	renewalToken: z.string().min(1),
	renewalExpiresAt: z.string().min(1)
});

/**
 * What a new credential is made from: its name, the client it is limited to (`null`: the whole workspace), and
 * whether it adds the people it signs in as members (off when absent).
 */
export interface EmbedCredentialInput {
	name: string;
	organizationContactId: string | null;
	canAddMembers?: boolean;
}

/**
 * An origin as the browser sends it: http or https, a host and an optional port, nothing after. The API normalizes it
 * again and is the judge; this only spares a round trip for an obvious typo.
 */
export function isOriginLike(value: string): boolean {
	const trimmed = value.trim();
	if (!trimmed || trimmed.includes('*')) {
		return false;
	}
	// Read as typed, before URL parsing drops a path such as `/portal/..` or reads `https:host` as `https://host`.
	if (!/^https?:\/\/[^/?#\\]+\/?$/i.test(trimmed)) {
		return false;
	}
	try {
		const url = new URL(trimmed);
		const web = url.protocol === 'https:' || url.protocol === 'http:';
		const bare = url.pathname === '/' && !url.search && !url.hash && !url.username && !url.password;
		return web && bare;
	} catch {
		return false;
	}
}

export type EmbedConfig = z.infer<typeof embedConfigSchema>;
export type EmbedAllowedOrigin = z.infer<typeof embedAllowedOriginSchema>;
export type EmbedCredential = z.infer<typeof embedCredentialSchema>;
export type CreatedEmbedCredential = z.infer<typeof createdEmbedCredentialSchema>;
export type EmbedSiteTokens = z.infer<typeof embedSiteTokensSchema>;
