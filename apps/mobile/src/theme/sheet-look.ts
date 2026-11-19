import { StyleSheet, ViewStyle } from 'react-native';
import type { Theme } from './use-theme';

const SHEET_SHADOW = '0 -8px 24px rgba(0, 0, 0, 0.18)';
/** The overlay under a sheet: 40% black, without blur. */
export const sheetOverlayOpacity = 0.4;

export interface SheetLook {
	background: ViewStyle;
	handle: ViewStyle;
	overlayOpacity: number;
}

/** The one look of a bottom sheet: card surface, radius 18 on top, a hairline, the raised shadow, a quiet handle. */
export function sheetLookOf(theme: Theme): SheetLook {
	return {
		background: {
			backgroundColor: theme.colors.card,
			borderTopLeftRadius: theme.radius.dialog,
			borderTopRightRadius: theme.radius.dialog,
			borderWidth: StyleSheet.hairlineWidth,
			borderColor: theme.colors.border,
			boxShadow: SHEET_SHADOW
		},
		handle: { backgroundColor: theme.foreground(15), width: 36 },
		overlayOpacity: sheetOverlayOpacity
	};
}
