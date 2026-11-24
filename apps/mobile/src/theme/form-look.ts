import type { TextStyle, ViewStyle } from 'react-native';
import type { Theme } from './use-theme';

const INPUT_BORDER_WIDTH = 1;

/** The web's text field: a border in the input color, radius 8, the text in the foreground, a muted placeholder. */
export function inputLookOf(theme: Theme): { field: ViewStyle & TextStyle; placeholderColor: string } {
	return {
		field: {
			borderColor: theme.colors.input,
			borderRadius: theme.radius.control,
			borderWidth: INPUT_BORDER_WIDTH,
			color: theme.colors.foreground
		},
		placeholderColor: theme.colors['muted-foreground']
	};
}

export type ButtonTone = 'primary' | 'secondary';

/** The web's filled buttons, radius 8: primary on the primary fill, secondary on the secondary fill. */
export function buttonLookOf(tone: ButtonTone, theme: Theme): { button: ViewStyle; labelColor: string } {
	if (tone === 'primary') {
		return {
			button: { backgroundColor: theme.colors.primary, borderRadius: theme.radius.control },
			labelColor: theme.colors['primary-foreground']
		};
	}
	return {
		button: { backgroundColor: theme.colors.secondary, borderRadius: theme.radius.control },
		labelColor: theme.colors['secondary-foreground']
	};
}

/** One choice among a few: the chosen one filled with primary, the others outlined in the input color. */
export function choiceLookOf(isChosen: boolean, theme: Theme): { chip: ViewStyle; labelColor: string } {
	if (isChosen) {
		return {
			chip: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
			labelColor: theme.colors['primary-foreground']
		};
	}
	return { chip: { borderColor: theme.colors.input }, labelColor: theme.colors.foreground };
}
