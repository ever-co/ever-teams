import type { EverApp } from '@/core/constants/config/ever-apps';
import {
	APP_LAUNCHER_CUSTOM_LIMIT,
	APP_LAUNCHER_PIN_LIMIT,
	DEFAULT_APP_LAUNCHER_PREFERENCES,
	initialsOf,
	manageSections,
	moveKey,
	normalizeAppLauncherPreferences,
	panelSections,
	railItems,
	reconcileAppLauncherPreferences,
	withCustomApp,
	withMoved,
	withoutCustomApp,
	withPinned,
	withShown,
	type AppLauncherPreferences
} from './app-launcher';

function app(id: EverApp['id'], name: string, status: EverApp['status'] = 'available'): EverApp {
	const isLinked = id !== 'teams' && status !== 'soon';
	return {
		id,
		name,
		lineKey: `switchers.APP_LINE_${id.toUpperCase()}`,
		logo: `/assets/ever-apps/${id}.svg`,
		url: isLinked ? `https://${id}.example.com/` : '',
		domain: isLinked ? `${id}.example.com` : '',
		status
	};
}

const APPS: EverApp[] = [
	app('platform', 'Ever Platform'),
	app('works', 'Ever Works'),
	app('teams', 'Ever Teams'),
	app('gauzy', 'Ever Gauzy'),
	app('demand', 'Ever Demand', 'soon')
];

const DEFAULTS = DEFAULT_APP_LAUNCHER_PREFERENCES;

function keysBySection(sections: ReturnType<typeof panelSections>) {
	return Object.fromEntries(sections.map((section) => [section.id, section.items.map((item) => item.key)]));
}

function withYourApp(preferences: AppLauncherPreferences, name: string, url: string, id: string) {
	const result = withCustomApp(preferences, { name, url }, id);
	if (!result.ok) {
		throw new Error(`refused: ${result.reason}`);
	}
	return result.preferences;
}

describe('the App Launcher sections', () => {
	it('shows only Ever apps until something is pinned or added', () => {
		expect(keysBySection(panelSections(APPS, DEFAULTS))).toEqual({
			ever: ['ever:platform', 'ever:works', 'ever:teams', 'ever:gauzy', 'ever:demand']
		});
	});

	it("moves a pinned app into Pinned, in pin order, and lists the person's own apps under Your apps", () => {
		let preferences = withPinned(DEFAULTS, 'ever:gauzy', true);
		preferences = withPinned(preferences, 'ever:works', true);
		preferences = withYourApp(preferences, 'Grafana', 'https://grafana.example.com', 'grafana');

		expect(keysBySection(panelSections(APPS, preferences))).toEqual({
			pinned: ['ever:gauzy', 'ever:works'],
			ever: ['ever:platform', 'ever:teams', 'ever:demand'],
			yours: ['custom:grafana']
		});
	});

	it("gives an Ever app's row its line and an app of the person's own none", () => {
		const preferences = withYourApp(DEFAULTS, 'Grafana', 'https://grafana.example.com', 'grafana');
		const rows = panelSections(APPS, preferences).flatMap((section) => section.items);

		expect(rows.find((row) => row.key === 'ever:works')?.lineKey).toBe('switchers.APP_LINE_WORKS');
		expect(rows.find((row) => row.key === 'custom:grafana')?.lineKey).toBeNull();
	});

	it('leaves hidden apps out of the panel and the rail but keeps them in the editor', () => {
		const preferences = withShown(DEFAULTS, 'ever:platform', false);

		expect(panelSections(APPS, preferences)[0].items.map((item) => item.key)).not.toContain('ever:platform');
		expect(railItems(APPS, preferences).map((item) => item.key)).not.toContain('ever:platform');
		const editorRow = manageSections(APPS, preferences)[0].items.find((item) => item.key === 'ever:platform');
		expect(editorRow?.isShown).toBe(false);
	});

	it('never hides the app you are in', () => {
		const preferences = withShown(DEFAULTS, 'ever:teams', false);

		const teams = panelSections(APPS, preferences)[0].items.find((item) => item.key === 'ever:teams');
		expect(teams?.isCurrent).toBe(true);
		expect(teams?.isShown).toBe(true);
	});

	it('puts pinned apps first on the rail', () => {
		const preferences = withPinned(DEFAULTS, 'ever:gauzy', true);

		expect(railItems(APPS, preferences)[0].key).toBe('ever:gauzy');
	});
});

describe('the Manage apps edits', () => {
	it('refuses a seventh pin', () => {
		const keys = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => `custom:${id}`);
		let preferences = DEFAULTS;
		for (const key of keys) {
			preferences = withPinned(preferences, key, true);
		}
		expect(preferences.pinned).toHaveLength(APP_LAUNCHER_PIN_LIMIT);

		expect(withPinned(preferences, 'ever:works', true)).toBe(preferences);
	});

	it('unpins an app it hides, and shows an app it pins', () => {
		const pinned = withPinned(DEFAULTS, 'ever:works', true);
		const hidden = withShown(pinned, 'ever:works', false);
		expect(hidden.pinned).toEqual([]);
		expect(hidden.hidden).toEqual(['ever:works']);

		expect(withPinned(hidden, 'ever:works', true).hidden).toEqual([]);
	});

	it("writes the whole section's order when one row moves, so it holds after a reload", () => {
		const [ever] = manageSections(APPS, DEFAULTS);
		const moved = withMoved(DEFAULTS, ever, 'ever:gauzy', 0);

		expect(moved.order.ever).toEqual(['ever:gauzy', 'ever:platform', 'ever:works', 'ever:teams', 'ever:demand']);
		expect(panelSections(APPS, moved)[0].items[0].key).toBe('ever:gauzy');
	});

	it('reorders Pinned through the pin sequence', () => {
		let preferences = withPinned(DEFAULTS, 'ever:works', true);
		preferences = withPinned(preferences, 'ever:gauzy', true);
		const pinned = manageSections(APPS, preferences)[0];

		expect(withMoved(preferences, pinned, 'ever:gauzy', 0).pinned).toEqual(['ever:gauzy', 'ever:works']);
	});

	it('clamps a move past either end', () => {
		expect(moveKey(['a', 'b', 'c'], 0, -1)).toEqual(['a', 'b', 'c']);
		expect(moveKey(['a', 'b', 'c'], 2, 9)).toEqual(['a', 'b', 'c']);
		expect(moveKey(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b']);
	});

	it('adds an app of your own only with a name and an http(s) address', () => {
		expect(withCustomApp(DEFAULTS, { name: ' ', url: 'https://a.example.com' }, 'x')).toEqual({
			ok: false,
			reason: 'name'
		});
		expect(withCustomApp(DEFAULTS, { name: 'A', url: 'javascript:alert(1)' }, 'x')).toEqual({
			ok: false,
			reason: 'url'
		});
		expect(withCustomApp(DEFAULTS, { name: 'A', url: 'a.example.com' }, 'x')).toEqual({ ok: false, reason: 'url' });

		const added = withYourApp(DEFAULTS, '  Linear ', 'https://linear.app/acme', 'linear');
		expect(added.custom).toEqual([{ id: 'linear', name: 'Linear', url: 'https://linear.app/acme' }]);
	});

	it(`stops at ${APP_LAUNCHER_CUSTOM_LIMIT} apps of your own`, () => {
		let preferences = DEFAULTS;
		for (let index = 0; index < APP_LAUNCHER_CUSTOM_LIMIT; index += 1) {
			preferences = withYourApp(preferences, `App ${index}`, `https://app${index}.example.com`, `app-${index}`);
		}

		expect(withCustomApp(preferences, { name: 'One more', url: 'https://more.example.com' }, 'more')).toEqual({
			ok: false,
			reason: 'limit'
		});
	});

	it('forgets every choice about an app of your own when it is removed', () => {
		let preferences = withYourApp(DEFAULTS, 'Linear', 'https://linear.app', 'linear');
		preferences = withPinned(preferences, 'custom:linear', true);

		expect(withoutCustomApp(preferences, 'custom:linear')).toEqual(DEFAULTS);
	});
});

describe('pins of apps that are gone', () => {
	it('drops them, so they never use up one of the six', () => {
		const stored = { ...DEFAULTS, pinned: ['ever:rec', 'ever:works', 'custom:gone'] };

		expect(reconcileAppLauncherPreferences(APPS, stored).pinned).toEqual(['ever:works']);
	});

	it('returns the same value when nothing is stale', () => {
		const stored = { ...DEFAULTS, pinned: ['ever:works'] };

		expect(reconcileAppLauncherPreferences(APPS, stored)).toBe(stored);
	});
});

describe('what the browser holds', () => {
	it('reads a missing, broken or foreign value as the defaults', () => {
		expect(normalizeAppLauncherPreferences(undefined)).toEqual(DEFAULTS);
		expect(normalizeAppLauncherPreferences('pinned')).toEqual(DEFAULTS);
		expect(normalizeAppLauncherPreferences({ hidden: 'all', order: [] })).toEqual(DEFAULTS);
	});

	it('keeps what reads right and drops the rest', () => {
		const stored = {
			hidden: ['ever:works', 4, 'ever:works'],
			pinned: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
			order: { ever: ['ever:gauzy'], yours: 'x' },
			custom: [
				{ id: 'ok', name: 'Docs', url: 'https://docs.example.com' },
				{ id: 'bad', name: 'Bad', url: 'javascript:alert(1)' },
				{ id: 'ok', name: 'Twice', url: 'https://twice.example.com' }
			]
		};

		expect(normalizeAppLauncherPreferences(stored)).toEqual({
			hidden: ['ever:works'],
			pinned: ['a', 'b', 'c', 'd', 'e', 'f'],
			order: { ever: ['ever:gauzy'], yours: [] },
			custom: [{ id: 'ok', name: 'Docs', url: 'https://docs.example.com' }]
		});
	});
});

describe('initialsOf', () => {
	it('takes the first letter of the first two words', () => {
		expect(initialsOf('Linear')).toBe('L');
		expect(initialsOf('grafana cloud dashboards')).toBe('GC');
	});
});
