import React, { type ComponentProps } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';

type IconButtonProps = {
	testID: string;
	icon: ComponentProps<typeof Feather>['name'];
	/** The action's name for screen readers: the icon alone says nothing. */
	label: string;
	color: string;
	onPress: () => void;
};

/** A quiet icon button: the icon alone, in a 36 square that a tap tints. */
const IconButton: React.FC<IconButtonProps> = ({ testID, icon, label, color, onPress }) => {
	return (
		<TouchableOpacity
			testID={testID}
			accessibilityRole="button"
			accessibilityLabel={label}
			onPress={onPress}
			style={styles.iconButton}
		>
			<Feather name={icon} size={18} color={color} />
		</TouchableOpacity>
	);
};

export default IconButton;

const styles = StyleSheet.create({
	iconButton: {
		alignItems: 'center',
		borderRadius: 8,
		height: 36,
		justifyContent: 'center',
		width: 36
	}
});
