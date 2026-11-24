import type { Theme } from './use-theme';

/** The estimate ring of a card: the time worked in the success color over a track in the foreground at 10%. */
export function estimateRingColorsOf(theme: Theme): { tint: string; track: string } {
	return { tint: theme.colors.success, track: theme.foreground(10) };
}
