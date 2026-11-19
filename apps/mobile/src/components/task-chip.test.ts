import { StyleSheet } from 'react-native';
import { taskChipLookOf } from './task-chip';
import { dataColorChipOf } from '../theme/data-color';
import { themeFor } from '../theme/use-theme';

describe('the look of a task chip', () => {
	it("draws a value with the web's chip of its color", () => {
		const look = taskChipLookOf('#ffcc00', themeFor('light'));
		const chip = dataColorChipOf('#ffcc00', 'light');

		expect(look.container).toEqual({
			backgroundColor: chip?.background,
			borderColor: chip?.border,
			borderWidth: StyleSheet.hairlineWidth
		});
		expect(look.ink).toBe(chip?.ink);
	});

	it('draws a value without a readable color, or no value, as a neutral pill with muted text', () => {
		const dark = themeFor('dark');
		const look = taskChipLookOf(undefined, dark);

		expect(look.container.backgroundColor).toBe(dark.colors.card);
		expect(look.container.borderColor).toBe(dark.colors.input);
		expect(look.ink).toBe(dark.colors['muted-foreground']);
	});
});
