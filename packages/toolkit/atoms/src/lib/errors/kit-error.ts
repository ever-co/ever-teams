// The four failures a person in a host page can act on, and how the kit tells them apart.

export type KitErrorKind = 'origin' | 'session' | 'permission' | 'unreachable';

// What the widget shows: one of the four kinds, or the API's own text for any other refusal (a wrong password, a
// missing project).
export interface KitNotice {
	kind: KitErrorKind | 'other';
	message?: string;
}

// The API's codes for a site that may not embed the workspace (KIT-09 [API]).
const ORIGIN_CODES = new Set(['EMBED_ORIGIN_NOT_ALLOWED', 'EMBED_ORIGIN']);

export const KIT_ERROR_MESSAGE_KEYS: Record<KitErrorKind, string> = {
	origin: 'KIT_ERRORS.ORIGIN',
	session: 'KIT_ERRORS.SESSION',
	permission: 'KIT_ERRORS.PERMISSION',
	unreachable: 'KIT_ERRORS.UNREACHABLE'
};

// An error answer of the API: Nest sends `statusCode`; the embed routes add a `code`.
export function kindOfAnswer(answer: { statusCode?: unknown; code?: unknown }): KitErrorKind | null {
	if (ORIGIN_CODES.has(String(answer.code ?? ''))) {
		return 'origin';
	}
	const status = Number(answer.statusCode);
	if (status === 401) {
		return 'session';
	}
	if (status === 403) {
		return 'permission';
	}
	if (status >= 500) {
		return 'unreachable';
	}
	return null;
}

/**
 * A request that got no answer: the network or the API is down, or the browser blocked the answer because this site is
 * not one the API allows. A no-cors request to the API tells the last case apart: it gets an opaque answer whenever the
 * server is up, whatever the site.
 */
export async function kindOfFailedRequest(apiUrl: string, probe: typeof fetch = fetch): Promise<KitErrorKind> {
	const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
	if (offline || !apiUrl) {
		return 'unreachable';
	}
	try {
		await probe(apiUrl, { mode: 'no-cors', cache: 'no-store' });
		return 'origin';
	} catch {
		return 'unreachable';
	}
}

// The notice for an error answer: one of the four kinds, else the API's text.
export function noticeOfAnswer(answer: { statusCode?: unknown; code?: unknown }, message: string): KitNotice {
	const kind = kindOfAnswer(answer);
	if (kind) {
		return { kind };
	}
	return { kind: 'other', message };
}
