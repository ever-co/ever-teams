import { StyleSheet } from 'react-native';
import {
	settingsDividerOf,
	settingsListSurfaceOf,
	settingsSectionTitleColorOf,
	settingsSurfaceOf
} from './settings-look';
import { themeFor } from './use-theme';

describe("the web's settings surface", () => {
	it.each(['light', 'dark'] as const)('puts the rows on the card, radius 14, inside a hairline (%s)', (scheme) => {
		const theme = themeFor(scheme);

		const surface = settingsSurfaceOf(theme);

		expect(surface.backgroundColor).toBe(theme.colors.card);
		expect(surface.borderRadius).toBe(14);
		expect(surface.borderWidth).toBe(StyleSheet.hairlineWidth);
		expect(surface.borderColor).toBe(theme.colors.border);
	});

	it('splits two rows with a hairline in the border color', () => {
		const theme = themeFor('light');

		expect(settingsDividerOf(theme)).toEqual({
			backgroundColor: theme.colors.border,
			height: StyleSheet.hairlineWidth
		});
	});

	it.each(['light', 'dark'] as const)(
		'titles the danger zone in destructive-ink, never in a pink literal (%s)',
		(scheme) => {
			const theme = themeFor(scheme);

			expect(settingsSectionTitleColorOf('danger', theme)).toBe(theme.colors['destructive-ink']);
			expect(settingsSectionTitleColorOf('default', theme)).toBe(theme.colors.foreground);
		}
	);
});

describe("a team settings list's surface", () => {
	it('puts the rows of a list on the settings surface', () => {
		const theme = themeFor('light');

		expect(settingsListSurfaceOf(3, theme)).toEqual(settingsSurfaceOf(theme));
	});

	it('draws no empty frame around a list without rows', () => {
		expect(settingsListSurfaceOf(0, themeFor('dark'))).toEqual({});
	});
});
