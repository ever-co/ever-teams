import { readRuntimeEnv } from '@/env-config';
import { isPlainObject } from './route-helpers';

/**
 * The allow-list of /api/ever-connect/*: the organization-level routes of the paired API's Ever
 * Platform module, each with its method, and the query parameters and body fields they take.
 * Everything else answers 404 without a request.
 */

export type ProxyMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export interface ProxyRule {
	readonly id: string;
	readonly method: ProxyMethod;
	readonly pattern: RegExp;
	/** The body fields this route takes (validated), if any. */
	readonly body?: (body: unknown) => Record<string, unknown> | null;
	/**
	 * The API answers this route only for the browser origins it lists: forwarded only for this app's own pages,
	 * with this app's origin.
	 */
	readonly sameOrigin?: true;
}

const KEY = '[a-z][a-z0-9_]{1,39}';
const UUID = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';
const LINK_CODE = /^EVL(-[0-9A-HJKMNP-TV-Z]{4}){3}$/;

const linkCodeBody = (body: unknown) =>
	isPlainObject(body) && typeof body.link_code === 'string' && LINK_CODE.test(body.link_code)
		? { link_code: body.link_code }
		: null;
const enabledBody = (body: unknown) =>
	isPlainObject(body) && typeof body.enabled === 'boolean' ? { enabled: body.enabled } : null;

export const EVER_CONNECT_PROXY_RULES: readonly ProxyRule[] = [
	{ id: 'health', method: 'GET', pattern: /^health$/ },
	{ id: 'status', method: 'GET', pattern: /^status$/ },
	{ id: 'integrations', method: 'GET', pattern: /^integrations$/ },
	{ id: 'integrations_refresh', method: 'POST', pattern: /^integrations\/refresh$/ },
	{ id: 'integration_consent_url', method: 'POST', pattern: new RegExp(`^integrations/${KEY}/consent-url$`) },
	{ id: 'integration_state', method: 'PUT', pattern: new RegExp(`^integrations/${KEY}$`), body: enabledBody },
	{ id: 'links_add', method: 'POST', pattern: /^links$/, body: linkCodeBody },
	{ id: 'links_remove', method: 'DELETE', pattern: new RegExp(`^links/${UUID}$`) },
	{ id: 'entitlement', method: 'GET', pattern: /^entitlement$/ },
	{ id: 'entitlement_refresh', method: 'POST', pattern: /^entitlement\/refresh$/ },
	{ id: 'audit', method: 'GET', pattern: /^audit$/ },
	{ id: 'launcher_config', method: 'GET', pattern: /^launcher\/config$/, sameOrigin: true },
	{ id: 'launcher_apps', method: 'GET', pattern: /^launcher\/apps$/, sameOrigin: true }
];

let warnedMalformedWebAppUrl = false;

/**
 * This app's public origin (NEXT_PUBLIC_WEB_APP_URL, else the origin the request was made to): what the API's App
 * Launcher routes check, so it must be one of the API's EVER_APP_LAUNCHER_ORIGINS. Behind a proxy that does not keep
 * the public host, set NEXT_PUBLIC_WEB_APP_URL: a wrong origin is refused by the API (403), never trusted.
 */
export function webAppOrigin(req: Request): string {
	const configured = (readRuntimeEnv('NEXT_PUBLIC_WEB_APP_URL') || process.env.NEXT_PUBLIC_WEB_APP_URL)?.trim();
	if (configured) {
		try {
			return new URL(configured).origin;
		} catch {
			if (!warnedMalformedWebAppUrl) {
				warnedMalformedWebAppUrl = true;
				console.warn('NEXT_PUBLIC_WEB_APP_URL is not a URL; the App Launcher uses the request origin instead.');
			}
		}
	}
	return new URL(req.url).origin;
}

/** Whether the browser marks the request as made by one of this app's own pages. */
export function fromOwnPage(req: Request, origin: string): boolean {
	const sent = req.headers.get('origin');
	if (sent !== null) return sent === origin;
	return req.headers.get('sec-fetch-site') === 'same-origin';
}

/** The query parameters the organization routes read, each with its shape. */
const QUERY_PARAMS: Record<string, RegExp> = {
	organizationId: new RegExp(`^${UUID}$`),
	page: /^\d{1,4}$/,
	limit: /^\d{1,3}$/,
	integration: new RegExp(`^${KEY}$`)
};

export const MAX_PROXY_BODY_BYTES = 4096;

export function forwardedQuery(url: URL): string {
	const kept = new URLSearchParams();
	for (const [name, pattern] of Object.entries(QUERY_PARAMS)) {
		const value = url.searchParams.get(name);
		if (value !== null && pattern.test(value)) kept.set(name, value);
	}
	const text = kept.toString();
	return text ? `?${text}` : '';
}
