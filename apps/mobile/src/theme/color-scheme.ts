import type { ColorScheme } from './tokens';

/** What the person chose in the app; "system" follows the phone, live. */
export type ThemePreference = 'system' | 'light' | 'dark';

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
