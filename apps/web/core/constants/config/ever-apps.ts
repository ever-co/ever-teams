// cspell:words traduora
import { readRuntimeEnv } from '@/env-config';

type EverAppId = 'gauzy' | 'teams' | 'works' | 'platform' | 'demand' | 'rec' | 'traduora' | 'tech';

/** As Ever Platform's catalog (`GET /v1/products`): `soon` is listed with its chip, even without a link. */
export type EverAppStatus = 'available' | 'beta' | 'soon';

export interface EverApp {
	id: EverAppId;
	/** The product's name, the same in every language and in every Ever app's launcher. */
	name: string;
	/** The message key of the one line under the name: what the app does, in the reader's language. */
	lineKey: string;
	logo: string;
	/** Empty for this app, and for an app that is coming soon, when the deployment gives it no link. */
	url: string;
	domain: string;
	status: EverAppStatus;
}

type EverAppEntry = Omit<EverApp, 'url' | 'domain'>;

const CURRENT_EVER_APP_ID: EverAppId = 'teams';

// Same list, order and lines in every Ever app and site (homelab docs/brand/EVER-SITES-UNIFIED-CHROME.md §4 and
// §4b). Keep the copies in sync. Inside the apps the order is the shared shell's (Part A3 of the one-shell spec):
// Ever Platform, Ever Works, Ever Teams, Ever Gauzy, Ever Rec, Ever Traduora, Ever Demand, then Ever Tech (Platform
// from its catalog, Works from platforms.json, Gauzy from its ever-connect plugin). No link lives here: each one
// comes from the deployment (NEXT_PUBLIC_EVER_APP_LINKS), so this bundle names no Ever host (the egress audit's
// static scan) and a self-hosted or rebranded deployment never sends its users to Ever's hosted apps.
const EVER_APP_ENTRIES: ReadonlyArray<EverAppEntry> = [
	{
		id: 'platform',
		name: 'Ever Platform',
		lineKey: 'switchers.APP_LINE_PLATFORM',
		logo: '/assets/ever-apps/platform.svg',
		status: 'available'
	},
	{
		id: 'works',
		name: 'Ever Works',
		lineKey: 'switchers.APP_LINE_WORKS',
		logo: '/assets/ever-apps/works.svg',
		status: 'available'
	},
	{
		id: 'teams',
		name: 'Ever Teams',
		lineKey: 'switchers.APP_LINE_TEAMS',
		logo: '/assets/ever-apps/teams.svg',
		status: 'available'
	},
	{
		id: 'gauzy',
		name: 'Ever Gauzy',
		lineKey: 'switchers.APP_LINE_GAUZY',
		logo: '/assets/ever-apps/gauzy.svg',
		status: 'available'
	},
	{
		id: 'rec',
		name: 'Ever Rec',
		lineKey: 'switchers.APP_LINE_REC',
		logo: '/assets/ever-apps/rec.svg',
		status: 'available'
	},
	{
		id: 'traduora',
		name: 'Ever Traduora',
		lineKey: 'switchers.APP_LINE_TRADUORA',
		logo: '/assets/ever-apps/traduora.png',
		status: 'available'
	},
	// Coming soon: listed with its chip while the deployment gives it no link, a plain row once it does.
	{
		id: 'demand',
		name: 'Ever Demand',
		lineKey: 'switchers.APP_LINE_DEMAND',
		logo: '/assets/ever-apps/demand.svg',
		status: 'soon'
	},
	{
		id: 'tech',
		name: 'Ever Tech',
		lineKey: 'switchers.APP_LINE_TECH',
		logo: '/assets/ever-apps/tech.svg',
		status: 'available'
	}
];

/** Where "+ Add" leads in Ever Platform: the page that adds an app, for whichever organization the person picks. */
const PLATFORM_ADD_APP_PATH = '/apps?add=app';

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
	const isComingSoon = entry.status === 'soon';
	if (link) {
		// A link means the app is there: "Soon" is only for an app the deployment cannot link yet.
		let status = entry.status;
		if (isComingSoon) {
			status = 'available';
		}
		return { ...entry, status, url: link.href, domain: link.host };
	}
	const isCurrent = entry.id === CURRENT_EVER_APP_ID;
	if (isCurrent || isComingSoon) {
		return { ...entry, url: '', domain: '' };
	}
	return null;
}

const LISTED_EVER_APPS = EVER_APP_ENTRIES.map(withLink).filter((app): app is EverApp => app !== null);

/** The launcher, its rail and its settings show only when the deployment links at least one other app. */
export const HAS_EVER_APP_SWITCHER = LISTED_EVER_APPS.some((app) => app.id !== CURRENT_EVER_APP_ID && app.url !== '');

export const EVER_APPS: ReadonlyArray<EverApp> = HAS_EVER_APP_SWITCHER ? LISTED_EVER_APPS : [];

function addAppUrlOf(platformLink: URL | undefined) {
	if (!HAS_EVER_APP_SWITCHER || !platformLink) {
		return '';
	}
	return new URL(PLATFORM_ADD_APP_PATH, platformLink).href;
}

/**
 * The "+ Add" row: Ever Platform's page that adds an app of your own, in the Platform this deployment links. Empty
 * (no row) without a Platform link, so a self-hosted deployment shows nothing Ever-specific.
 */
export const EVER_APP_ADD_URL = addAppUrlOf(EVER_APP_LINKS.get('platform'));

export function isCurrentEverApp(app: EverApp) {
	return app.id === CURRENT_EVER_APP_ID;
}
