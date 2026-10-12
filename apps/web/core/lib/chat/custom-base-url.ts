import { lookup } from 'node:dns/promises';
import { BlockList, isIP } from 'node:net';

/**
 * Server-side check of the base URL the chat's "Custom (OpenAI-compatible)" provider sends requests to.
 * The user types that URL, and the Next.js server POSTs to it, so it must name a public https endpoint:
 * never this machine, the cluster or a private network (SSRF).
 *
 * - https only; plain http only for localhost while NODE_ENV=development.
 * - IP literals and every address a host name resolves to must be public (not loopback, private,
 *   link-local, carrier-grade NAT, multicast or reserved; IPv4 embedded in IPv6 is checked as IPv4).
 * - `CHAT_CUSTOM_BASE_URL_ALLOWLIST` (comma-separated exact host names) optionally narrows the hosts
 *   further; it never lets a host reach a private address.
 *
 * The request itself goes through `createGuardedFetch`, which repeats the address check at connect time.
 */

type Env = Record<string, string | undefined>;

export type CustomBaseUrlCheck = { ok: true; baseURL: string; allowLoopback: boolean } | { ok: false; error: string };

const REFUSED: CustomBaseUrlCheck = {
	ok: false,
	error: 'The custom base URL must be an https URL of a public OpenAI-compatible endpoint.'
};

const NOT_ALLOWED: CustomBaseUrlCheck = {
	ok: false,
	error: 'This server only accepts the custom base URL hosts its administrator allows.'
};

const BLOCKED = new BlockList();
for (const [network, prefix] of [
	['0.0.0.0', 8], // "this network"
	['10.0.0.0', 8], // private
	['100.64.0.0', 10], // carrier-grade NAT
	['127.0.0.0', 8], // loopback
	['169.254.0.0', 16], // link-local, cloud metadata
	['172.16.0.0', 12], // private
	['192.0.0.0', 24], // IETF protocol assignments
	['192.0.2.0', 24], // documentation
	['192.88.99.0', 24], // 6to4 relay anycast
	['192.168.0.0', 16], // private
	['198.18.0.0', 15], // benchmarking
	['198.51.100.0', 24], // documentation
	['203.0.113.0', 24], // documentation
	['224.0.0.0', 4], // multicast
	['240.0.0.0', 4] // reserved, broadcast
] as const) {
	BLOCKED.addSubnet(network, prefix, 'ipv4');
}
for (const [network, prefix] of [
	['::', 128], // unspecified
	['::1', 128], // loopback
	['64:ff9b:1::', 48], // local-use NAT64
	['100::', 64], // discard-only
	['2001::', 32], // Teredo
	['2001:db8::', 32], // documentation
	['fc00::', 7], // unique local
	['fe80::', 10], // link-local
	['fec0::', 10], // site-local (deprecated)
	['ff00::', 8] // multicast
] as const) {
	BLOCKED.addSubnet(network, prefix, 'ipv6');
}

const LOOPBACK = new BlockList();
LOOPBACK.addSubnet('127.0.0.0', 8, 'ipv4');
LOOPBACK.addAddress('::1', 'ipv6');

const LOCALHOST_NAME = /(^|\.)localhost$/;

/** The eight 16-bit groups of an IPv6 address, or `null` when it is not one. */
function ipv6Groups(address: string): number[] | null {
	let text = address.split('%')[0];
	const lastColon = text.lastIndexOf(':');
	const tail = text.slice(lastColon + 1);
	if (tail.includes('.')) {
		const [a, b, c, d] = tail.split('.').map(Number);
		text = `${text.slice(0, lastColon + 1)}${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`;
	}
	const halves = text.split('::');
	if (halves.length > 2) return null;
	const head = halves[0] ? halves[0].split(':') : [];
	const rest = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
	const parts = halves.length === 2 ? [...head, ...Array(8 - head.length - rest.length).fill('0'), ...rest] : head;
	if (parts.length !== 8) return null;
	return parts.map((part) => parseInt(part, 16));
}

/** The IPv4 address an IPv6 address carries (IPv4-mapped, IPv4-compatible, NAT64 or 6to4), if any. */
function embeddedIPv4(address: string): string | null {
	const groups = ipv6Groups(address);
	if (!groups) return null;
	const ipv4 = (high: number, low: number) => `${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`;
	const zeros = (from: number, to: number) => groups.slice(from, to).every((group) => group === 0);
	if (zeros(0, 5) && (groups[5] === 0xffff || groups[5] === 0)) return ipv4(groups[6], groups[7]);
	if (groups[0] === 0x64 && groups[1] === 0xff9b && zeros(2, 6)) return ipv4(groups[6], groups[7]);
	if (groups[0] === 0x2002) return ipv4(groups[1], groups[2]);
	return null;
}

function inList(address: string, list: BlockList): boolean {
	const bare = address.split('%')[0];
	const family = isIP(bare);
	if (family === 4) return list.check(bare, 'ipv4');
	if (family !== 6) return false;
	const ipv4 = embeddedIPv4(bare);
	return list.check(bare, 'ipv6') || (ipv4 !== null && list.check(ipv4, 'ipv4'));
}

/** Whether an IP address is on this machine (127.0.0.0/8, ::1, or IPv4-mapped loopback). */
export function isLoopbackAddress(address: string): boolean {
	return inList(address, LOOPBACK);
}

/**
 * Whether the server must not connect to an IP address for a caller: anything but a public unicast
 * address. A value that is not an IP address is blocked too. `allowLoopback` lets loopback through
 * (local development only).
 */
export function isBlockedAddress(address: string, allowLoopback = false): boolean {
	if (isIP(address.split('%')[0]) === 0) return true;
	if (allowLoopback && isLoopbackAddress(address)) return false;
	return inList(address, BLOCKED);
}

function normalizeHost(host: string): string {
	return host
		.trim()
		.toLowerCase()
		.replace(/^\[|\]$/g, '')
		.replace(/\.$/, '');
}

function readAllowlist(env: Env): string[] {
	return (env.CHAT_CUSTOM_BASE_URL_ALLOWLIST ?? '').split(',').map(normalizeHost).filter(Boolean);
}

/** Whether a host name resolves, and only to public addresses. */
async function resolvesToPublic(host: string): Promise<boolean> {
	try {
		const addresses = await lookup(host, { all: true, verbatim: true });
		return addresses.length > 0 && addresses.every(({ address }) => !isBlockedAddress(address));
	} catch {
		return false;
	}
}

/**
 * Checks a custom provider base URL. On success, `baseURL` is the normalized URL to hand the provider
 * (no trailing slash) and `allowLoopback` tells `createGuardedFetch` whether it is a local-development URL.
 */
export async function checkCustomBaseUrl(raw: unknown, env: Env = process.env as Env): Promise<CustomBaseUrlCheck> {
	if (typeof raw !== 'string') return REFUSED;
	let url: URL;
	try {
		url = new URL(raw.trim());
	} catch {
		return REFUSED;
	}
	if (url.username || url.password) return REFUSED;

	const host = normalizeHost(url.hostname);
	const literal = isIP(host) !== 0;
	const loopbackHost = literal ? isLoopbackAddress(host) : LOCALHOST_NAME.test(host);
	const localDevelopment = env.NODE_ENV === 'development' && loopbackHost;

	if (url.protocol !== 'https:' && !(localDevelopment && url.protocol === 'http:')) return REFUSED;

	const allowlist = readAllowlist(env);
	if (allowlist.length > 0 && !allowlist.includes(host)) return NOT_ALLOWED;

	if (!localDevelopment) {
		const isPublic = literal ? !isBlockedAddress(host) : !loopbackHost && (await resolvesToPublic(host));
		if (!isPublic) return REFUSED;
	}

	return { ok: true, baseURL: url.href.replace(/\/+$/, ''), allowLoopback: localDevelopment };
}
