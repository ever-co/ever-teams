import { themeFor } from '../theme';
import { tabBarColorsFor } from './tab-bar-colors';

describe('the tab bar colors', () => {
	it.each(['light', 'dark'] as const)('come from the web tokens in %s mode', (scheme) => {
		const theme = themeFor(scheme);
		const colors = tabBarColorsFor(theme);

		expect(colors.backgroundColor).toBe(theme.colors.card);
		expect(colors.tintColor).toBe(theme.colors['primary-ink']);
		expect(colors.iconColor).toEqual({
			default: theme.colors['muted-foreground'],
			selected: theme.colors['primary-ink']
		});
		expect(colors.labelStyle.default.color).toBe(theme.colors['muted-foreground']);
	});

	it('mark the selected tab with a light tint of the primary color', () => {
		const colors = tabBarColorsFor(themeFor('light'));

		expect(colors.indicatorColor).toBe('hsla(239, 84%, 67%, 0.16)');
		expect(colors.rippleColor).toBe(colors.indicatorColor);
	});

	it('differ between light and dark', () => {
		expect(tabBarColorsFor(themeFor('light')).backgroundColor).not.toBe(
			tabBarColorsFor(themeFor('dark')).backgroundColor
		);
	});
});
