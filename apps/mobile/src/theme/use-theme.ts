import { useColorScheme } from 'react-native';
import { resolveColorScheme, ThemePreference } from './color-scheme';
import {
	ColorScheme,
	ColorToken,
	foregroundAlpha,
	hsl,
	minimumTouchTarget,
	motion,
	radius,
	spacing,
	typeScale,
	webColorTokens
} from './tokens';

export type ThemeColors = Record<ColorToken, string>;
export type ForegroundAlpha = keyof typeof foregroundAlpha;

export interface Theme {
	scheme: ColorScheme;
	colors: ThemeColors;
	/** The text color at one step of the design system's alpha scale: subtle fills, hairlines, the press state. */
	foreground: (step: ForegroundAlpha) => string;
	radius: typeof radius;
	spacing: typeof spacing;
	type: typeof typeScale;
	motion: typeof motion;
	minimumTouchTarget: number;
}

export function themeFor(scheme: ColorScheme): Theme {
	const tokens = webColorTokens[scheme];
	const colors = Object.fromEntries(
		Object.entries(tokens).map(([token, triplet]) => [token, hsl(triplet)])
	) as ThemeColors;
	return {
		scheme,
		colors,
		foreground: (step) => hsl(tokens.foreground, foregroundAlpha[step]),
		radius,
		spacing,
		type: typeScale,
		motion,
		minimumTouchTarget
	};
}

const themes: Record<ColorScheme, Theme> = { light: themeFor('light'), dark: themeFor('dark') };

/** The theme for the person's choice, following the phone's light or dark setting while they chose "system". */
export function useTheme(preference: ThemePreference = 'system'): Theme {
	const system = useColorScheme();
	return themes[resolveColorScheme(preference, system)];
}
