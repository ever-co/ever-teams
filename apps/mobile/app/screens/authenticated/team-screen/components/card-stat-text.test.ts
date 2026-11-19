import { statLabelStyleOf, statValueStyleOf } from './card-stat-text';
import { themeFor } from '../../../../../src/theme/use-theme';

describe('the times on a member card', () => {
	it('label them in the muted text', () => {
		expect(statLabelStyleOf(themeFor('dark')).color).toBe(themeFor('dark').colors['muted-foreground']);
	});

	it('write them in 14/500 tabular digits in the foreground color', () => {
		const value = statValueStyleOf(themeFor('light'));

		expect(value).toEqual({
			color: themeFor('light').colors.foreground,
			fontSize: 14,
			fontWeight: '500',
			fontVariant: ['tabular-nums']
		});
	});
});
