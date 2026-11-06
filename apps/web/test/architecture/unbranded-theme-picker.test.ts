/**
 * Architecture guard: the theme picker carries no brand.
 *
 * The user menu used to offer "Gauzy Light 2D" / "Gauzy Dark 2D" beside two PNG screenshots of the
 * hosted product, wordmark included (public/assets/themeImages/gauzy*.png). A published image
 * rebranded with `docker run -e APP_NAME=... -e APP_LOGO_URL=...` still showed Ever's brand there,
 * so the names are neutral translations now and the preview is a brand-free wireframe.
 *
 * i18n.ts loads only the requested locale (no English fallback), so a locale missing these keys
 * renders the key path to the user — hence the per-locale check.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const WEB_ROOT = resolve(__dirname, '../..');
const LOCALES_DIRECTORY = join(WEB_ROOT, 'locales');
const THEME_MESSAGES = ['THEME_LIGHT', 'THEME_DARK'] as const;
const BRAND = /gauzy|ever\s*teams/i;

type Messages = { common: Record<string, string> };

function sourceFiles(directory: string): string[] {
	return readdirSync(directory).flatMap((entry) => {
		const path = join(directory, entry);
		if (statSync(path).isDirectory()) return sourceFiles(path);
		return /\.tsx?$/.test(entry) ? [path] : [];
	});
}

describe('unbranded theme picker', () => {
	it.each(readdirSync(LOCALES_DIRECTORY).filter((file) => file.endsWith('.json')))(
		'names the themes without a brand in %s',
		(file) => {
			const messages = JSON.parse(readFileSync(join(LOCALES_DIRECTORY, file), 'utf8')) as Messages;

			for (const key of THEME_MESSAGES) {
				const value = messages.common?.[key];
				expect(typeof value).toBe('string');
				expect(value.trim()).not.toBe('');
				expect(value).not.toMatch(BRAND);
				// A plain label: nothing to interpolate, so no call site has to pass arguments.
				expect(value).not.toMatch(/\{[^}]*\}/);
			}
		}
	);

	it('renders the theme names from translations, never from a literal', () => {
		const read = (path: string) => readFileSync(join(WEB_ROOT, path), 'utf8');
		// The user menu picks the theme with ThemeSwitch (a light / dark segmented control), and the
		// Preferences settings with ThemeTiles: the two places that name the themes.
		const userMenu = read('core/components/users/user-nav-menu.tsx');
		const themeSwitch = read('core/components/common/theme-switch.tsx');
		const themeTiles = read('core/components/settings/pages/preferences/theme-tiles.tsx');

		expect(userMenu).toContain('<ThemeSwitch />');
		expect(themeSwitch).toContain("ariaLabel: t('common.THEME_LIGHT')");
		expect(themeSwitch).toContain("ariaLabel: t('common.THEME_DARK')");
		expect(themeTiles).toContain("light: 'common.THEME_LIGHT'");
		expect(themeTiles).toContain("dark: 'common.THEME_DARK'");
		expect(themeTiles).toContain('label={t(LABEL_KEYS[choice])}');
		for (const source of [userMenu, themeSwitch, themeTiles]) {
			// The old labels were "<brand> Light 2D", shown stripped of "2D" on the closed dropdown.
			expect(source).not.toMatch(/replace\(\s*'2D'/);
		}
		for (const source of [themeSwitch, themeTiles]) {
			expect(source).not.toMatch(BRAND);
		}
	});

	it('ships no branded screenshot for the theme preview', () => {
		expect(existsSync(join(WEB_ROOT, 'public/assets/themeImages'))).toBe(false);

		for (const file of sourceFiles(join(WEB_ROOT, 'core'))) {
			expect(readFileSync(file, 'utf8')).not.toContain('themeImages');
		}
	});
});
