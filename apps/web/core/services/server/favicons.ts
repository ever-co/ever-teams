import { createGuardedFetch } from '@/core/lib/chat/guarded-fetch';

/**
 * The favicons of visited sites (#5023), fetched by the web server so the browser never asks a visited site itself.
 * Every request goes through the guarded fetch (public addresses only, checked when connecting) and follows at most
 * three redirects, each to an https address checked again. Only raster images are kept (ICO, PNG, GIF, JPEG, WebP,
 * read from their first bytes): never an SVG, which could run script on the app's origin.
 */

export interface Favicon {
	body: Uint8Array;
	type: string;
}

const TIMEOUT_MS = 5_000;
const MAX_REDIRECTS = 3;
const MAX_IMAGE_BYTES = 100 * 1024;
const MAX_PAGE_BYTES = 256 * 1024;
const MAX_LINKED_ICONS = 4;
/** What asks: some sites (Wikipedia, for one) answer 403 to a request that does not say. */
const USER_AGENT = 'Mozilla/5.0 (compatible; EverTeams-Favicons/1.0)';

/** A found favicon is kept a day, a missing one six hours; at most 500 hosts. */
const FOUND_TTL_MS = 24 * 60 * 60 * 1000;
const MISSING_TTL_MS = 6 * 60 * 60 * 1000;
const MAX_CACHED_HOSTS = 500;

const cache = new Map<string, { favicon: Favicon | null; until: number }>();
const pending = new Map<string, Promise<Favicon | null>>();

interface Fetched {
	bytes: Uint8Array;
	url: URL;
}

async function readUpTo(response: Response, maxBytes: number): Promise<Uint8Array | null> {
	const reader = response.body?.getReader();
	if (!reader) {
		return null;
	}
	const chunks: Uint8Array[] = [];
	let size = 0;
	for (;;) {
		const { done, value } = await reader.read();
		if (done) {
			break;
		}
		size += value.byteLength;
		if (size > maxBytes) {
			await reader.cancel();
			return null;
		}
		chunks.push(value);
	}
	const bytes = new Uint8Array(size);
	let offset = 0;
	for (const chunk of chunks) {
		bytes.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return bytes;
}

/** A GET that follows up to three redirects to https addresses, each through a guarded fetch of its own origin. */
async function fetchFollowing(address: string, maxBytes: number): Promise<Fetched | null> {
	let url = new URL(address);
	for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
		if (url.protocol !== 'https:' || url.username || url.password) {
			return null;
		}
		const guardedFetch = createGuardedFetch({ baseURL: url.origin, allowLoopback: false, timeoutMs: TIMEOUT_MS });
		const response = await guardedFetch(url.href, {
			headers: { accept: 'image/*,text/html;q=0.8', 'user-agent': USER_AGENT }
		});
		const location = response.headers.get('location');
		const isRedirect = response.status >= 300 && response.status < 400 && location;
		if (isRedirect) {
			await response.body?.cancel();
			url = new URL(location, url);
			continue;
		}
		if (!response.ok) {
			await response.body?.cancel();
			return null;
		}
		const bytes = await readUpTo(response, maxBytes);
		return bytes ? { bytes, url } : null;
	}
	return null;
}

const startsWith = (bytes: Uint8Array, prefix: ReadonlyArray<number>, at = 0) =>
	prefix.every((byte, index) => bytes[at + index] === byte);

/** The image type of a favicon's first bytes; null for anything else (an SVG, a page, a script). */
export function imageTypeOf(bytes: Uint8Array): string | null {
	if (startsWith(bytes, [0x00, 0x00, 0x01, 0x00])) return 'image/x-icon';
	if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
	if (startsWith(bytes, [0x47, 0x49, 0x46, 0x38])) return 'image/gif';
	if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'image/jpeg';
	const isRiff = startsWith(bytes, [0x52, 0x49, 0x46, 0x46]);
	if (isRiff && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)) return 'image/webp';
	return null;
}

async function fetchImage(address: string): Promise<Favicon | null> {
	const fetched = await fetchFollowing(address, MAX_IMAGE_BYTES).catch(() => null);
	if (!fetched) {
		return null;
	}
	const type = imageTypeOf(fetched.bytes);
	return type ? { body: fetched.bytes, type } : null;
}

/** The icons a page links (`<link rel="icon">`, `shortcut icon`, `apple-touch-icon`), in its order, not SVG ones. */
export function linkedIconsOf(html: string): string[] {
	const links: string[] = [];
	for (const [tag] of html.matchAll(/<link\b[^>]*>/gi)) {
		const rel = /\brel\s*=\s*["']?([^"'>]+)/i.exec(tag)?.[1]?.toLowerCase() ?? '';
		const href = /\bhref\s*=\s*["']?([^"'\s>]+)/i.exec(tag)?.[1];
		const isIcon = rel.split(/\s+/).some((word) => word === 'icon' || word === 'apple-touch-icon');
		const isSvg = /\.svg(\?|#|$)/i.test(href ?? '') || /image\/svg/i.test(tag);
		if (isIcon && href && !isSvg && !href.startsWith('data:')) {
			links.push(href);
		}
	}
	return links.slice(0, MAX_LINKED_ICONS);
}

async function findFavicon(host: string): Promise<Favicon | null> {
	const atRoot = await fetchImage(`https://${host}/favicon.ico`);
	if (atRoot) {
		return atRoot;
	}
	const page = await fetchFollowing(`https://${host}/`, MAX_PAGE_BYTES).catch(() => null);
	if (!page) {
		return null;
	}
	const html = new TextDecoder().decode(page.bytes);
	for (const href of linkedIconsOf(html)) {
		let address: URL;
		try {
			address = new URL(href, page.url);
		} catch {
			continue;
		}
		const linked = await fetchImage(address.href);
		if (linked) {
			return linked;
		}
	}
	return null;
}

function remember(host: string, favicon: Favicon | null) {
	if (cache.size >= MAX_CACHED_HOSTS) {
		const oldest = cache.keys().next().value;
		if (oldest !== undefined) {
			cache.delete(oldest);
		}
	}
	cache.set(host, { favicon, until: Date.now() + (favicon ? FOUND_TTL_MS : MISSING_TTL_MS) });
}

/** A host's favicon, from the cache or the site; null when it has none the app can show. One lookup per host at a time. */
export function faviconOf(host: string): Promise<Favicon | null> {
	const cached = cache.get(host);
	if (cached && cached.until > Date.now()) {
		return Promise.resolve(cached.favicon);
	}
	const running = pending.get(host);
	if (running) {
		return running;
	}
	const lookup = findFavicon(host)
		.catch(() => null)
		.then((favicon) => {
			remember(host, favicon);
			pending.delete(host);
			return favicon;
		});
	pending.set(host, lookup);
	return lookup;
}
