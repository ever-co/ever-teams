import { StyleSheet } from 'react-native';
import { statLabelStyleOf, statValueStyleOf } from './card-stat-text';
import { typography } from '../../../../theme/typography';
import { themeFor } from '../../../../../src/theme/use-theme';

describe('the times on a member card', () => {
	it('label them in the muted text', () => {
		expect(statLabelStyleOf(themeFor('dark')).color).toBe(themeFor('dark').colors['muted-foreground']);
	});

	it('write them in 14/500 tabular digits in the foreground color', () => {
		const value = statValueStyleOf(themeFor('light'));

		expect(value).toEqual({
			color: themeFor('light').colors.foreground,
			fontFamily: typography.fonts.PlusJakartaSans.medium,
			fontSize: 14,
			fontWeight: '500',
			fontVariant: ['tabular-nums']
		});
	});

	it('replace the semibold face a time component sets, so the medium weight shows', () => {
		const componentStyle = { fontFamily: typography.primary.semiBold, fontSize: 12 };

		const drawn = StyleSheet.flatten([componentStyle, statValueStyleOf(themeFor('light'))]);

		expect(drawn.fontFamily).toBe(typography.fonts.PlusJakartaSans.medium);
	});
});
