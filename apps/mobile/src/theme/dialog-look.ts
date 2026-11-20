import { StyleSheet, type ViewStyle } from 'react-native';
import type { Theme } from './use-theme';

const DIALOG_SHADOW = '0 8px 24px rgba(0, 0, 0, 0.18)';
/** The overlay under a dialog: 40% black, without blur. */
export const dialogOverlayColor = 'rgba(0, 0, 0, 0.4)';

/** The web's dialog: the card surface, radius 18, a hairline in the border color and the raised shadow. */
export function dialogLookOf(theme: Theme): ViewStyle {
	return {
		backgroundColor: theme.colors.card,
		borderColor: theme.colors.border,
		borderRadius: theme.radius.dialog,
		borderWidth: StyleSheet.hairlineWidth,
		boxShadow: DIALOG_SHADOW
	};
}
