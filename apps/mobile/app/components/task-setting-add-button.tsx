import React from 'react';
import { StyleProp, StyleSheet, Text, TextStyle, TouchableOpacity, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useWebTheme } from '../theme';

interface ITaskSettingAddButton {
	label: string;
	onPress: () => unknown;
	iconSize: number;
	/** The button's size and place on its screen. */
	style: StyleProp<ViewStyle>;
	textStyle: StyleProp<TextStyle>;
	disabled?: boolean;
}

/** Add a status, priority, size, label or version: a primary pill, its border clear so a disabled one fades evenly. */
export function TaskSettingAddButton({
	label,
	onPress,
	iconSize,
	style,
	textStyle,
	disabled = false
}: ITaskSettingAddButton) {
	const theme = useWebTheme();
	const ink = theme.colors['primary-foreground'];

	return (
		<TouchableOpacity
			accessibilityLabel={label}
			accessibilityRole="button"
			disabled={disabled}
			style={[style, styles.pill, { backgroundColor: theme.colors.primary }]}
			onPress={onPress}
		>
			<Ionicons name="add" size={iconSize} color={ink} />
			<Text style={[textStyle, { color: ink }]}>{label}</Text>
		</TouchableOpacity>
	);
}

const styles = StyleSheet.create({
	pill: {
		borderColor: 'transparent',
		borderRadius: 999
	}
});
