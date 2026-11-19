import type { FontVariant, TextStyle } from 'react-native';
import type { Theme } from '../../../../../src/theme/use-theme';
import { typography } from '../../../../theme/typography';

/** A mutable array: React Native types fontVariant as FontVariant[], which a readonly tuple does not satisfy. */
const TABULAR_DIGITS: FontVariant[] = ['tabular-nums'];

/** The label over a time on a member card: the muted text, as the web labels its figures. */
export function statLabelStyleOf(theme: Theme): TextStyle {
	return { color: theme.colors['muted-foreground'] };
}

/** A time on a member card: 14/500 in tabular digits and the foreground color, so the figures line up. */
export function statValueStyleOf(theme: Theme): TextStyle {
	// the medium face itself: with a bundled face per weight, the weight alone keeps the component's semibold face
	return {
		color: theme.colors.foreground,
		fontFamily: typography.fonts.PlusJakartaSans.medium,
		fontSize: 14,
		fontWeight: '500',
		fontVariant: TABULAR_DIGITS
	};
}
