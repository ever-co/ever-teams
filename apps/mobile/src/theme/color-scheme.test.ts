import { resolveColorScheme } from './color-scheme';
import { themeFor } from './use-theme';

describe('the color scheme', () => {
	it('follows the phone while the person chose "system"', () => {
		expect(resolveColorScheme('system', 'dark')).toBe('dark');
		expect(resolveColorScheme('system', 'light')).toBe('light');
	});

	it('falls back to light when the phone says nothing', () => {
		expect(resolveColorScheme('system', null)).toBe('light');
		expect(resolveColorScheme('system', undefined)).toBe('light');
	});

	it("keeps the person's own choice whatever the phone says", () => {
		expect(resolveColorScheme('dark', 'light')).toBe('dark');
		expect(resolveColorScheme('light', 'dark')).toBe('light');
	});
});

describe('the theme', () => {
	it("draws with the web's colors as colors React Native reads", () => {
		expect(themeFor('light').colors.primary).toBe('hsl(239, 84%, 67%)');
		expect(themeFor('dark').colors.background).toBe('hsl(240, 5%, 7%)');
	});

	it("tints states with the text color at the design system's alpha steps", () => {
		expect(themeFor('light').foreground(5)).toBe('hsla(240, 6%, 10%, 0.05)');
		expect(themeFor('dark').foreground(10)).toBe('hsla(240, 5%, 90%, 0.1)');
	});
});
