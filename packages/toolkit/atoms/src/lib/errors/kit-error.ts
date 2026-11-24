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

// Literal keys, so the kit's typed translation function (i18n/i18next.d.ts) accepts them.
export const KIT_ERROR_MESSAGE_KEYS = {
	origin: 'KIT_ERRORS.ORIGIN',
	session: 'KIT_ERRORS.SESSION',
	permission: 'KIT_ERRORS.PERMISSION',
	unreachable: 'KIT_ERRORS.UNREACHABLE'
} as const satisfies Record<KitErrorKind, string>;

// The words of the password and token forms. Their sign-in goes through the API's own list of origins, which the
// sites a workspace allows in its settings do not change: a refused site is not one its admin can add (#5614).
export const SIGN_IN_ERROR_MESSAGE_KEYS = {
	...KIT_ERROR_MESSAGE_KEYS,
	origin: 'KIT_ERRORS.SIGN_IN_ORIGIN'
} as const satisfies Record<KitErrorKind, string>;

// An error answer of the API: Nest sends `statusCode`; the embed routes add a `code`.
export function kindOfAnswer(answer: { statusCode?: unknown; code?: unknown }): KitErrorKind | null {
	if (typeof answer.code === 'string' && ORIGIN_CODES.has(answer.code)) {
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

// How long the probe may take: an API that has not answered by then counts as unreachable, so checking the cause never
// holds up the message.
export const PROBE_TIMEOUT_MS = 5_000;

/**
 * A request that got no answer: the network or the API is down, or the browser blocked the answer because this site is
 * not one the API allows. A no-cors request to the API tells the last case apart: it gets an opaque answer whenever the
 * server is up, whatever the site.
 */
export async function kindOfFailedRequest(
	apiUrl: string,
	probe: typeof fetch = fetch,
	timeoutMs: number = PROBE_TIMEOUT_MS
): Promise<KitErrorKind> {
	const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
	if (offline || !apiUrl) {
		return 'unreachable';
	}
	const controller = typeof AbortController === 'undefined' ? undefined : new AbortController();
	let timer: ReturnType<typeof setTimeout> | undefined;
	const timedOut = new Promise<never>((_, reject) => {
		timer = setTimeout(() => {
			controller?.abort();
			reject(new Error('The API did not answer in time'));
		}, timeoutMs);
	});
	try {
		await Promise.race([
			probe(apiUrl, { mode: 'no-cors', cache: 'no-store', signal: controller?.signal }),
			timedOut
		]);
		return 'origin';
	} catch {
		return 'unreachable';
	} finally {
		clearTimeout(timer);
	}
}

// An error answer with no HTTP status: the API package gives this shape to a request that got no answer (a network
// error, an answer the browser blocked for this site, a body that is not JSON).
export function gotNoAnswer(answer: object): boolean {
	return !('statusCode' in answer);
}

// The notice for an error answer: one of the four kinds, else the API's text.
export function noticeOfAnswer(answer: { statusCode?: unknown; code?: unknown }, message: string): KitNotice {
	const kind = kindOfAnswer(answer);
	if (kind) {
		return { kind };
	}
	return { kind: 'other', message };
}

// A refused sign-in that the form words itself: no answer (the probe tells why), the site not allowed, a missing
// permission or the API down. Null for a 401, which the form explains as its own (a wrong password, a refused token),
// and for any other refusal, which keeps the API's text.
export async function kindOfSignInFailure(
	answer: object,
	apiUrl: string,
	probe: typeof fetch = fetch
): Promise<KitErrorKind | null> {
	if (gotNoAnswer(answer)) {
		return kindOfFailedRequest(apiUrl, probe);
	}
	const kind = kindOfAnswer(answer as { statusCode?: unknown; code?: unknown });
	if (kind === 'session') {
		return null;
	}
	return kind;
}

// The notice for what the API package returned on a failure: an answer with no status got none (the probe tells why);
// any other is classified by its status and code.
export async function noticeOfFailure(
	answer: object,
	message: string,
	apiUrl: string,
	probe: typeof fetch = fetch
): Promise<KitNotice> {
	if (gotNoAnswer(answer)) {
		return { kind: await kindOfFailedRequest(apiUrl, probe) };
	}
	return noticeOfAnswer(answer as { statusCode?: unknown; code?: unknown }, message);
}
