import { readRuntimeEnv } from '@/env-config';

/**
 * Runtime image hosts for next/image, decided in proxy.ts for every `/_next/image` request.
 *
 * next.config.js builds `images.remotePatterns` from NEXT_PUBLIC_IMAGES_HOSTS at BUILD time and the
 * standalone server serializes it into server.js, so a published Docker image only optimizes the
 * hosts it was built with: its optimizer answered 400 "url parameter is not allowed" for any other
 * host, and a self-hoster's avatars, project/team images and screenshots (served by THEIR Gauzy API,
 * S3 or MinIO) were broken with no fix short of rebuilding the image.
 *
 * resolveImageRequest() keeps the optimizer for everything it already served and sends the browser
 * straight to the original image (307, served as-is, not optimized) when the host is allowed only by
 * the RUNTIME env. A custom `images.loader` is not an option: it disables the optimizer entirely.
 */

/** Where Next serves its image optimizer. */
export const NEXT_IMAGE_ENDPOINT = '/_next/image';

/** 'optimize': let Next's optimizer handle the request, exactly as without proxy.ts. */
export type ImageRequestDecision = 'optimize' | { redirect: string };

/**
 * Env vars whose value, when it is an absolute URL, names an origin the BROWSER loads images from.
 * (Not the server-only GAUZY_API_SERVER_URL: browsers never load images from that internal URL.)
 */
export const RUNTIME_IMAGE_SOURCE_ENV_KEYS = [
	'NEXT_PUBLIC_GAUZY_API_SERVER_URL',
	'APP_LOGO_URL',
	'MAIN_PICTURE',
	'MAIN_PICTURE_DARK'
] as const;

type HostRule = {
	hostname: string;
	/** Leading `*.` (or `**.`) wildcard: any subdomain of `hostname`, not `hostname` itself. */
	subdomains: boolean;
	/** The protocol and port the rule requires ('' = default port). */
	protocol: string;
	port: string;
};

const SUBDOMAIN_WILDCARD = /^\*{1,2}\./;
// A bare optimizer entry is a hostname pattern; next.config never matches one with a port or path.
const BARE_HOSTNAME = /^[^\s:/?#@\\[\]]+$/;

/**
 * Whether a proxy.ts request is for the image optimizer. Mirrors Next, which hands every pathname
 * starting with `/_next/image` to the optimizer (next-server handleNextImageRequest).
 */
export function isImageOptimizerRequest(pathname: string): boolean {
	return pathname.startsWith(NEXT_IMAGE_ENDPOINT);
}

/** Entries of a comma separated host list, trimmed, empty ones dropped. */
export function splitImageHostList(value: string | null | undefined): string[] {
	return (value ?? '')
		.split(',')
		.map((entry) => entry.trim())
		.filter(Boolean);
}

/** An absolute http(s) URL without credentials, or undefined. */
function parseHttpUrl(value: string): URL | undefined {
	let url: URL;
	try {
		url = new URL(value);
	} catch {
		return undefined;
	}
	if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined;
	if (url.username || url.password || !url.hostname) return undefined;
	return url;
}

/**
 * A `host`, `host:port` or `*.host` entry means https (on the given or default port), like a
 * build-time remotePatterns hostname; a full URL entry (`http://minio.lan:9000`, or the API / logo
 * URL) allows exactly that origin. Hostnames are normalized the way URL does it.
 */
function parseHostRule(entry: string): HostRule | undefined {
	if (entry.includes('://')) {
		const url = parseHttpUrl(entry);
		return url ? { hostname: url.hostname, subdomains: false, protocol: url.protocol, port: url.port } : undefined;
	}
	const subdomains = SUBDOMAIN_WILDCARD.test(entry);
	const url = parseHttpUrl(`https://${entry.replace(SUBDOMAIN_WILDCARD, '')}`);
	return url ? { hostname: url.hostname, subdomains, protocol: url.protocol, port: url.port } : undefined;
}

/**
 * An EVER_TEAMS_OPTIMIZED_IMAGE_HOSTS entry (image-hosts.js serializeImageRemotePatterns): a bare
 * hostname pattern is https on the default port, `protocol://host[:port]` is exactly that.
 */
function parseOptimizerRule(entry: string): HostRule | undefined {
	if (entry.includes('://')) {
		const url = parseHttpUrl(entry);
		return url ? { hostname: url.hostname, subdomains: false, protocol: url.protocol, port: url.port } : undefined;
	}
	if (!BARE_HOSTNAME.test(entry)) return undefined;
	return parseHostRule(entry);
}

function matchesHost(rule: HostRule, hostname: string): boolean {
	return rule.subdomains ? hostname.endsWith(`.${rule.hostname}`) : hostname === rule.hostname;
}

function matchesOrigin(rule: HostRule, url: URL): boolean {
	return rule.protocol === url.protocol && rule.port === url.port && matchesHost(rule, url.hostname);
}

/**
 * Decides how to serve a `/_next/image` request from its `url` query parameter.
 *
 * - 'optimize' for a relative URL, for an URL the optimizer accepts (`optimizedHosts`: the build-time
 *   remotePatterns), and for anything not allowed at all (the optimizer keeps rejecting it, as before);
 * - `{ redirect }` (the normalized absolute URL) for an http(s) URL whose origin only the runtime
 *   allowlist (`runtimeHosts`) names. A host the build-time list names is never redirected, whatever
 *   the protocol or port (so e.g. Ever's own API host cannot become a redirect target).
 *
 * Hosts match exactly or through a leading `*.` wildcard (subdomains only), case-insensitively;
 * protocol and port must match the rule (bare entries: https on the default or given port).
 * Non-http(s) protocols, credentials in the URL, repeated or malformed `url` parameters are never
 * redirected.
 */
export function resolveImageRequest(
	urlParam: string | readonly string[] | null | undefined,
	optimizedHosts: readonly string[],
	runtimeHosts: readonly string[]
): ImageRequestDecision {
	const value = typeof urlParam === 'string' ? urlParam : urlParam?.length === 1 ? urlParam[0] : undefined;
	// Relative URLs are the app's own files: always the optimizer's (it also rejects `//host` URLs).
	if (!value || value.startsWith('/')) return 'optimize';

	const url = parseHttpUrl(value);
	if (!url) return 'optimize';

	const optimized = optimizedHosts.map((entry) => parseOptimizerRule(entry.trim().toLowerCase()));
	// Build-time hosts stay the optimizer's, on any protocol/port (it serves or rejects them as before).
	if (optimized.some((rule) => rule && matchesHost(rule, url.hostname))) return 'optimize';

	const allowed = runtimeHosts.map((entry) => parseHostRule(entry.trim().toLowerCase()));
	if (allowed.some((rule) => rule && matchesOrigin(rule, url))) return { redirect: url.href };

	return 'optimize';
}

/**
 * The image origins the RUNTIME env allows: NEXT_PUBLIC_IMAGES_HOSTS (comma list of `host`, `*.host`,
 * `host:port` or full `http(s)://host[:port]` entries) plus the origins of the public API, logo and
 * main picture URLs. Read through readRuntimeEnv (a computed key on the server), never
 * from a build-time inlined literal.
 */
export function getRuntimeImageHosts(readEnv: (name: string) => string | undefined = readRuntimeEnv): string[] {
	const hosts = splitImageHostList(readEnv('NEXT_PUBLIC_IMAGES_HOSTS'));
	for (const name of RUNTIME_IMAGE_SOURCE_ENV_KEYS) {
		const value = readEnv(name)?.trim();
		// Relative values (e.g. /assets/...) are served by the app itself.
		if (value && parseHttpUrl(value)) hosts.push(value);
	}
	return hosts;
}
