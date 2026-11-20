import { StyleSheet } from 'react-native';
import { memberRowLookOf } from './member-row-look';
import { hsl, webColorTokens } from './tokens';
import { themeFor } from './use-theme';

describe('a row of the members list', () => {
	it('draws a chosen member in a primary tint inside a primary hairline', () => {
		const dark = themeFor('dark');

		expect(memberRowLookOf(true, dark)).toEqual({
			backgroundColor: hsl(webColorTokens.dark.primary, 0.05),
			borderColor: dark.colors.primary,
			borderRadius: 10,
			borderWidth: StyleSheet.hairlineWidth
		});
	});

	it('keeps the same border width on a row that is not chosen, so choosing one never moves it', () => {
		const light = themeFor('light');

		const row = memberRowLookOf(false, light);

		expect(row.backgroundColor).toBe('transparent');
		expect(row.borderColor).toBe('transparent');
		expect(row.borderWidth).toBe(memberRowLookOf(true, light).borderWidth);
	});
});
