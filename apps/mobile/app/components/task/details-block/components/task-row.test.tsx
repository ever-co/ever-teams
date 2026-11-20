import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';
import TaskRow from './task-row';

describe('a property row of the task page', () => {
	it('puts its label in a 108 column and gives the value the rest of the row', async () => {
		await render(
			<TaskRow labelComponent={<Text>Status</Text>}>
				<Text>In Progress</Text>
			</TaskRow>
		);

		const row = screen.getByTestId('task-row');
		const [label, value] = row.props.children;
		expect(StyleSheet.flatten(row.props.style)).toMatchObject({ flexDirection: 'row', gap: 8, minHeight: 32 });
		expect(StyleSheet.flatten(label.props.style).width).toBe(108);
		expect(StyleSheet.flatten(value.props.style)).toMatchObject({
			flex: 1,
			justifyContent: 'center',
			minHeight: 32,
			minWidth: 0
		});
	});
});
