import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { APIService } from '../api.service';

/**
 * The product key of Ever Teams' entries in the Gauzy changelog. One changelog table feeds the "What's new" of
 * several products (api.ever.team shares its database with api.gauzy.co), and each entry names its product.
 */
export const EVER_TEAMS_CHANGELOG_PLATFORM = 'ever-teams';

/** The most entries the panel lists (the API caps a listing at 20 too). */
export const CHANGELOG_MAX_ENTRIES = 20;

/** One "What's new" entry, as the panel shows it. */
export interface ChangelogEntry {
	id: string;
	/** An Eva icon name (`message-circle-outline`), mapped to this app's icons by the panel. */
	icon: string;
	title: string;
	/** ISO date of the update. */
	date: string;
	content: string;
	/** A full http(s) address, or null. */
	learnMoreUrl: string | null;
}

interface ChangelogListResponse {
	items?: unknown;
}

const isText = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

const toHttpUrl = (value: unknown): string | null => {
	if (!isText(value)) {
		return null;
	}
	try {
		const url = new URL(value.trim());
		return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
	} catch {
		return null;
	}
};

/**
 * Ever Teams' "What's new" entries out of a changelog listing, newest first.
 *
 * Only entries that NAME this product are kept. A Gauzy API from before products existed ignores the `platform`
 * query and returns Gauzy's own entries, which carry no product: those must never show here. Sign-up feature
 * cards (`isFeature`), entries without a title, text or valid date are dropped, and a "learn more" link is kept
 * only when it is a full http(s) address.
 */
export function toChangelogEntries(items: unknown, platform: string = EVER_TEAMS_CHANGELOG_PLATFORM): ChangelogEntry[] {
	if (!Array.isArray(items)) {
		return [];
	}
	const entries: ChangelogEntry[] = [];
	for (const item of items as Array<Record<string, unknown> | null>) {
		if (!item || item.platform !== platform || item.isFeature === true) {
			continue;
		}
		const { id, icon, title, date, content, learnMoreUrl } = item;
		const time = typeof date === 'string' || date instanceof Date ? new Date(date).getTime() : Number.NaN;
		if (!isText(id) || !isText(title) || !isText(content) || Number.isNaN(time)) {
			continue;
		}
		entries.push({
			id,
			icon: isText(icon) ? icon.trim() : '',
			title: title.trim(),
			date: new Date(time).toISOString(),
			content: content.trim(),
			learnMoreUrl: toHttpUrl(learnMoreUrl)
		});
	}
	return entries.sort((a, b) => b.date.localeCompare(a.date)).slice(0, CHANGELOG_MAX_ENTRIES);
}

class ChangelogService extends APIService {
	/** The product's "What's new" entries, from the public changelog listing of the Gauzy API (no sign-in needed). */
	getEntries = async (platform: string = EVER_TEAMS_CHANGELOG_PLATFORM): Promise<ChangelogEntry[]> => {
		const response = await this.get<ChangelogListResponse>('/changelog', {
			params: { platform, isFeature: false }
		});
		return toChangelogEntries(response.data?.items, platform);
	};
}

export const changelogService = new ChangelogService(GAUZY_API_BASE_SERVER_URL.value, { timeout: 8_000 });
