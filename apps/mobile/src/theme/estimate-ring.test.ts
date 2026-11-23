import { estimateRingColorsOf } from './estimate-ring';
import { themeFor } from './use-theme';

describe("a card's estimate ring", () => {
	it.each(['light', 'dark'] as const)('fills in the success color over a quiet track (%s)', (scheme) => {
		const theme = themeFor(scheme);

		expect(estimateRingColorsOf(theme)).toEqual({ tint: theme.colors.success, track: theme.foreground(10) });
	});

	it('draws its track dark in dark mode, where a fixed light grey ring stood out', () => {
		expect(estimateRingColorsOf(themeFor('dark')).track).not.toBe('#F0F0F0');
		expect(estimateRingColorsOf(themeFor('dark')).track).toBe(themeFor('dark').foreground(10));
	});
});
