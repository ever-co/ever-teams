import { z } from 'zod';

/** Gauzy refuses a longer credential name (`CreateEmbedCredentialDTO`). */
export const EMBED_CREDENTIAL_NAME_MAX_LENGTH = 100;

/** `GET /embed-credentials/config`: whether this server has embeds on (an organization admin may ask). */
export const embedConfigSchema = z.object({
	enabled: z.boolean()
});

/** A site allowed to embed the organization's timer, with who added it and when. */
export const embedAllowedOriginSchema = z.object({
	id: z.string().min(1),
	origin: z.string(),
	createdByUserId: z.string().nullish(),
	createdAt: z.string().nullish()
});

export const embedAllowedOriginListSchema = z.array(embedAllowedOriginSchema);

/** A credential as the list shows it: never its secret. */
export const embedCredentialSchema = z.object({
	id: z.string().min(1),
	name: z.string(),
	prefix: z.string(),
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
 * An origin as the browser sends it: http or https, a host and an optional port, nothing after. The API normalizes it
 * again and is the judge; this only spares a round trip for an obvious typo.
 */
export function isOriginLike(value: string): boolean {
	const trimmed = value.trim();
	if (!trimmed || trimmed.includes('*')) {
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

export type EmbedAllowedOrigin = z.infer<typeof embedAllowedOriginSchema>;
export type EmbedCredential = z.infer<typeof embedCredentialSchema>;
export type CreatedEmbedCredential = z.infer<typeof createdEmbedCredentialSchema>;
