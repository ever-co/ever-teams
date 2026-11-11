import { siteAddressOf } from '@/core/components/activities/activity-links';
import { readRuntimeEnv } from '@/env-config';
import brandData from './activity-brands.json';

/**
 * The icons of tracked apps and visited sites (#5023). A row tells its title and, where the platform says so, its kind
 * and its address: an app or a site is recognised from those.
 */
export interface ActivitySubject {
	/** The app's name, or the site's host or page title. */
	title: string;
	/** `url` for a visited site, `app` for a desktop app; unset where the row does not say (the usage report). */
	kind?: 'app' | 'url' | null;
	/** The visited address, where the row carries it. */
	url?: string | null;
}

/** An app name as it is compared: lower case, without `.exe` or `.app`, dashes, dots and runs of spaces as one space. */
export function appNameKeyOf(title: string): string {
	return title
		.toLowerCase()
		.replace(/\.(exe|app)$/, '')
		.replaceAll(/[._-]+/g, ' ')
		.replaceAll(/\s+/g, ' ')
		.trim();
}

/** The visited address an entry's metadata holds (an object, or its JSON as a string, as SQLite stores it), if any. */
export function addressOfMetaData(metaData: unknown): string | null {
	let value = metaData;
	if (typeof value === 'string') {
		try {
			value = JSON.parse(value);
		} catch {
			return null;
		}
	}
	const isRecord = typeof value === 'object' && value !== null && !Array.isArray(value);
	const url = isRecord ? (value as { url?: unknown }).url : undefined;
	return typeof url === 'string' && url.trim() ? url.trim() : null;
}

function hostOfAddress(address: string | null | undefined): string | null {
	if (!address) {
		return null;
	}
	try {
		const url = new URL(address);
		if (url.protocol !== 'https:' && url.protocol !== 'http:') {
			return null;
		}
		return url.hostname.toLowerCase().replace(/\.$/, '') || null;
	} catch {
		return null;
	}
}

/** A Windows program's name (`Code.exe`) reads like a host but is an app. (`.app` stays a host: `linear.app`.) */
const PROGRAM_NAME = /\.exe$/i;

/**
 * The host of a row's site: its recorded address first, else a title that is a bare host (`github.com`, as the
 * platform records many visited sites). An app has none, even with an address in its entry: on macOS the desktop
 * timer records the browser's current page with the browser's own entry too.
 */
export function activityHostOf(subject: ActivitySubject): string | null {
	const isProgramName = PROGRAM_NAME.test(subject.title.trim());
	if (subject.kind === 'app' || isProgramName) {
		return null;
	}
	return hostOfAddress(subject.url) ?? hostOfAddress(siteAddressOf(subject.title));
}

/** Whether a host is one of a domain's: the domain itself or a sub-domain of it (`www.github.com`, `gist.github.com`). */
export function isHostOf(host: string, domain: string): boolean {
	return host === domain || host.endsWith(`.${domain}`);
}

const LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

/**
 * Whether a host may be asked for its favicon: a public DNS name of two labels or more, letters, digits and dashes
 * (punycode for the others). An IP address, a port, a single label (`localhost`) or anything else is not one.
 */
export function isFaviconHost(host: string): boolean {
	if (host.length === 0 || host.length > 253) {
		return false;
	}
	const labels = host.split('.');
	const topLevel = labels.at(-1) ?? '';
	const hasLetters = /[a-z]/.test(topLevel);
	return labels.length >= 2 && hasLetters && labels.every((label) => LABEL.test(label));
}

/** The app's address of a host's favicon: same origin, so the browser never asks the visited site itself. */
export function faviconPathOf(host: string): string {
	return `/api/favicons/${encodeURIComponent(host)}`;
}

/**
 * Whether the web server fetches the favicons of visited sites (`NEXT_PUBLIC_FAVICONS_ENABLED=true`, read at runtime).
 * Off by default: it reaches the sites the team visited. The bundled icons of common apps and sites show either way.
 */
export function faviconsEnabled(): boolean {
	const runtimeFlag = readRuntimeEnv('NEXT_PUBLIC_FAVICONS_ENABLED') || process.env.NEXT_PUBLIC_FAVICONS_ENABLED;
	return runtimeFlag === 'true';
}

/**
 * Common apps and sites drawn with their own mark and colour, bundled with the app (no request): their app names
 * (as appNameKeyOf reads them) and their domains, in activity-brands.json.
 */
export type ActivityBrandKey = keyof typeof brandData;

interface BrandEntry {
	color: string;
	apps: string[];
	domains: string[];
}

export interface ActivityBrand {
	key: ActivityBrandKey;
	color: string;
}

const BRANDS = brandData as Readonly<Record<ActivityBrandKey, BrandEntry>>;
const BRAND_KEYS = Object.keys(BRANDS) as ActivityBrandKey[];

const BRAND_OF_APP = new Map<string, ActivityBrandKey>(
	BRAND_KEYS.flatMap((key) => BRANDS[key].apps.map((app) => [app, key] as const))
);

/** The brands' domains, longest first: `mail.google.com` is Gmail before `google.com` is Google. */
const BRAND_DOMAINS = BRAND_KEYS.flatMap((key) => BRANDS[key].domains.map((domain) => ({ domain, key }))).sort(
	(a, b) => b.domain.length - a.domain.length
);

function brandOf(key: ActivityBrandKey | undefined): ActivityBrand | null {
	return key ? { key, color: BRANDS[key].color } : null;
}

/**
 * The bundled brand of a row: by its site's host, else, for what is not known to be a site, by its app name. Where the
 * row does not say which it is, a known app's name decides first unless the title is a host (a browser's entry holds
 * the page it showed), and an app name that reads like a host (`Figma.app`) decides once no brand owns that host.
 */
export function activityBrandOf(subject: ActivitySubject): ActivityBrand | null {
	const byApp = subject.kind === 'url' ? undefined : BRAND_OF_APP.get(appNameKeyOf(subject.title));
	const isTitleAHost = hostOfAddress(siteAddressOf(subject.title)) !== null;
	if (byApp && subject.kind == null && !isTitleAHost) {
		return brandOf(byApp);
	}
	const host = activityHostOf(subject);
	const byDomain = host ? BRAND_DOMAINS.find(({ domain }) => isHostOf(host, domain))?.key : undefined;
	if (byDomain) {
		return brandOf(byDomain);
	}
	if (subject.kind === 'url') {
		return null;
	}
	return brandOf(byApp);
}
