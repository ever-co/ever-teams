import React from 'react';
import { observer } from 'mobx-react-lite';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { translate, type TxKeyPath } from '../i18n';
import { useStores } from '../models';
import { typography, useWebTheme } from '../theme';
import type { ThemePreference } from '../../src/theme/color-scheme';
import type { Theme } from '../../src/theme/use-theme';

const CHOICES: ThemePreference[] = ['system', 'light', 'dark'];

const LABEL_KEYS: Record<ThemePreference, TxKeyPath> = {
	system: 'hamburgerMenu.themeSystem',
	light: 'hamburgerMenu.themeLight',
	dark: 'hamburgerMenu.themeDark'
};

const SELECTED_SHADOW = '0 1px 2px rgba(0, 0, 0, 0.1)';

/** A segment of the choice: the picked one raised on the card, the others muted on the track. */
export function segmentLookOf(isSelected: boolean, theme: Theme): { segment: ViewStyle; labelColor: string } {
	if (isSelected) {
		return {
			segment: { backgroundColor: theme.colors.card, boxShadow: SELECTED_SHADOW },
			labelColor: theme.colors.foreground
		};
	}
	return { segment: {}, labelColor: theme.colors['muted-foreground'] };
}

/** The theme as the web offers it: the phone's, light or dark. */
export const ThemeChoice = observer(function ThemeChoice() {
	const { authenticationStore } = useStores();
	const theme = useWebTheme();
	return (
		<View
			accessibilityRole="radiogroup"
			accessibilityLabel={translate('hamburgerMenu.theme')}
			style={[styles.track, { backgroundColor: theme.colors.muted }]}
		>
			{CHOICES.map((choice) => {
				const isSelected = authenticationStore.themePreference === choice;
				const look = segmentLookOf(isSelected, theme);
				return (
					<Pressable
						key={choice}
						testID={`theme-${choice}`}
						accessibilityRole="radio"
						accessibilityState={{ checked: isSelected }}
						onPress={() => authenticationStore.setThemePreference(choice)}
						style={[styles.segment, look.segment]}
					>
						<Text style={[styles.label, { color: look.labelColor }]}>{translate(LABEL_KEYS[choice])}</Text>
					</Pressable>
				);
			})}
		</View>
	);
});

const styles = StyleSheet.create({
	label: {
		fontFamily: typography.primary.medium,
		fontSize: 13
	},
	segment: {
		alignItems: 'center',
		borderRadius: 6,
		flex: 1,
		justifyContent: 'center',
		minHeight: 32
	},
	track: {
		borderRadius: 8,
		flexDirection: 'row',
		gap: 2,
		padding: 2
	}
});
