import { errorStatusOf, gauzyErrorCodeOf } from '@/core/lib/utils/error-feedback';
import type { ITeamMenuOrganizations } from '@/core/lib/utils/team-menu-organizations';
import { isOriginLike, type EmbedSiteTokens } from '@/core/types/schemas/embeds/embed.schema';

/**
 * The messages `/embed/authorize` posts to the site's page that opened it (the kit's "Sign in with Ever Teams" popup).
 * The kit reads them only from this app's origin, from the popup it opened, and with the state it put in its address.
 */
export const EMBED_AUTHORIZED_MESSAGE = 'ever-teams:embed-authorized';
export const EMBED_DENIED_MESSAGE = 'ever-teams:embed-denied';

/**
 * The site that asks, by its exact origin, the organization it signs people in to, and the one-time state the kit's
 * popup carries, which each message to the site repeats.
 */
export interface EmbedAuthorizeRequest {
	origin: string;
	organizationId: string;
	state: string;
}

/** What the API is asked for: the site and the organization, never the state, which stays between page and site. */
export type EmbedSiteToAllow = Pick<EmbedAuthorizeRequest, 'origin' | 'organizationId'>;

// The kit's state: 128 random bits as hex. Any URL-safe token of 16 to 128 characters is taken.
const STATE_PATTERN = /^[\w-]{16,128}$/;

/** Why the API refused to let the site sign the person in, as the page says it. */
export type EmbedSiteRefusal = 'site-not-allowed' | 'sign-in-off' | 'member-not-allowed' | 'unavailable' | 'failed';

const REFUSALS_BY_CODE: Record<string, EmbedSiteRefusal> = {
	EMBED_ORIGIN_NOT_ALLOWED: 'site-not-allowed',
	EMBED_SITE_SIGN_IN_OFF: 'sign-in-off',
	EMBED_MEMBER_NOT_ALLOWED: 'member-not-allowed'
};

/**
 * A site's origin exactly as a browser names it in `location.origin`: http or https, a host and an optional port, and
 * nothing else, not even a trailing slash. The tokens are posted to this origin only.
 */
export function isPlainOrigin(value: string): boolean {
	if (!isOriginLike(value)) {
		return false;
	}
	return new URL(value).origin === value;
}

/**
 * The site, the organization and the state the page's query names (`origin`, `organization`, `state`), or null when
 * any of them is wrong.
 */
export function embedAuthorizeRequestOf(query: Pick<URLSearchParams, 'get'>): EmbedAuthorizeRequest | null {
	const origin = query.get('origin') ?? '';
	const organizationId = query.get('organization')?.trim() ?? '';
	const state = query.get('state') ?? '';
	const hasOrigin = isPlainOrigin(origin);
	const hasOrganization = organizationId.length > 0;
	const hasState = STATE_PATTERN.test(state);
	if (!hasOrigin || !hasOrganization || !hasState) {
		return null;
	}
	return { origin, organizationId, state };
}

/**
 * The site's page that opened this window, or null: a page opened in its own tab has nobody to hand tokens to, and a
 * page shown in a frame offers no Allow that another site's page could click through.
 */
export function siteWindowOf(page: Window): Window | null {
	const isFramed = Boolean(page.top) && page.top !== page;
	if (isFramed) {
		return null;
	}
	const opener = page.opener as Window | null;
	if (!opener || opener.closed) {
		return null;
	}
	return opener;
}

/**
 * Hands the site its tokens, to its exact origin only: if the window that opened this one shows another site by now,
 * the browser drops the message.
 */
export function handTokensToSite(site: Window, request: EmbedAuthorizeRequest, tokens: EmbedSiteTokens): void {
	site.postMessage({ type: EMBED_AUTHORIZED_MESSAGE, state: request.state, ...tokens }, request.origin);
}

/** Tells the site that the person said no, to its exact origin only. */
export function tellSiteDenied(site: Window, request: EmbedAuthorizeRequest): void {
	site.postMessage({ type: EMBED_DENIED_MESSAGE, state: request.state }, request.origin);
}

/** The refusal of `POST /embed/authorize`, by the code of its 403, or a 404 from a server without the route. */
export function embedSiteRefusalOf(error: unknown): EmbedSiteRefusal {
	const code = gauzyErrorCodeOf(error);
	const isKnownCode = code !== null && Object.hasOwn(REFUSALS_BY_CODE, code);
	if (isKnownCode) {
		return REFUSALS_BY_CODE[code];
	}
	if (errorStatusOf(error) === 404) {
		return 'unavailable';
	}
	return 'failed';
}

/** This page, with its query, for the sign-in to come back to. */
export function currentPageOf(page: Window): string {
	return `${page.location.pathname}${page.location.search}`;
}

/** The organization of the request among the person's, or null when the person is not one of its members. */
export function organizationOfRequest(
	organizations: Pick<ITeamMenuOrganizations, 'current' | 'others'>,
	organizationId: string
): { id: string; name: string } | null {
	if (organizations.current?.id === organizationId) {
		return organizations.current;
	}
	const other = organizations.others.find((organization) => organization.id === organizationId);
	if (!other) {
		return null;
	}
	return { id: other.id, name: other.name };
}
