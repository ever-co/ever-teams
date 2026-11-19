import type { ColorValue } from 'react-native';
import { colors } from '../theme/colors';

export type SwitchKnobState = {
	on: boolean;
	disabled: boolean;
	status?: 'error' | 'disabled';
	/** The track's "on" fill (inputInnerStyle), which the knob takes while off. */
	onFill?: ColorValue;
	/** The knob's own fill (inputDetailStyle) while on. */
	knobFill?: ColorValue;
	/** One knob color, on and off, as the web's switch. */
	knobColor?: string;
};

/** The knob's color: its own fill while on, the track's on fill while off, then the disabled and error colors. */
export function switchKnobColorOf({ on, disabled, status, onFill, knobFill, knobColor }: SwitchKnobState): ColorValue {
	if (knobColor) {
		return knobColor;
	}
	const isError = status === 'error';
	if (on) {
		return [
			knobFill,
			isError && colors.error,
			disabled && colors.palette.neutral600,
			colors.palette.neutral100
		].find(Boolean) as ColorValue;
	}
	return [onFill, disabled && colors.palette.neutral600, isError && colors.error, colors.palette.neutral200].find(
		Boolean
	) as ColorValue;
}
