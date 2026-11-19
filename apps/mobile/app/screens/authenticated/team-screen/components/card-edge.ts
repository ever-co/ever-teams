import type { Theme } from '../../../../../src/theme/use-theme';

/** A member card's hairline: the primary color on the person's own card, as the web marks it, the border otherwise. */
export function cardEdgeOf(isOwnCard: boolean, theme: Theme): string {
	if (isOwnCard) {
		return theme.colors.primary;
	}
	return theme.colors.border;
}
