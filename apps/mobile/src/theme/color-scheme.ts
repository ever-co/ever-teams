import type { ColorScheme } from './tokens';

/** What the person chose in the app; "system" follows the phone, live. */
export type ThemePreference = 'system' | 'light' | 'dark';

/** The scheme of a screen that only knows whether it is dark, as the current screens' theme tells it. */
export function colorSchemeOf(dark: boolean): ColorScheme {
	if (dark) {
		return 'dark';
	}
	return 'light';
}

export function resolveColorScheme(preference: ThemePreference, system: string | null | undefined): ColorScheme {
	if (preference === 'light') {
		return 'light';
	}
	if (preference === 'dark') {
		return 'dark';
	}
	if (system === 'dark') {
		return 'dark';
	}
	return 'light';
}
