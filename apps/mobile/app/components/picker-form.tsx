import React, { ReactNode } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

/**
 * A form a picker's dialog shows in place of its values. The create forms are 452 high, more than the dialog's 75% on
 * a short screen: they scroll inside the dialog, so their buttons stay within reach.
 */
export function PickerForm({ children }: Readonly<{ children: ReactNode }>) {
	return (
		<ScrollView testID="picker-form" style={styles.form} keyboardShouldPersistTaps="handled">
			{children}
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	form: {
		flexGrow: 0,
		flexShrink: 1
	}
});
