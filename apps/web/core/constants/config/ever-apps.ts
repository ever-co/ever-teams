// cspell:words traduora
import { readRuntimeEnv } from '@/env-config';

type EverAppId = 'gauzy' | 'teams' | 'works' | 'platform' | 'demand' | 'rec' | 'traduora';

/** As Ever Platform's catalog (`GET /v1/products`): `soon` is listed with its chip, even without a link. */
export type EverAppStatus = 'available' | 'beta' | 'soon';

export interface EverApp {
	id: EverAppId;
	/** The product's name, the same in every language and in every Ever app's launcher. */
	name: string;
	logo: string;
	/** Empty for this app, and for an app that is coming soon, when the deployment gives it no link. */
	url: string;
	domain: string;
	status: EverAppStatus;
}

type EverAppEntry = Omit<EverApp, 'url' | 'domain'>;

const CURRENT_EVER_APP_ID: EverAppId = 'teams';

// The order and names of the shared shell (Part A3 of the one-shell spec): Ever Platform, Ever Works, Ever Teams,
// Ever Gauzy, Ever Rec, Ever Traduora, then Ever Demand, coming soon. Every Ever app lists them alike (Platform from
// its catalog, Works from platforms.json, Gauzy from ever-apps.constants.ts): keep them in step. No link lives
// here: each one comes from the deployment (NEXT_PUBLIC_EVER_APP_LINKS), so this bundle names no Ever host (the
// egress audit's static scan) and a self-hosted or rebranded deployment never sends its users to Ever's hosted apps.
const EVER_APP_ENTRIES: ReadonlyArray<EverAppEntry> = [
	{ id: 'platform', name: 'Ever Platform', logo: '/assets/ever-apps/platform.svg', status: 'available' },
	{ id: 'works', name: 'Ever Works', logo: '/assets/ever-apps/works.svg', status: 'available' },
	{ id: 'teams', name: 'Ever Teams', logo: '/assets/ever-apps/teams.svg', status: 'available' },
	{ id: 'gauzy', name: 'Ever Gauzy', logo: '/assets/ever-apps/gauzy.svg', status: 'available' },
	{ id: 'rec', name: 'Ever Rec', logo: '/assets/ever-apps/rec.svg', status: 'available' },
	{ id: 'traduora', name: 'Ever Traduora', logo: '/assets/ever-apps/traduora.png', status: 'available' },
	{ id: 'demand', name: 'Ever Demand', logo: '/assets/ever-apps/demand.svg', status: 'soon' }
];

function parseHttpUrl(value: string): URL | null {
	try {
		const url = new URL(value);
		const isHttp = url.protocol === 'https:' || url.protocol === 'http:';
		if (isHttp) {
			return url;
		}
		return null;
	} catch {
		return null;
	}
}

/**
 * NEXT_PUBLIC_EVER_APP_LINKS: `id=url` pairs separated by commas, for example
 * `gauzy=https://gauzy.example.com,works=https://works.example.com`. Unknown ids, entries without `=` and links that
 * are not http(s) are ignored.
 */
function parseEverAppLinks(raw: string | undefined): Map<string, URL> {
	const links = new Map<string, URL>();
	for (const entry of (raw ?? '').split(',')) {
		const separator = entry.indexOf('=');
		if (separator <= 0) {
			continue;
		}
		const id = entry.slice(0, separator).trim();
		const url = parseHttpUrl(entry.slice(separator + 1).trim());
		if (url) {
			links.set(id, url);
		}
	}
	return links;
}

const EVER_APP_LINKS = parseEverAppLinks(
	readRuntimeEnv('NEXT_PUBLIC_EVER_APP_LINKS') || process.env.NEXT_PUBLIC_EVER_APP_LINKS
);

function withLink(entry: EverAppEntry): EverApp | null {
	const link = EVER_APP_LINKS.get(entry.id);
	if (link) {
		return { ...entry, url: link.href, domain: link.host };
	}
	const isCurrent = entry.id === CURRENT_EVER_APP_ID;
	const isComingSoon = entry.status === 'soon';
	if (isCurrent || isComingSoon) {
		return { ...entry, url: '', domain: '' };
	}
	return null;
}

const LISTED_EVER_APPS = EVER_APP_ENTRIES.map(withLink).filter((app): app is EverApp => app !== null);

/** The launcher, its rail and its settings show only when the deployment links at least one other app. */
export const HAS_EVER_APP_SWITCHER = LISTED_EVER_APPS.some((app) => app.id !== CURRENT_EVER_APP_ID && app.url !== '');

export const EVER_APPS: ReadonlyArray<EverApp> = HAS_EVER_APP_SWITCHER ? LISTED_EVER_APPS : [];

export function isCurrentEverApp(app: EverApp) {
	return app.id === CURRENT_EVER_APP_ID;
}
