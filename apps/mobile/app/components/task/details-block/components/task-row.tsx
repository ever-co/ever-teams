/* eslint-disable react-native/no-inline-styles */
import { View, StyleSheet } from 'react-native';
import React from 'react';

/** The label column of a property row: the web's 6.75rem. */
export const PROPERTY_LABEL_WIDTH = 108;

interface ITaskRow {
	labelComponent: React.ReactNode;
	children: React.ReactNode;
	alignItems?: boolean;
}

const TaskRow = ({ labelComponent, children, alignItems }: ITaskRow) => {
	return (
		<View testID="task-row" style={[styles.container, { alignItems: alignItems ? 'center' : 'flex-start' }]}>
			<View style={styles.labelContainer}>{labelComponent}</View>
			<View style={styles.childrenContainer}>{children}</View>
		</View>
	);
};

export default TaskRow;

const styles = StyleSheet.create({
	// a one-line value sits in the middle of the row's 32, level with its label
	childrenContainer: {
		flex: 1,
		gap: 7,
		justifyContent: 'center',
		minHeight: 32,
		minWidth: 0
	},
	container: {
		flexDirection: 'row',
		gap: 8,
		minHeight: 32
	},
	labelContainer: {
		width: PROPERTY_LABEL_WIDTH
	}
});
