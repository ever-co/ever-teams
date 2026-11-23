import type { ColorScheme } from '../theme';

/**
 * Light icons on the dark theme, dark icons on the light one. The theme can differ from the phone's setting (the
 * person chose light or dark in the app), so the style follows the theme, never the phone.
 */
export function statusBarStyleFor(scheme: ColorScheme): 'light' | 'dark' {
	if (scheme === 'dark') {
		return 'light';
	}
	return 'dark';
}
