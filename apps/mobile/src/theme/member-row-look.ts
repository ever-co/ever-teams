import { StyleSheet } from 'react-native';
import type { ViewStyle } from 'react-native';
import { hsl, webColorTokens } from './tokens';
import type { Theme } from './use-theme';

const SELECTED_TINT = 0.05;

/**
 * A row of the members list: the chosen one in a primary tint inside a primary hairline, the others clear behind a
 * hairline of the same width, so choosing a row never moves its content.
 */
export function memberRowLookOf(isSelected: boolean, theme: Theme): ViewStyle {
	const shape: ViewStyle = { borderRadius: theme.radius.panel, borderWidth: StyleSheet.hairlineWidth };
	if (isSelected) {
		return {
			...shape,
			backgroundColor: hsl(webColorTokens[theme.scheme].primary, SELECTED_TINT),
			borderColor: theme.colors.primary
		};
	}
	return { ...shape, backgroundColor: 'transparent', borderColor: 'transparent' };
}
