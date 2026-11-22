import React, { type ReactNode } from 'react';
import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';

/** A chip's name: one line that gives way to the chip's chevron, ending with an ellipsis when it does not fit. */
export function ChipLabel({ style, children }: Readonly<{ style?: StyleProp<TextStyle>; children: ReactNode }>) {
	return (
		<Text numberOfLines={1} style={[styles.label, style]}>
			{children}
		</Text>
	);
}

const styles = StyleSheet.create({
	label: {
		flexShrink: 1
	}
});
