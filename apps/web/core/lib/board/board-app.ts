import { readRuntimeEnv } from '@/env-config';

/**
 * The Ever Teams side of the Board app (NEXT_PUBLIC_BOARD_APP_DOMAIN, github.com/ever-co/ever-teams-boards).
 *
 * One Board serves several Ever Teams deployments (app., stage. and demo.ever.team), and the session of each stays
 * on its own host. So a deployment tells the Board where it was opened from, and the Board comes back to that
 * deployment to sign the person in and to ask who is signed in:
 * - the Board address names this deployment's origin in its `origin` parameter (boardAppUrl);
 * - a sign-in the Board starts, `/auth/passcode?redirect=<board address>`, ends back on the Board (boardReturnUrl);
 * - `/api/board/session` tells the Board who is signed in, and answers the Board origin only (isTrustedBoardOrigin).
 *
 * The one Board origin a deployment trusts is the origin of NEXT_PUBLIC_BOARD_APP_DOMAIN, compared exactly. It must
 * use https; plain http is accepted for localhost only, while NODE_ENV is development.
 */

/** The Board address parameter that names the Ever Teams origin the Board was opened from. */
export const BOARD_EVER_TEAMS_ORIGIN_PARAM = 'origin';

/** The sign-in page parameter the Board puts its own address in (`/auth/passcode?redirect=<board address>`). */
export const BOARD_RETURN_PARAM = 'redirect';

// Far longer than a Board address with its members and room: anything longer is refused before it is parsed.
const MAX_BOARD_URL_LENGTH = 8192;

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

export interface BoardTrust {
	/** NEXT_PUBLIC_BOARD_APP_DOMAIN as the deployment set it. */
	boardAppDomain?: string | null;
	/** Whether plain http is accepted for localhost (true while NODE_ENV is development). */
	allowLocalhostHttp?: boolean;
}

/** This deployment's Board settings, read at runtime: a published Docker image is configured with its container env. */
export function configuredBoardTrust(): BoardTrust {
	return {
		boardAppDomain: readRuntimeEnv('NEXT_PUBLIC_BOARD_APP_DOMAIN') || process.env.NEXT_PUBLIC_BOARD_APP_DOMAIN,
		allowLocalhostHttp: process.env.NODE_ENV === 'development'
	};
}

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

/**
 * Whether `url` may be a Board address: https, or http on localhost when allowed, and no user name or password, which
 * only serve to make an address read as another host (`https://board.example.com@evil.example`).
 */
function isSecureBoardUrl(url: URL, trust: BoardTrust): boolean {
	if (url.username || url.password) {
		return false;
	}
	if (url.protocol === 'https:') {
		return true;
	}
	return url.protocol === 'http:' && trust.allowLocalhostHttp === true && LOOPBACK_HOSTS.has(url.hostname);
}

/** The Board origin this deployment trusts, or null when NEXT_PUBLIC_BOARD_APP_DOMAIN is unset or not a secure URL. */
export function trustedBoardOrigin(trust: BoardTrust = configuredBoardTrust()): string | null {
	const configured = trust.boardAppDomain?.trim();
	const url = configured ? absoluteUrl(configured) : null;
	if (!url || !isSecureBoardUrl(url, trust)) {
		return null;
	}
	return url.origin;
}

/** Whether a request's `Origin` header names the trusted Board origin, exactly. */
export function isTrustedBoardOrigin(
	origin: string | null | undefined,
	trust: BoardTrust = configuredBoardTrust()
): origin is string {
	const trusted = trustedBoardOrigin(trust);
	return trusted !== null && origin === trusted;
}

/**
 * The address to send a person back to at the end of a sign-in the Board started, or null when `candidate` is not an
 * absolute, secure address on the trusted Board origin. Anything else (another host, a look-alike host, a relative
 * or protocol-relative path, `javascript:`, `blob:`, a user name in front of the host, http outside local development)
 * is ignored, so the parameter can never send someone to a site of an attacker's choosing. The address returned is
 * the parsed one, never the raw text.
 */
export function boardReturnUrl(candidate: unknown, trust: BoardTrust = configuredBoardTrust()): string | null {
	if (typeof candidate !== 'string' || candidate.length === 0 || candidate.length > MAX_BOARD_URL_LENGTH) {
		return null;
	}
	const trusted = trustedBoardOrigin(trust);
	const url = trusted ? absoluteUrl(candidate) : null;
	if (!url || !isSecureBoardUrl(url, trust) || url.origin !== trusted) {
		return null;
	}
	return url.href;
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
 * Null when the setting is not a Board address this deployment trusts (https, or http on localhost in development,
 * no user name): such a Board could neither check the session nor be returned to after a sign-in, so the in-app
 * board opens instead.
 */
export function boardAppUrl(
	boardAppDomain: string | null | undefined,
	everTeamsOrigin: string | null | undefined,
	trust: Pick<BoardTrust, 'allowLocalhostHttp'> = configuredBoardTrust()
): URL | null {
	const configured = boardAppDomain?.trim();
	const url = configured ? absoluteUrl(configured) : null;
	if (!url || !isSecureBoardUrl(url, trust)) {
		return null;
	}
	return withEverTeamsOrigin(url, everTeamsOrigin);
}

/** What the Board learns about the signed-in person: enough to name them and show their picture to collaborators. */
interface BoardSessionUser {
	id: string;
	name: string;
	imageUrl: string | null;
}

interface SessionUserFields {
	id?: unknown;
	name?: unknown;
	firstName?: unknown;
	lastName?: unknown;
	imageUrl?: unknown;
	/** The user's image asset, when `imageUrl` is not filled in: its full size, its thumbnail, else its address. */
	image?: unknown;
}

function text(value: unknown): string {
	return typeof value === 'string' ? value.trim() : '';
}

function imageAssetUrl(image: unknown): string {
	if (!image || typeof image !== 'object') {
		return '';
	}
	const asset = image as { fullUrl?: unknown; thumbUrl?: unknown; url?: unknown };
	return text(asset.fullUrl) || text(asset.thumbUrl) || text(asset.url);
}

/** The signed-in person as the Board sees them: never the e-mail address, the role, the tenant or a token. */
export function boardSessionUser(user: SessionUserFields): BoardSessionUser {
	const fullName = [text(user.firstName), text(user.lastName)].filter(Boolean).join(' ');
	return {
		id: text(user.id),
		name: text(user.name) || fullName,
		imageUrl: text(user.imageUrl) || imageAssetUrl(user.image) || null
	};
}
