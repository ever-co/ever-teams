/**
 * The Ever Teams side of the Board app (NEXT_PUBLIC_BOARD_APP_DOMAIN, github.com/ever-co/ever-teams-boards).
 *
 * One Board serves several Ever Teams deployments (app., stage. and demo.ever.team), and the session of each stays
 * on its own host. So a deployment tells the Board where it was opened from: the Board address names this
 * deployment's origin in its `origin` parameter (boardAppUrl), and the Board can sign the person in there.
 */

/** The Board address parameter that names the Ever Teams origin the Board was opened from. */
export const BOARD_EVER_TEAMS_ORIGIN_PARAM = 'origin';

/** `value` as an absolute URL, or null. Never resolved against a base, so `/path` and `//host/path` are no address. */
function absoluteUrl(value: string): URL | null {
	try {
		return new URL(value);
	} catch {
		return null;
	}
}

function isHttpUrl(url: URL): boolean {
	return url.protocol === 'https:' || url.protocol === 'http:';
}

/** Names the Ever Teams origin on a Board address, when `everTeamsOrigin` is an http(s) address. */
export function withEverTeamsOrigin(url: URL, everTeamsOrigin: string | null | undefined): URL {
	const origin = everTeamsOrigin ? absoluteUrl(everTeamsOrigin) : null;
	if (origin && isHttpUrl(origin)) {
		url.searchParams.set(BOARD_EVER_TEAMS_ORIGIN_PARAM, origin.origin);
	}
	return url;
}

/**
 * The Board address to open from this deployment: NEXT_PUBLIC_BOARD_APP_DOMAIN, naming the Ever Teams origin the
 * person is on (`window.location.origin`), so the Board signs them in here and not on a deployment of its own choice.
 * Null when the setting is not an absolute http(s) address.
 */
export function boardAppUrl(
	boardAppDomain: string | null | undefined,
	everTeamsOrigin: string | null | undefined
): URL | null {
	const configured = boardAppDomain?.trim();
	const url = configured ? absoluteUrl(configured) : null;
	if (!url || !isHttpUrl(url)) {
		return null;
	}
	return withEverTeamsOrigin(url, everTeamsOrigin);
}
