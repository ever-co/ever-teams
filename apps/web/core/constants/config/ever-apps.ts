// cspell:words traduora
import { readRuntimeEnv } from '@/env-config';

type EverAppId = 'gauzy' | 'teams' | 'works' | 'platform' | 'demand' | 'rec' | 'traduora';

export interface EverApp {
	id: EverAppId;
	shortName: string;
	logo: string;
	/** Empty for this app when the deployment gives it no link: its row is never a link. */
	url: string;
	domain: string;
}

type EverAppEntry = Omit<EverApp, 'url' | 'domain'>;

const CURRENT_EVER_APP_ID: EverAppId = 'teams';

// Same order and logos as the Gauzy app switcher (ever-gauzy
// packages/ui-core/common/src/lib/constants/ever-apps.constants.ts): keep both lists in sync. Works ships the Teams
// tile and Demand the Platform tile today, so those pairs look alike. No link lives here: each one comes from the
// deployment (NEXT_PUBLIC_EVER_APP_LINKS), so this bundle names no Ever host (the egress audit's static scan) and a
// self-hosted or rebranded deployment never sends its users to Ever's hosted apps.
const EVER_APP_ENTRIES: ReadonlyArray<EverAppEntry> = [
	{ id: 'platform', shortName: 'Platform', logo: '/assets/ever-apps/platform.svg' },
	{ id: 'works', shortName: 'Works', logo: '/assets/ever-apps/works.svg' },
	{ id: 'teams', shortName: 'Teams', logo: '/assets/ever-apps/teams.svg' },
	{ id: 'gauzy', shortName: 'Gauzy', logo: '/assets/ever-apps/gauzy.svg' },
	{ id: 'demand', shortName: 'Demand', logo: '/assets/ever-apps/demand.svg' },
	{ id: 'rec', shortName: 'Rec', logo: '/assets/ever-apps/rec.svg' },
	{ id: 'traduora', shortName: 'Traduora', logo: '/assets/ever-apps/traduora.png' }
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
	if (entry.id === CURRENT_EVER_APP_ID) {
		return { ...entry, url: '', domain: '' };
	}
	return null;
}

const LINKED_EVER_APPS = EVER_APP_ENTRIES.map(withLink).filter((app): app is EverApp => app !== null);

/** The switcher, its rail and its setting show only when the deployment links at least one other app. */
export const HAS_EVER_APP_SWITCHER = LINKED_EVER_APPS.some((app) => app.id !== CURRENT_EVER_APP_ID);

export const EVER_APPS: ReadonlyArray<EverApp> = HAS_EVER_APP_SWITCHER ? LINKED_EVER_APPS : [];

export function isCurrentEverApp(app: EverApp) {
	return app.id === CURRENT_EVER_APP_ID;
}
