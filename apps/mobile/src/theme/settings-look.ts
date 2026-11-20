import { StyleSheet, type ViewStyle } from 'react-native';
import type { Theme } from './use-theme';

export type SettingsTone = 'default' | 'danger';

const SURFACE_SHADOW = '0 1px 2px rgba(0, 0, 0, 0.065)';

/** The web's settings surface: rows on the card color, radius 14, a hairline ring and a faint shadow. */
export function settingsSurfaceOf(theme: Theme): ViewStyle {
	return {
		backgroundColor: theme.colors.card,
		borderColor: theme.colors.border,
		borderCurve: 'continuous',
		borderRadius: theme.radius.sheet,
		borderWidth: StyleSheet.hairlineWidth,
		boxShadow: SURFACE_SHADOW,
		overflow: 'hidden'
	};
}

/** The hairline between two rows of a surface. */
export function settingsDividerOf(theme: Theme): ViewStyle {
	return { backgroundColor: theme.colors.border, height: StyleSheet.hairlineWidth };
}

/** A section's title: the danger zone's in destructive-ink, the others in the foreground. */
export function settingsSectionTitleColorOf(tone: SettingsTone, theme: Theme): string {
	if (tone === 'danger') {
		return theme.colors['destructive-ink'];
	}
	return theme.colors.foreground;
}

/** A list's surface: the settings surface around its rows, nothing around an empty list. */
export function settingsListSurfaceOf(count: number, theme: Theme): ViewStyle {
	if (count === 0) {
		return {};
	}
	return settingsSurfaceOf(theme);
}
