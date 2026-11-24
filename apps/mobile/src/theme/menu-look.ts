import { StyleSheet, type TextStyle, type ViewStyle } from 'react-native';
import { hsl, webColorTokens } from './tokens';
import type { Theme } from './use-theme';

/**
 * The web's menu (task-property-menu.tsx): a raised surface of radius 12, a search line of 36 over a hairline, rows of
 * 32 with a radius of 6, and its list at most 288 high before it scrolls.
 */
export const MENU_RADIUS = 12;
export const MENU_SEARCH_HEIGHT = 36;
export const MENU_LIST_MAX_HEIGHT = 288;
export const MENU_LIST_PADDING = 4;
export const MENU_ROW_HEIGHT = 32;
export const MENU_ROW_RADIUS = 6;
export const MENU_ICON_SIZE = 16;
export const MENU_TEXT_SIZE = 13;

const RAISED_SHADOW_LIGHT = '0 4px 8px -2px rgba(0, 0, 0, 0.06), 0 12px 32px -4px rgba(0, 0, 0, 0.1)';
const RAISED_SHADOW_DARK = '0 12px 32px -4px rgba(0, 0, 0, 0.5)';

function raisedShadowOf(theme: Theme): string {
	if (theme.scheme === 'dark') {
		return RAISED_SHADOW_DARK;
	}
	return RAISED_SHADOW_LIGHT;
}

/** The web's `surface-raised`: the popover color, a hairline in the border color and its shadows. */
export function raisedSurfaceOf(theme: Theme): ViewStyle {
	return {
		backgroundColor: theme.colors.popover,
		borderColor: theme.colors.border,
		borderRadius: MENU_RADIUS,
		borderWidth: StyleSheet.hairlineWidth,
		boxShadow: raisedShadowOf(theme)
	};
}

/** A row under the finger: the web's 5% of the text color, else nothing. */
export function menuRowBackgroundOf(pressed: boolean, theme: Theme): string {
	if (pressed) {
		return theme.foreground(5);
	}
	return 'transparent';
}

/** The web's count on a filter row or button: its number in primary-ink over 10% of the primary color. */
export function countChipLookOf(theme: Theme): { container: ViewStyle; text: TextStyle } {
	return {
		container: { backgroundColor: hsl(webColorTokens[theme.scheme].primary, 0.1) },
		text: { color: theme.colors['primary-ink'] }
	};
}
