import type { TextStyle, ViewStyle } from 'react-native';
import type { Theme } from './use-theme';

/** The height of every sign-in field and button on a phone: the web's 44 for touch. */
export const AUTH_CONTROL_HEIGHT = 44;
/** One slot of the emailed code, 40 tall and at most 40 wide: the web's code recipe. */
export const AUTH_CODE_SLOT_SIZE = 40;

const DISABLED_OPACITY = 0.5;

function opacityOf(isEnabled: boolean): number {
	if (isEnabled) {
		return 1;
	}
	return DISABLED_OPACITY;
}

/** A sign-in step's heading: the title 20/600 in the foreground, one 14 line in muted-foreground under it. */
export function authHeadingLookOf(theme: Theme): { title: TextStyle; description: TextStyle } {
	return {
		title: { color: theme.colors.foreground, fontSize: 20, lineHeight: 26 },
		description: { color: theme.colors['muted-foreground'], fontSize: 14, lineHeight: 20, marginTop: 6 }
	};
}

/** A field's border: the input color, destructive while the field shows an error. */
export function authFieldBorderColorOf(hasError: boolean, theme: Theme): string {
	if (hasError) {
		return theme.colors.destructive;
	}
	return theme.colors.input;
}

/** A field's label, 13 in the foreground, above its field. */
export function authLabelLookOf(theme: Theme): TextStyle {
	return { color: theme.colors.foreground, fontSize: 13, lineHeight: 16, marginBottom: 8 };
}

/** The step's submit: a full-width primary pill, 44 tall, faded while it cannot be pressed. */
export function authSubmitLookOf(isEnabled: boolean, theme: Theme): { button: ViewStyle; labelColor: string } {
	return {
		button: {
			alignItems: 'center',
			backgroundColor: theme.colors.primary,
			borderRadius: theme.radius.full,
			height: AUTH_CONTROL_HEIGHT,
			justifyContent: 'center',
			opacity: opacityOf(isEnabled),
			width: '100%'
		},
		labelColor: theme.colors['primary-foreground']
	};
}

/** Back and the other quiet links of sign-in: 13 in muted-foreground. */
export function authQuietLinkLookOf(theme: Theme): TextStyle {
	return { color: theme.colors['muted-foreground'], fontSize: 13 };
}

/** One slot of the emailed code: the control recipe, its border in primary while it holds the focus. */
export function authCodeSlotLookOf(isFocused: boolean, theme: Theme): ViewStyle & TextStyle {
	let borderColor = theme.colors.input;
	if (isFocused) {
		borderColor = theme.colors.primary;
	}
	return {
		borderColor,
		borderRadius: theme.radius.control,
		borderWidth: 1,
		color: theme.colors.foreground,
		height: AUTH_CODE_SLOT_SIZE
	};
}
