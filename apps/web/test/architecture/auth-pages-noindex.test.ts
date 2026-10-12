import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { metadata } from '@/app/[locale]/auth/layout';

/**
 * The auth screens (/:locale/auth/passcode, /:locale/auth/password, signup, ...) are app entry
 * points, not content. On 2026-09-27 Ahrefs found them served as INDEXABLE duplicates in all 13
 * locales on app., stage. and demo.ever.team (39 rows), with no robots meta at all.
 *
 * app/[locale]/auth/layout.tsx now declares robots { index: false, follow: true } once, and every
 * page in the group inherits it. These tests pin the ways that can silently regress: the layout
 * loses the directive, a page or nested layout under it overrides it, a raw robots/googlebot meta
 * tag rendered elsewhere contradicts it, or it spreads to routes that must stay indexable.
 */
const APP_DIR = resolve(__dirname, '../../app');
const AUTH_DIR = join(APP_DIR, '[locale]', 'auth');
const AUTH_LAYOUT = join(AUTH_DIR, 'layout.tsx');
const CORE_DIR = resolve(__dirname, '../../core');

function listSourceFiles(dir: string): string[] {
	return readdirSync(dir).flatMap((entry) => {
		const path = join(dir, entry);
		if (statSync(path).isDirectory()) return listSourceFiles(path);
		return /\.(t|j)sx?$/.test(entry) ? [path] : [];
	});
}

// A route segment can set robots through a static `metadata` export or `generateMetadata`.
// Anchored to the line start so a commented-out declaration (app/[locale]/layout.tsx has one) is not a hit.
const DECLARES_METADATA = /^\s*export\s+(const\s+metadata\b|(async\s+)?function\s+generateMetadata\b)/m;

describe('auth pages are noindex, follow', () => {
	it('declares robots noindex, follow on the auth layout', () => {
		expect(metadata.robots).toEqual({ index: false, follow: true });
	});

	it('sets no separate googleBot directive that could disagree with robots', () => {
		expect(metadata.robots).not.toHaveProperty('googleBot');
	});

	it('is not overridden by any page or nested layout under /[locale]/auth', () => {
		const auth = listSourceFiles(AUTH_DIR);
		// Control: the walk really reaches the auth pages.
		expect(auth.map((file) => relative(AUTH_DIR, file).replace(/\\/g, '/'))).toEqual(
			expect.arrayContaining(['passcode/page.tsx', 'password/page.tsx', 'layout.tsx'])
		);

		// Control: the pattern recognises the one declaration that is supposed to exist.
		expect(readFileSync(AUTH_LAYOUT, 'utf8')).toMatch(DECLARES_METADATA);

		const overriding = auth
			.filter((file) => file !== AUTH_LAYOUT)
			.filter((file) => DECLARES_METADATA.test(readFileSync(file, 'utf8')));
		expect(overriding).toEqual([]);
	});

	// A parent layout's metadata cannot override this one (the deepest segment wins), but a raw
	// <meta name="robots"> or <meta name="googlebot"> rendered by a layout or shared component would sit
	// next to the generated tag and could say "index". app/[locale]/layout-component.tsx renders <head> by hand.
	it('renders no raw robots or googlebot meta tag anywhere in the app or shared components', () => {
		const RAW_ROBOTS_META = /name=["'](robots|googlebot)["']/i;
		// Control: the pattern recognises both tag names.
		expect('<meta name="robots" content="index, follow" />').toMatch(RAW_ROBOTS_META);
		expect("<meta name='googlebot' content='index' />").toMatch(RAW_ROBOTS_META);

		const files = [...listSourceFiles(APP_DIR), ...listSourceFiles(CORE_DIR)];
		// Control: the walk reaches the layout that renders <head> by hand.
		expect(files).toContain(join(APP_DIR, '[locale]', 'layout-component.tsx'));

		expect(files.filter((file) => RAW_ROBOTS_META.test(readFileSync(file, 'utf8')))).toEqual([]);
	});

	it('does not spread robots or googleBot metadata to any route outside /[locale]/auth', () => {
		const files = listSourceFiles(APP_DIR);
		// Control: the pattern finds the one declaration that is supposed to exist.
		expect(files.filter((file) => /\b(robots|googleBot)\s*:/.test(readFileSync(file, 'utf8')))).toEqual([
			AUTH_LAYOUT
		]);
	});
});
