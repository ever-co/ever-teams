import { themeFor } from './use-theme';
import { underlineTabLookOf } from './underline-tab';

describe("the web's underlined tab", () => {
	it.each(['light', 'dark'] as const)(
		'draws the selected tab in the foreground over a primary-ink line (%s)',
		(scheme) => {
			const theme = themeFor(scheme);

			const look = underlineTabLookOf(true, theme);

			expect(look.titleColor).toBe(theme.colors.foreground);
			expect(look.tab).toEqual({ borderBottomColor: theme.colors['primary-ink'], borderBottomWidth: 2 });
		}
	);

	it.each(['light', 'dark'] as const)('draws the other tabs muted, without a line (%s)', (scheme) => {
		const theme = themeFor(scheme);

		const look = underlineTabLookOf(false, theme);

		expect(look.titleColor).toBe(theme.colors['muted-foreground']);
		expect(look.tab).toEqual({});
	});
});
