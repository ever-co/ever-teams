import { StyleSheet } from 'react-native';
import { taskChipLookOf } from './task-chip';
import { dataColorChipOf } from '../theme/data-color';
import { themeFor } from '../theme/use-theme';

describe('the look of a task chip', () => {
	it("draws a value with the web's chip of its color", () => {
		const look = taskChipLookOf('#ffcc00', themeFor('light'));
		const chip = dataColorChipOf('#ffcc00', 'light');

		expect(look.container).toMatchObject({
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

	it("gives a colored chip the web's relief: its gradient, its inner line and the hue's shadow", () => {
		const light = taskChipLookOf('#ffcc00', themeFor('light')).container;
		const dark = taskChipLookOf('#ffcc00', themeFor('dark')).container;

		expect(light.experimental_backgroundImage).toMatch(/^linear-gradient\(to bottom, rgb\(.+\), rgb\(.+\)\)$/);
		expect(light.boxShadow).toMatch(/^inset 0 -1px 0 rgba\(.+\), 0 1px 1\.5px rgba\(.+\)$/);
		expect(dark.boxShadow).toBe('inset 0 1px 0 rgba(255, 255, 255, 0.06)');
	});

	it("draws a colored chip's gradient alone, so a dark chip keeps the web's 16% to 24% tint", () => {
		const dark = taskChipLookOf('#ffcc00', themeFor('dark')).container;

		expect(dark.backgroundColor).toBeUndefined();
		expect(dark.experimental_backgroundImage).toBe(
			'linear-gradient(to bottom, ' + dataColorChipOf('#ffcc00', 'dark')!.gradient.join(', ') + ')'
		);
	});
});
