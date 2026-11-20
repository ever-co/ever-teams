import React, { type RefObject } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Plus } from '../../src/components/icons';
import { useWebTheme } from '../theme';

const GLYPH_SIZE = 14;
const VALUE_HEIGHT = 28;

interface IEmptyValueButton {
	label: string;
	onPress: () => unknown;
	/** Where the menu it opens is placed. */
	anchorRef?: RefObject<View | null>;
	testID?: string;
}

/** A task page field without a value, as the web reads it: a plus and the action in muted text, 28 high at least. */
export function EmptyValueButton({ label, onPress, anchorRef, testID }: Readonly<IEmptyValueButton>) {
	const theme = useWebTheme();
	const muted = theme.colors['muted-foreground'];
	return (
		<Pressable
			ref={anchorRef}
			testID={testID}
			accessibilityRole="button"
			accessibilityLabel={label}
			onPress={() => onPress()}
			style={styles.button}
		>
			<Plus size={GLYPH_SIZE} color={muted} />
			<Text style={[styles.label, { color: muted }]}>{label}</Text>
		</Pressable>
	);
}

const styles = StyleSheet.create({
	// a larger system font grows the button instead of clipping its label
	button: {
		alignItems: 'center',
		borderRadius: 6,
		flexDirection: 'row',
		gap: 6,
		marginLeft: -6,
		minHeight: VALUE_HEIGHT,
		paddingHorizontal: 6
	},
	label: {
		fontSize: 13
	}
});
