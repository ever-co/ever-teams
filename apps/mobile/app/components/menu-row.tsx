import React from 'react';
import { StyleSheet, Text, TouchableOpacity, type ViewStyle } from 'react-native';
import type { IconComponent } from '../../src/components/icons';
import { typography, useWebTheme } from '../theme';
import { hsl, webColorTokens } from '../../src/theme/tokens';
import type { Theme } from '../../src/theme/use-theme';

const ICON_SIZE = 20;
const IDLE_ICON_ALPHA = 0.55;

export type MenuRowTone = 'default' | 'danger';

type MenuRowLook = { row: ViewStyle; iconColor: string; labelColor: string };

/** The web's navigation row: the current screen's on the accent, an idle icon at 55%, Log out in destructive-ink. */
export function menuRowLookOf(isCurrent: boolean, tone: MenuRowTone, theme: Theme): MenuRowLook {
	if (tone === 'danger') {
		const ink = theme.colors['destructive-ink'];
		return { row: {}, iconColor: ink, labelColor: ink };
	}
	if (isCurrent) {
		return {
			row: { backgroundColor: theme.colors.accent },
			iconColor: theme.colors.foreground,
			labelColor: theme.colors.foreground
		};
	}
	return {
		row: {},
		iconColor: hsl(webColorTokens[theme.scheme].foreground, IDLE_ICON_ALPHA),
		labelColor: theme.colors.foreground
	};
}

type MenuRowProps = {
	testID: string;
	icon: IconComponent;
	label: string;
	isCurrent?: boolean;
	tone?: MenuRowTone;
	onPress: () => unknown;
};

/** A 48-tall row of the menu. */
export function MenuRow({
	testID,
	icon: Icon,
	label,
	isCurrent = false,
	tone = 'default',
	onPress
}: Readonly<MenuRowProps>) {
	const theme = useWebTheme();
	const look = menuRowLookOf(isCurrent, tone, theme);
	return (
		<TouchableOpacity
			testID={testID}
			accessibilityRole="button"
			accessibilityState={{ selected: isCurrent }}
			style={[styles.row, look.row]}
			onPress={() => onPress()}
		>
			<Icon size={ICON_SIZE} color={look.iconColor} />
			<Text style={[styles.label, { color: look.labelColor }]}>{label}</Text>
		</TouchableOpacity>
	);
}

const styles = StyleSheet.create({
	label: {
		fontFamily: typography.primary.medium,
		fontSize: 15
	},
	row: {
		alignItems: 'center',
		borderRadius: 8,
		flexDirection: 'row',
		gap: 12,
		minHeight: 48,
		paddingHorizontal: 12
	}
});
