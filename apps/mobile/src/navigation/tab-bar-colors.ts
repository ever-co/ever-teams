import { hsl, webColorTokens } from '../theme';
import type { Theme } from '../theme';

const INDICATOR_ALPHA = 0.16;

/** The tab bar in the web's tokens: the selected tab in the primary ink on a primary tint, the others muted. */
export function tabBarColorsFor(theme: Theme) {
	const selected = theme.colors['primary-ink'];
	const unselected = theme.colors['muted-foreground'];
	const tint = hsl(webColorTokens[theme.scheme].primary, INDICATOR_ALPHA);
	return {
		backgroundColor: theme.colors.card,
		tintColor: selected,
		iconColor: { default: unselected, selected },
		labelStyle: { default: { color: unselected }, selected: { color: selected } },
		indicatorColor: tint,
		rippleColor: tint
	};
}
