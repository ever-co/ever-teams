import React, { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useWebTheme } from '../../../../theme';

const ICON_SIZE = 16;

interface IPropertyLabel {
	label: string;
	icon?: ComponentProps<typeof Feather>['name'];
}

/** A property's label on the task page: a 16 icon and a 13 label in muted-foreground, as the web's property rows. */
export function PropertyLabel({ label, icon }: Readonly<IPropertyLabel>) {
	const theme = useWebTheme();
	const ink = theme.colors['muted-foreground'];

	return (
		<View style={styles.label}>
			{/* the icon only decorates: a screen reader reads the label alone, not the icon font's glyph */}
			<View style={styles.icon} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
				{icon && <Feather name={icon} size={ICON_SIZE} color={ink} />}
			</View>
			<Text numberOfLines={2} style={[styles.text, { color: ink }]}>
				{label}
			</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	// a row without an icon keeps the slot, so every label starts at the same place
	icon: {
		alignItems: 'center',
		width: ICON_SIZE
	},
	label: {
		alignItems: 'center',
		flexDirection: 'row',
		gap: 8,
		minHeight: 32
	},
	text: {
		flexShrink: 1,
		fontSize: 13
	}
});
