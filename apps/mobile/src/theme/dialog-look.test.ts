import { StyleSheet } from 'react-native';
import { dialogLookOf, dialogOverlayColor } from './dialog-look';
import { themeFor } from './use-theme';

describe("the web's dialog", () => {
	it('sits on the card color, radius 18 inside a hairline, with the raised shadow', () => {
		const dark = themeFor('dark');

		expect(dialogLookOf(dark)).toEqual({
			backgroundColor: dark.colors.card,
			borderColor: dark.colors.border,
			borderRadius: 18,
			borderWidth: StyleSheet.hairlineWidth,
			boxShadow: '0 8px 24px rgba(0, 0, 0, 0.18)'
		});
	});

	it('lays a 40% black overlay under it, without blur', () => {
		expect(dialogOverlayColor).toBe('rgba(0, 0, 0, 0.4)');
	});
});
