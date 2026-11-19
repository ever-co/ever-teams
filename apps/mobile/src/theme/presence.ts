import { hsl, webColorTokens } from './tokens';
import type { Theme } from './use-theme';

export type Presence = 'running' | 'online' | 'idle' | 'suspended' | 'pause';

const IDLE_ALPHA = 0.6;
const SUSPENDED_ALPHA = 0.3;

/**
 * A member's presence in the web's colors (core/components/timer/timer-status.tsx): working in success, on pause in
 * warning, idle in the muted text at 60% and suspended at 30%. Idle is never red: it is not an error.
 */
export function presenceColorOf(presence: Presence, theme: Theme): string {
	const tokens = webColorTokens[theme.scheme];
	if (presence === 'running' || presence === 'online') {
		return theme.colors.success;
	}
	if (presence === 'pause') {
		return theme.colors.warning;
	}
	if (presence === 'idle') {
		return hsl(tokens['muted-foreground'], IDLE_ALPHA);
	}
	return hsl(tokens['muted-foreground'], SUSPENDED_ALPHA);
}

/**
 * The ink of the icon on a presence badge, at 3:1 at least on its fill: the dark text on the solid fills (working, on
 * pause) in both themes, where white reads at 2.1 to 2.5; the theme's text on the translucent ones, which take the
 * card's shade.
 */
export function presenceInkOf(presence: Presence, theme: Theme): string {
	const isTranslucent = presence === 'idle' || presence === 'suspended';
	if (isTranslucent) {
		return theme.colors.foreground;
	}
	return hsl(webColorTokens.light.foreground);
}
