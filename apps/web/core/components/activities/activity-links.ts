import { hasUrlScheme } from '@/core/lib/utils/url-scheme';

const WEB_PROTOCOLS = new Set(['http:', 'https:']);

/** An address from recorded data is linked only when it is a plain web address, never `javascript:` or `data:`. */
export function webAddressOf(value: unknown): string | null {
	if (typeof value !== 'string') {
		return null;
	}
	const trimmed = value.trim();
	if (trimmed.length === 0) {
		return null;
	}
	let parsed: URL;
	try {
		parsed = new URL(trimmed);
	} catch {
		return null;
	}
	const isWebAddress = WEB_PROTOCOLS.has(parsed.protocol);
	if (!isWebAddress) {
		return null;
	}
	return parsed.href;
}

/** A bare word (`YouTube`) is a name, not a host: only a dotted host or a host with its port reads as a site. */
function isHostLike(address: URL) {
	const hasDottedName = address.hostname.includes('.');
	const hasPort = address.port.length > 0;
	return hasDottedName || hasPort;
}

/** A visited site is often recorded as a bare host (`github.com`): it is read as an https address. */
export function siteAddressOf(value: unknown): string | null {
	if (typeof value !== 'string') {
		return null;
	}
	const trimmed = value.trim();
	const hasScheme = hasUrlScheme(trimmed);
	if (hasScheme) {
		return webAddressOf(trimmed);
	}
	const hasSpace = /\s/.test(trimmed);
	if (hasSpace) {
		return null;
	}
	const address = webAddressOf(`https://${trimmed}`);
	if (!address) {
		return null;
	}
	const url = new URL(address);
	const isSite = isHostLike(url);
	if (!isSite) {
		return null;
	}
	return address;
}
