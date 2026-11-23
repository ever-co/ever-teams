import { Platform, StyleSheet } from 'react-native';
import type { ViewStyle } from 'react-native';
import { dataColorChipOf } from '../theme/data-color';
import type { DataColorChip } from '../theme/data-color';
import type { Theme } from '../theme/use-theme';

export interface TaskChipLook {
	container: ViewStyle;
	ink: string;
}

/** The chip's relief: its inner line (at the bottom in light mode, at the top in dark mode) and the hue's shadow. */
function chipReliefOf(chip: DataColorChip, theme: Theme): string {
	if (theme.scheme === 'dark') {
		return `inset 0 1px 0 ${chip.innerLine}`;
	}
	return `inset 0 -1px 0 ${chip.innerLine}, 0 1px 1.5px ${chip.shadow}`;
}

/**
 * The chip's gradient, top to bottom. React Native reads it from `experimental_backgroundImage`; React Native Web
 * passes style keys through as CSS, so `expo:web` needs the standard `backgroundImage`, which ViewStyle does not type.
 */
function chipGradientOf(chip: DataColorChip): ViewStyle {
	const [top, bottom] = chip.gradient;
	const gradient = `linear-gradient(to bottom, ${top}, ${bottom})`;
	if (Platform.OS === 'web') {
		const web: ViewStyle & { backgroundImage: string } = { backgroundImage: gradient };
		return web;
	}
	return { experimental_backgroundImage: gradient };
}

/**
 * How a status, priority, size or label is drawn: the web's `chip-3d` of its API color (a gradient, a hairline, an
 * inner line, a shadow and an ink of the same hue), or a neutral pill with muted text when the value has no readable
 * color or no value is set. The gradient sits on a transparent fill: a dark chip's gradient is translucent, so a flat
 * fill under it (the chip's own, or one its caller sets) would change the web's 16% to 24% tint.
 */
export function taskChipLookOf(color: string | null | undefined, theme: Theme): TaskChipLook {
	const chip = dataColorChipOf(color, theme.scheme);
	if (chip) {
		return {
			container: {
				...chipGradientOf(chip),
				backgroundColor: 'transparent',
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
