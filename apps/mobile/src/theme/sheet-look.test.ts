import { StyleSheet } from 'react-native';
import { sheetLookOf } from './sheet-look';
import { themeFor } from './use-theme';

describe('the look of a bottom sheet', () => {
	it.each(['light', 'dark'] as const)('takes the card surface, radius 18 on top and a hairline in %s', (scheme) => {
		const theme = themeFor(scheme);

		const { background } = sheetLookOf(theme);

		expect(background.backgroundColor).toBe(theme.colors.card);
		expect(background.borderTopLeftRadius).toBe(18);
		expect(background.borderTopRightRadius).toBe(18);
		expect(background.borderWidth).toBe(StyleSheet.hairlineWidth);
		expect(background.borderColor).toBe(theme.colors.border);
	});

	it('draws the handle in the foreground at 15% over a 40% overlay', () => {
		const theme = themeFor('dark');

		const look = sheetLookOf(theme);

		expect(look.handle.backgroundColor).toBe(theme.foreground(15));
		expect(look.overlayOpacity).toBe(0.4);
	});
});
