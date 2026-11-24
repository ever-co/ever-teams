import { DarkTheme, DefaultTheme } from 'expo-router';
import type { ColorScheme, Theme } from '../theme';

function baseFontsFor(scheme: ColorScheme) {
	if (scheme === 'dark') {
		return DarkTheme.fonts;
	}
	return DefaultTheme.fonts;
}

/** The navigators' colors from the web's tokens, so headers, tabs and screens match the rest of the app. */
export function navigationThemeFor(theme: Theme): ReactNavigation.Theme {
	const dark = theme.scheme === 'dark';
	return {
		dark,
		colors: {
			primary: theme.colors.primary,
			background: theme.colors.background,
			card: theme.colors.card,
			text: theme.colors.foreground,
			border: theme.colors.border,
			notification: theme.colors.destructive
		},
		fonts: baseFontsFor(theme.scheme)
	};
}
