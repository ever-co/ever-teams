import { themeFor } from '../../src/theme/use-theme';
import { renderHook } from '@testing-library/react-native';
import { appColorsOf, customDarkTheme, customLightTheme, useWebTheme } from './colors';

const mockPaperTheme = { dark: false };
jest.mock('react-native-paper', () => ({
	...jest.requireActual('react-native-paper'),
	useTheme: () => mockPaperTheme
}));

const APP_KEYS = [
	'primary',
	'secondary',
	'tertiary',
	'background',
	'background2',
	'divider',
	'border',
	'secondary2',
	'accentFill'
] as const;

describe("the current screens' theme", () => {
	it.each([
		['light', customLightTheme],
		['dark', customDarkTheme]
	] as const)('names only web colors in %s mode', (scheme, theme) => {
		const webColors = new Set(Object.values(themeFor(scheme).colors));

		for (const key of APP_KEYS) {
			expect(webColors.has(theme.colors[key])).toBe(true);
		}
	});

	it("reads text, accents, quiet text, cards and the page from the web's tokens", () => {
		const web = themeFor('light').colors;

		expect(appColorsOf('light')).toEqual({
			primary: web.foreground,
			secondary: web['primary-ink'],
			tertiary: web['muted-foreground'],
			background: web.card,
			background2: web.background,
			divider: web.border,
			border: web.border,
			secondary2: web.muted,
			accentFill: web.primary
		});
	});

	it.each([
		[true, 'dark'],
		[false, 'light']
	] as const)("gives the web's tokens of the theme the app shows (dark: %s)", async (dark, scheme) => {
		mockPaperTheme.dark = dark;

		const { result } = await renderHook(() => useWebTheme());

		expect(result.current.scheme).toBe(scheme);
		expect(result.current.colors).toEqual(themeFor(scheme).colors);
	});

	it('follows the dark tokens in dark mode', () => {
		const web = themeFor('dark').colors;

		expect(customDarkTheme.colors.primary).toBe(web.foreground);
		expect(customDarkTheme.colors.background2).toBe(web.background);
	});
});
