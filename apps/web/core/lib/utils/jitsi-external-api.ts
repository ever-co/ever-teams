/**
 * The Jitsi Meet external API (`https://<host>/external_api.js`), loaded before a meeting room renders.
 *
 * `@jitsi/react-sdk` loads the same script on its own but only logs a failure: a host that does not resolve, an
 * error answer, a server that never answers or a page that is not a Jitsi server all left the meeting room on its
 * spinner, and the SDK keeps the failed load for the life of the page. Loaded here first, the SDK finds the API on
 * `window` and uses it as is.
 */

/** How long a meeting server gets to deliver its API script before the room says it is not answering. */
export const JITSI_API_LOAD_TIMEOUT_MS = 15_000;

/** Why the API could not be loaded: no host set, an unreachable host, no answer in time, or not a Jitsi server. */
export type JitsiApiLoadFailure = 'not-configured' | 'unreachable' | 'timeout' | 'invalid';

export class JitsiApiLoadError extends Error {
	readonly reason: JitsiApiLoadFailure;
	readonly domain: string;

	constructor(reason: JitsiApiLoadFailure, domain: string) {
		super(`The Jitsi Meet API of "${domain}" could not be loaded (${reason})`);
		this.name = 'JitsiApiLoadError';
		this.reason = reason;
		this.domain = domain;
	}
}

// The SDK types the global as always there; it only is once a server's script has run
type JitsiApiGlobal = { JitsiMeetExternalAPI?: unknown };

function loadedJitsiApi(): unknown {
	return (window as unknown as JitsiApiGlobal).JitsiMeetExternalAPI;
}

/**
 * The meeting host the way the SDK expects it, a bare host: the SDK puts `https://` in front, so a configured
 * `https://meet.example.com/` would otherwise load `https://https://meet.example.com//external_api.js`.
 */
export function normalizeMeetDomain(value: string | null | undefined): string {
	const trimmed = (value ?? '').trim();
	const withoutScheme = trimmed.replace(/^[a-z][a-z\d+.-]*:\/\//i, '');
	// Trailing slashes go with a scan: a `/\/+$/` pattern backtracks over every run of slashes it cannot end on
	let end = withoutScheme.length;
	while (end > 0 && withoutScheme[end - 1] === '/') {
		end -= 1;
	}
	return withoutScheme.slice(0, end);
}

let pendingLoad: { domain: string; promise: Promise<unknown> } | null = null;

function injectApiScript(domain: string, timeoutMs: number): Promise<unknown> {
	return new Promise((resolve, reject) => {
		const script = document.createElement('script');
		script.async = true;
		script.src = `https://${domain}/external_api.js`;
		const timer = setTimeout(() => settle('timeout'), timeoutMs);

		const settle = (failure?: JitsiApiLoadFailure) => {
			clearTimeout(timer);
			script.onload = null;
			script.onerror = null;
			const api = loadedJitsiApi();
			if (!failure && api) {
				resolve(api);
				return;
			}
			// A failed script leaves the page, so the next attempt loads it again
			script.remove();
			reject(new JitsiApiLoadError(failure ?? 'invalid', domain));
		};

		script.onload = () => settle();
		script.onerror = () => settle('unreachable');
		document.head.appendChild(script);
	});
}

/**
 * Loads the Jitsi Meet API of `domain` once per page and resolves with it, or rejects with a JitsiApiLoadError. A
 * load in flight is shared; a failed one is forgotten, so retrying tries the server again.
 */
export function loadJitsiExternalApi(domain: string, timeoutMs = JITSI_API_LOAD_TIMEOUT_MS): Promise<unknown> {
	if (!domain) {
		return Promise.reject(new JitsiApiLoadError('not-configured', domain));
	}
	const api = loadedJitsiApi();
	if (api) {
		return Promise.resolve(api);
	}
	if (pendingLoad?.domain === domain) {
		return pendingLoad.promise;
	}

	const promise = injectApiScript(domain, timeoutMs);
	pendingLoad = { domain, promise };
	promise.catch(() => {
		if (pendingLoad?.promise === promise) {
			pendingLoad = null;
		}
	});
	return promise;
}
