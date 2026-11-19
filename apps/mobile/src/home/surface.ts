import { StyleSheet } from 'react-native';
import type { Theme } from '../theme';

const PRESSED_OPACITY = 0.85;
const DISABLED_OPACITY = 0.5;

/** A control's opacity: dimmed while it cannot act, lighter while it is pressed. */
export function opacityOf(pressed: boolean, enabled: boolean): number {
	if (!enabled) {
		return DISABLED_OPACITY;
	}
	if (pressed) {
		return PRESSED_OPACITY;
	}
	return 1;
}

/** The colors and corners of Home's cards, from the theme. */
export function surfaceOf(theme: Theme) {
	return {
		backgroundColor: theme.colors.card,
		borderColor: theme.colors.border,
		borderRadius: theme.radius.sheet
	};
}

export const surfaceStyles = StyleSheet.create({
	card: {
		borderWidth: StyleSheet.hairlineWidth,
		padding: 16,
		boxShadow: '0 1px 2px rgba(0, 0, 0, 0.065)'
	}
});
