import { StyleSheet } from 'react-native';
import type { ViewStyle } from 'react-native';
import { dataColorChipOf, DataColorChip } from '../theme/data-color';
import type { Theme } from '../theme/use-theme';

export interface TaskChipLook {
	container: ViewStyle;
	ink: string;
}

/**
 * How a status, priority, size or label is drawn: the web's `chip-3d` of its API color (a gradient, a hairline, an
 * inner line, a shadow and an ink of the same hue), or a neutral pill with muted text when the value has no readable
 * color or no value is set.
 */
/** The chip's relief: its inner line (at the bottom in light mode, at the top in dark mode) and the hue's shadow. */
function chipReliefOf(chip: DataColorChip, theme: Theme): string {
	if (theme.scheme === 'dark') {
		return `inset 0 1px 0 ${chip.innerLine}`;
	}
	return `inset 0 -1px 0 ${chip.innerLine}, 0 1px 1.5px ${chip.shadow}`;
}

export function taskChipLookOf(color: string | null | undefined, theme: Theme): TaskChipLook {
	const chip = dataColorChipOf(color, theme.scheme);
	if (chip) {
		const [top, bottom] = chip.gradient;
		return {
			container: {
				experimental_backgroundImage: `linear-gradient(to bottom, ${top}, ${bottom})`,
				borderColor: chip.border,
				borderWidth: StyleSheet.hairlineWidth,
				boxShadow: chipReliefOf(chip, theme)
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
