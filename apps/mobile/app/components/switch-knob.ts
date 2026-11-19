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
};

/** The knob's color: its own fill while on, the track's on fill while off, then the disabled and error colors. */
export function switchKnobColorOf({ on, disabled, status, onFill, knobFill }: SwitchKnobState): ColorValue {
	const isError = status === 'error';
	if (on) {
		return [
			knobFill,
			isError && colors.error,
			disabled && colors.palette.neutral600,
			colors.palette.neutral100
		].filter(Boolean)[0] as ColorValue;
	}
	return [onFill, disabled && colors.palette.neutral600, isError && colors.error, colors.palette.neutral200].filter(
		Boolean
	)[0] as ColorValue;
}
