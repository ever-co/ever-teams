import { errorStatusOf } from '@/core/lib/utils/error-feedback';
import type { EmbedSiteGrant } from '@/core/types/schemas/embeds/embed.schema';

/**
 * The sites the signed-in person allowed to use their timer through "Sign in with Ever Teams", as Gauzy lists them
 * (`GET /embed/grants`): each can renew its sign-in until `expiresAt`, unless the person ends it first
 * (`DELETE /embed/grants/:id`).
 */

const NOT_FOUND = 404;

function timeOf(value: string): number {
	const time = new Date(value).getTime();
	if (Number.isNaN(time)) {
		return 0;
	}
	return time;
}

/** The site that can renew its sign-in the longest first; the list given is left as it is. */
export function siteGrantsInOrder(grants: readonly EmbedSiteGrant[]): EmbedSiteGrant[] {
	return [...grants].sort((first, second) => timeOf(second.expiresAt) - timeOf(first.expiresAt));
}

/** Until when the site can renew its sign-in, or null when the API gave no date that reads. */
export function renewalEndOf(grant: EmbedSiteGrant): Date | null {
	const end = new Date(grant.expiresAt);
	if (Number.isNaN(end.getTime())) {
		return null;
	}
	return end;
}

/** The site as a person names it: its host, with its port when it has one. An origin that does not parse stays whole. */
export function siteHostOf(origin: string): string {
	try {
		const host = new URL(origin).host;
		if (!host) {
			return origin;
		}
		return host;
	} catch {
		return origin;
	}
}

/**
 * Whether the API has no list of allowed sites: a server with embeds off, or a Gauzy before the route, answers 404.
 * The section is then not shown.
 */
export function isSiteGrantsUnavailable(error: unknown): boolean {
	return errorStatusOf(error) === NOT_FOUND;
}

/**
 * Whether the sign-in a person asked to end was already gone (Gauzy's 404 on `DELETE /embed/grants/:id`): it expired
 * or was ended from another tab, which is what the person asked for.
 */
export function isSiteGrantAlreadyEnded(error: unknown): boolean {
	return errorStatusOf(error) === NOT_FOUND;
}
