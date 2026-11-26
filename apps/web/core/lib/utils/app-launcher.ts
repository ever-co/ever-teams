import type { DottedLanguageObjectStringPaths } from 'next-intl';
import { isCurrentEverApp, type EverApp, type EverAppStatus } from '@/core/constants/config/ever-apps';

/** As in Ever Works and Ever Platform: six pins at most, so the Pinned section stays a short list. */
export const APP_LAUNCHER_PIN_LIMIT = 6;

/** Apps a person adds by hand: enough for the tools a team lives in, short enough to stay a menu. */
export const APP_LAUNCHER_CUSTOM_LIMIT = 20;

const NAME_MAX_LENGTH = 60;

export type LauncherSectionId = 'pinned' | 'ever' | 'yours';

/** An app the person added: a name and an http(s) address, kept in this browser only. */
export interface CustomLauncherApp {
	id: string;
	name: string;
	url: string;
}

/**
 * What the person chose in Manage apps, per browser (Teams has no server-side store for personal preferences).
 * Keys are `ever:<id>` and `custom:<id>`. `pinned` is in pin order; `order` holds each section's sequence.
 */
export interface AppLauncherPreferences {
	hidden: string[];
	pinned: string[];
	order: { ever: string[]; yours: string[] };
	custom: CustomLauncherApp[];
}

export const DEFAULT_APP_LAUNCHER_PREFERENCES: AppLauncherPreferences = {
	hidden: [],
	pinned: [],
	order: { ever: [], yours: [] },
	custom: []
};

export interface LauncherItem {
	key: string;
	/** Where the item lives when it is not pinned. */
	home: Exclude<LauncherSectionId, 'pinned'>;
	name: string;
	/** The message key of the line under an Ever app's name; null for an app the person added. */
	lineKey: DottedLanguageObjectStringPaths | null;
	/** Empty when the row is not a link: the app you are in, or one coming soon without a link. */
	url: string;
	domain: string;
	logo: string | null;
	status: EverAppStatus;
	isCurrent: boolean;
	isShown: boolean;
	isPinned: boolean;
}

export interface LauncherSection {
	id: LauncherSectionId;
	items: LauncherItem[];
}

function stringsOf(value: unknown): string[] {
	if (!Array.isArray(value)) {
		return [];
	}
	return [...new Set(value.filter((entry): entry is string => typeof entry === 'string'))];
}

function recordOf(value: unknown): Record<string, unknown> {
	if (value && typeof value === 'object' && !Array.isArray(value)) {
		return value as Record<string, unknown>;
	}
	return {};
}

/** An http(s) address, or null: anything else (javascript:, data:, a bare word) is refused. */
export function parseLauncherUrl(value: string): URL | null {
	try {
		const url = new URL(value.trim());
		const isHttp = url.protocol === 'https:' || url.protocol === 'http:';
		if (isHttp) {
			return url;
		}
		return null;
	} catch {
		return null;
	}
}

function customAppsOf(value: unknown): CustomLauncherApp[] {
	if (!Array.isArray(value)) {
		return [];
	}
	const apps: CustomLauncherApp[] = [];
	const ids = new Set<string>();
	for (const entry of value) {
		const record = recordOf(entry);
		const { id, name, url } = record;
		const isComplete = typeof id === 'string' && typeof name === 'string' && typeof url === 'string';
		if (!isComplete || ids.has(id) || name.trim() === '' || !parseLauncherUrl(url)) {
			continue;
		}
		ids.add(id);
		apps.push({ id, name: name.trim().slice(0, NAME_MAX_LENGTH), url });
	}
	return apps.slice(0, APP_LAUNCHER_CUSTOM_LIMIT);
}

/** What localStorage holds may be old, hand-edited or from another version: keep only what reads right. */
export function normalizeAppLauncherPreferences(value: unknown): AppLauncherPreferences {
	const record = recordOf(value);
	const order = recordOf(record.order);
	return {
		hidden: stringsOf(record.hidden),
		pinned: stringsOf(record.pinned).slice(0, APP_LAUNCHER_PIN_LIMIT),
		order: { ever: stringsOf(order.ever), yours: stringsOf(order.yours) },
		custom: customAppsOf(record.custom)
	};
}

/**
 * The stored choices, read against what this deployment lists now: a pin of an app whose link was taken away (or of
 * an app of your own that is gone) is dropped, so it never uses up one of the six with no row left to unpin it.
 */
export function reconcileAppLauncherPreferences(
	everApps: ReadonlyArray<EverApp>,
	preferences: AppLauncherPreferences
): AppLauncherPreferences {
	const known = new Set([...everApps.map(everAppKey), ...preferences.custom.map(customAppKey)]);
	const pinned = preferences.pinned.filter((key) => known.has(key));
	if (pinned.length === preferences.pinned.length) {
		return preferences;
	}
	return { ...preferences, pinned };
}

export function everAppKey(app: Pick<EverApp, 'id'>) {
	return `ever:${app.id}`;
}

function customAppKey(app: Pick<CustomLauncherApp, 'id'>) {
	return `custom:${app.id}`;
}

/** Sort by the person's sequence; what it does not name yet keeps its default place after the named ones. */
function inSequence<T extends { key: string }>(items: T[], sequence: string[]): T[] {
	const rank = new Map(sequence.map((key, index) => [key, index]));
	const named = items.filter((item) => rank.has(item.key));
	const unnamed = items.filter((item) => !rank.has(item.key));
	named.sort((first, second) => (rank.get(first.key) ?? 0) - (rank.get(second.key) ?? 0));
	return [...named, ...unnamed];
}

/** Every app the launcher knows, hidden ones included, each in its section and in the person's order. */
export function launcherItems(everApps: ReadonlyArray<EverApp>, preferences: AppLauncherPreferences) {
	const hidden = new Set(preferences.hidden);
	const pinned = new Set(preferences.pinned);

	const ever = everApps.map((app): LauncherItem => {
		const key = everAppKey(app);
		const isCurrent = isCurrentEverApp(app);
		return {
			key,
			home: 'ever',
			name: app.name,
			lineKey: app.lineKey,
			url: app.url,
			domain: app.domain,
			logo: app.logo,
			status: app.status,
			isCurrent,
			// The app you are in always shows: hiding it would leave no "You're here".
			isShown: isCurrent || !hidden.has(key),
			isPinned: pinned.has(key)
		};
	});

	const yours = preferences.custom.map((app): LauncherItem => {
		const key = customAppKey(app);
		const url = parseLauncherUrl(app.url);
		return {
			key,
			home: 'yours',
			name: app.name,
			lineKey: null,
			url: url?.href ?? '',
			domain: url?.host ?? '',
			logo: null,
			status: 'available',
			isCurrent: false,
			isShown: !hidden.has(key),
			isPinned: pinned.has(key)
		};
	});

	return {
		ever: inSequence(ever, preferences.order.ever),
		yours: inSequence(yours, preferences.order.yours)
	};
}

/**
 * The sections of the editor: Pinned (in pin order), Ever apps, Your apps. A pinned app leaves its own section,
 * as in the panel. Hidden apps stay, so they can be shown again. A section without rows is left out.
 */
export function manageSections(everApps: ReadonlyArray<EverApp>, preferences: AppLauncherPreferences) {
	const { ever, yours } = launcherItems(everApps, preferences);
	const all = [...ever, ...yours];
	const byKey = new Map(all.map((item) => [item.key, item]));
	const pinned = preferences.pinned
		.map((key) => byKey.get(key))
		.filter((item): item is LauncherItem => item?.isPinned === true);
	const sections: LauncherSection[] = [
		{ id: 'pinned', items: pinned },
		{ id: 'ever', items: ever.filter((item) => !item.isPinned) },
		{ id: 'yours', items: yours.filter((item) => !item.isPinned) }
	];
	return sections.filter((section) => section.items.length > 0);
}

/** The sections of the panel: the editor's, with hidden apps left out. */
export function panelSections(everApps: ReadonlyArray<EverApp>, preferences: AppLauncherPreferences) {
	return manageSections(everApps, preferences)
		.map((section) => ({ ...section, items: section.items.filter((item) => item.isShown) }))
		.filter((section) => section.items.length > 0);
}

/** The rail: one tile per shown app, pinned first, in the panel's order. */
export function railItems(everApps: ReadonlyArray<EverApp>, preferences: AppLauncherPreferences) {
	return panelSections(everApps, preferences).flatMap((section) => section.items);
}

function without(list: string[], key: string) {
	return list.filter((entry) => entry !== key);
}

/** Hiding an app also unpins it: a pin that never shows would only use up one of the six. */
export function withShown(preferences: AppLauncherPreferences, key: string, isShown: boolean): AppLauncherPreferences {
	if (isShown) {
		return { ...preferences, hidden: without(preferences.hidden, key) };
	}
	return {
		...preferences,
		hidden: [...without(preferences.hidden, key), key],
		pinned: without(preferences.pinned, key)
	};
}

/** Pinning adds at the end of Pinned and shows the app; a seventh pin is refused (returns the same object). */
export function withPinned(
	preferences: AppLauncherPreferences,
	key: string,
	isPinned: boolean
): AppLauncherPreferences {
	if (!isPinned) {
		return { ...preferences, pinned: without(preferences.pinned, key) };
	}
	const isAlreadyPinned = preferences.pinned.includes(key);
	const isFull = preferences.pinned.length >= APP_LAUNCHER_PIN_LIMIT;
	if (isAlreadyPinned || isFull) {
		return preferences;
	}
	return {
		...preferences,
		hidden: without(preferences.hidden, key),
		pinned: [...preferences.pinned, key]
	};
}

/** The sequence `keys` takes when the key at `from` moves to `to` (both clamped into range). */
export function moveKey(keys: ReadonlyArray<string>, from: number, to: number): string[] {
	const next = [...keys];
	if (next.length === 0) {
		return next;
	}
	// Clamp against the full length: after the splice below the list is one shorter.
	const lastIndex = next.length - 1;
	const clamp = (value: number) => Math.min(Math.max(value, 0), lastIndex);
	const source = clamp(from);
	const target = clamp(to);
	const [moved] = next.splice(source, 1);
	next.splice(target, 0, moved);
	return next;
}

/**
 * Move one row inside its section of the editor. The whole section's sequence is written, so the arrangement holds
 * after a reload even for rows that were never moved themselves.
 */
export function withMoved(
	preferences: AppLauncherPreferences,
	section: LauncherSection,
	key: string,
	to: number
): AppLauncherPreferences {
	const keys = section.items.map((item) => item.key);
	const from = keys.indexOf(key);
	if (from < 0) {
		return preferences;
	}
	const sequence = moveKey(keys, from, to);
	if (section.id === 'pinned') {
		return { ...preferences, pinned: sequence };
	}
	const pinnedOfSection = preferences.order[section.id].filter((entry) => preferences.pinned.includes(entry));
	return {
		...preferences,
		order: { ...preferences.order, [section.id]: [...sequence, ...pinnedOfSection] }
	};
}

export type AddCustomAppResult =
	| { ok: true; preferences: AppLauncherPreferences }
	| { ok: false; reason: 'name' | 'url' | 'limit' };

/** Add an app of the person's own at the end of Your apps. */
export function withCustomApp(
	preferences: AppLauncherPreferences,
	input: { name: string; url: string },
	id: string
): AddCustomAppResult {
	const name = input.name.trim().slice(0, NAME_MAX_LENGTH);
	if (name === '') {
		return { ok: false, reason: 'name' };
	}
	const url = parseLauncherUrl(input.url);
	if (!url) {
		return { ok: false, reason: 'url' };
	}
	if (preferences.custom.length >= APP_LAUNCHER_CUSTOM_LIMIT) {
		return { ok: false, reason: 'limit' };
	}
	return {
		ok: true,
		preferences: { ...preferences, custom: [...preferences.custom, { id, name, url: url.href }] }
	};
}

/** Remove an app of the person's own, with every choice made about it. */
export function withoutCustomApp(preferences: AppLauncherPreferences, key: string): AppLauncherPreferences {
	return {
		hidden: without(preferences.hidden, key),
		pinned: without(preferences.pinned, key),
		order: { ...preferences.order, yours: without(preferences.order.yours, key) },
		custom: preferences.custom.filter((app) => customAppKey(app) !== key)
	};
}

/** One or two letters for an app without a logo: "Linear" → "L", "Grafana Cloud" → "GC". */
export function initialsOf(name: string) {
	const words = name.trim().split(/\s+/).filter(Boolean);
	const letters = words.slice(0, 2).map((word) => Array.from(word)[0] ?? '');
	return letters.join('').toUpperCase();
}
