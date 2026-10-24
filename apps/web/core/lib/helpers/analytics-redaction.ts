import type { CaptureResult } from 'posthog-js';

/**
 * Query parameters that carry a credential (or the address it belongs to) in the links the app is opened with: the
 * password-reset token, the invitation and magic sign-in codes, the e-mail verification token, OAuth callback codes and
 * states. Compared lower-cased.
 */
const SECRET_PARAMS: ReadonlySet<string> = new Set([
	'token',
	'code',
	'email',
	'otp',
	'password',
	'secret',
	'state',
	'session_state',
	'access_token',
	'refresh_token',
	'id_token'
]);

const REDACTED = 'redacted';

/** The parameters of a query string (or a `#a=b` fragment), with every secret value replaced; `null` when none was. */
function redactParams(raw: string): string | null {
	const params = new URLSearchParams(raw);
	let changed = false;
	for (const name of new Set(params.keys())) {
		if (SECRET_PARAMS.has(name.toLowerCase())) {
			params.set(name, REDACTED);
			changed = true;
		}
	}
	return changed ? params.toString() : null;
}

/**
 * `value` with the secret query (and fragment) parameters of the URL it holds replaced by `redacted`. A value that is
 * not an absolute URL, or has nothing secret in it, comes back unchanged.
 */
export function redactUrl(value: string): string {
	if (!/^https?:\/\//i.test(value)) return value;
	let url: URL;
	try {
		url = new URL(value);
	} catch {
		return value;
	}

	const search = url.search ? redactParams(url.search) : null;
	const hash = url.hash.includes('=') ? redactParams(url.hash.slice(1)) : null;
	if (search === null && hash === null) return value;

	if (search !== null) url.search = search;
	if (hash !== null) url.hash = hash;
	return url.toString();
}

/** The page address an analytics event describes, as an SDK that reads the browser itself would send it. */
export interface RedactedPageLocation {
	/** The address, with its secret query and fragment parameters redacted. */
	url: string;
	/** Its query string (`?a=b`), redacted; empty when it has none. */
	search: string;
	/** Its fragment (`#a=b`), redacted; empty when it has none. */
	hash: string;
	/** The referrer, redacted the same way; empty when there is none. */
	referrer: string;
}

/**
 * The page address and the referrer, with their secret parameters redacted, for an SDK that reads them from
 * `window.location` and `document.referrer` itself rather than from the event (Jitsu): its events are handed these to
 * send instead. A referrer is an auth link too when a sign-in page loads the app with a full navigation.
 */
export function redactedPageLocation(href: string, referrer: string): RedactedPageLocation {
	const url = redactUrl(href);
	let search = '';
	let hash = '';
	try {
		const parsed = new URL(url);
		search = parsed.search;
		hash = parsed.hash;
	} catch {
		// Not an absolute URL: there is no query or fragment to describe.
	}
	return { url, search, hash, referrer: referrer ? redactUrl(referrer) : '' };
}

function redactProperties(properties: Record<string, unknown> | undefined): void {
	if (!properties) return;
	for (const [key, value] of Object.entries(properties)) {
		if (typeof value === 'string') {
			properties[key] = redactUrl(value);
		}
	}
}

/**
 * PostHog `before_send` hook: every URL an event carries (`$current_url`, `$referrer`, the initial URL person
 * properties, ...) loses its secret parameters before it leaves the browser.
 *
 * The page view, page leave and autocapture events record the full address of the page, and the pages the auth e-mails
 * open (`/auth/reset-password?token=`, `/auth/accept-invite?email=&code=`, the magic sign-in link, `/verify-email`)
 * carry a live credential there: anyone who could read the analytics project could have used it.
 */
export function redactCaptureResult(event: CaptureResult | null): CaptureResult | null {
	if (!event) return event;
	redactProperties(event.properties);
	redactProperties(event.$set);
	redactProperties(event.$set_once);
	return event;
}
