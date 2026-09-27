import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { metadata } from '@/app/[locale]/auth/layout';

/**
 * The auth screens (/:locale/auth/passcode, /:locale/auth/password, signup, ...) are app entry
 * points, not content. On 2026-09-27 Ahrefs found them served as INDEXABLE duplicates in all 13
 * locales on app., stage. and demo.ever.team (39 rows), with no robots meta at all.
 *
 * app/[locale]/auth/layout.tsx now declares robots { index: false, follow: true } once, and every
 * page in the group inherits it. These tests pin the three ways that can silently regress:
 * the layout loses the directive, a page or a parent layout overrides it, or it spreads to routes
 * that must stay indexable.
 */
const APP_DIR = resolve(__dirname, '../../app');
const AUTH_DIR = join(APP_DIR, '[locale]', 'auth');
const AUTH_LAYOUT = join(AUTH_DIR, 'layout.tsx');

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

	it('is not overridden by a parent layout', () => {
		for (const parent of [join(APP_DIR, 'layout.tsx'), join(APP_DIR, '[locale]', 'layout.tsx')]) {
			const source = readFileSync(parent, 'utf8');
			expect(source).not.toMatch(DECLARES_METADATA);
			expect(source).not.toMatch(/name=["']robots["']|name=["']googlebot["']/i);
		}
	});

	it('does not spread robots metadata to any route outside /[locale]/auth', () => {
		const files = listSourceFiles(APP_DIR);
		// Control: the pattern finds the one declaration that is supposed to exist.
		expect(files.filter((file) => /\brobots\s*:/.test(readFileSync(file, 'utf8')))).toEqual([AUTH_LAYOUT]);
	});
});
