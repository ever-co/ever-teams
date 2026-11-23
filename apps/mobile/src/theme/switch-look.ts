import type { ViewStyle } from 'react-native';
import type { Theme } from './use-theme';

const TRACK_HEIGHT = 24;
const TRACK_WIDTH = 42;
const KNOB_SIZE = 18;
const TRACK_INSET = 3;
const KNOB_SHADOW = '0 1px 2px rgba(0, 0, 0, 0.15)';
const KNOB_COLOR = '#FFFFFF';

/** The knob's own style: Toggle reads it as a view and an image style both. */
export type WebSwitchKnob = Pick<ViewStyle, 'borderRadius' | 'boxShadow' | 'height' | 'width'>;

export type WebSwitchLook = { track: ViewStyle; onFill: ViewStyle; knob: WebSwitchKnob; knobColor: string };

/** The web's switch: a 42 x 24 track in the foreground at 10% off and in primary on, a white 18 knob. */
export function webSwitchLookOf(theme: Theme): WebSwitchLook {
	return {
		track: {
			backgroundColor: theme.foreground(10),
			borderRadius: TRACK_HEIGHT / 2,
			height: TRACK_HEIGHT,
			width: TRACK_WIDTH
		},
		onFill: { backgroundColor: theme.colors.primary, paddingEnd: TRACK_INSET, paddingStart: TRACK_INSET },
		knob: { borderRadius: KNOB_SIZE / 2, boxShadow: KNOB_SHADOW, height: KNOB_SIZE, width: KNOB_SIZE },
		knobColor: KNOB_COLOR
	};
}
