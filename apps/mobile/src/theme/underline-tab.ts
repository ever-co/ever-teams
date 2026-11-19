import type { ViewStyle } from 'react-native';
import type { Theme } from './use-theme';

const UNDERLINE_WIDTH = 2;

/** The web's underlined tab: the selected one in the foreground over a primary-ink line, the others muted. */
export function underlineTabLookOf(isSelected: boolean, theme: Theme): { tab: ViewStyle; titleColor: string } {
	if (isSelected) {
		return {
			tab: { borderBottomColor: theme.colors['primary-ink'], borderBottomWidth: UNDERLINE_WIDTH },
			titleColor: theme.colors.foreground
		};
	}
	return { tab: {}, titleColor: theme.colors['muted-foreground'] };
}
