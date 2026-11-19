import { buttonLookOf, choiceLookOf, inputLookOf } from './form-look';
import { themeFor } from './use-theme';

describe("the web's form controls", () => {
	it.each(['light', 'dark'] as const)(
		'draws a field in the input color, radius 8, with a muted placeholder (%s)',
		(scheme) => {
			const theme = themeFor(scheme);

			const look = inputLookOf(theme);

			expect(look.field).toMatchObject({
				borderColor: theme.colors.input,
				borderRadius: 8,
				color: theme.colors.foreground
			});
			expect(look.placeholderColor).toBe(theme.colors['muted-foreground']);
		}
	);

	it.each(['light', 'dark'] as const)(
		'puts Cancel on the secondary fill, never a light grey in dark mode (%s)',
		(scheme) => {
			const theme = themeFor(scheme);

			const look = buttonLookOf('secondary', theme);

			expect(look.button.backgroundColor).toBe(theme.colors.secondary);
			expect(look.labelColor).toBe(theme.colors['secondary-foreground']);
		}
	);

	it('puts Save on the primary fill with its own ink', () => {
		const theme = themeFor('dark');

		expect(buttonLookOf('primary', theme)).toEqual({
			button: { backgroundColor: theme.colors.primary, borderRadius: 8 },
			labelColor: theme.colors['primary-foreground']
		});
	});

	it('fills the chosen day with primary and outlines the others', () => {
		const theme = themeFor('light');

		expect(choiceLookOf(true, theme).chip.backgroundColor).toBe(theme.colors.primary);
		expect(choiceLookOf(false, theme)).toEqual({
			chip: { borderColor: theme.colors.input },
			labelColor: theme.colors.foreground
		});
	});
});
