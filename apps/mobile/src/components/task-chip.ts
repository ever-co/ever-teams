import { StyleSheet } from 'react-native';
import type { ViewStyle } from 'react-native';
import { dataColorChipOf } from '../theme/data-color';
import type { Theme } from '../theme/use-theme';

export interface TaskChipLook {
	container: ViewStyle;
	ink: string;
}

/**
 * How a status, priority, size or label is drawn: the web's chip of its API color (a tint, a hairline and an ink of
 * the same hue), or a neutral pill with muted text when the value has no readable color or no value is set.
 */
export function taskChipLookOf(color: string | null | undefined, theme: Theme): TaskChipLook {
	const chip = dataColorChipOf(color, theme.scheme);
	if (chip) {
		return {
			container: {
				backgroundColor: chip.background,
				borderColor: chip.border,
				borderWidth: StyleSheet.hairlineWidth
			},
			ink: chip.ink
		};
	}
	return {
		container: {
			backgroundColor: theme.colors.card,
			borderColor: theme.colors.input,
			borderWidth: StyleSheet.hairlineWidth
		},
		ink: theme.colors['muted-foreground']
	};
}
