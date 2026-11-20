import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { TaskSettingAddButton } from './task-setting-add-button';
import { themeFor } from '../../src/theme/use-theme';

jest.mock('@expo/vector-icons', () => {
	const mockReact = jest.requireActual('react');
	const { Text: MockText } = jest.requireActual('react-native');
	return { Ionicons: ({ name }: { name: string }) => mockReact.createElement(MockText, null, `icon ${name}`) };
});
jest.mock('../theme', () => ({
	useWebTheme: () => jest.requireActual('../../src/theme/use-theme').themeFor('light')
}));

const light = themeFor('light');

describe('the Add button of a task settings list', () => {
	it('is a primary pill with a clear border, its label in primary-foreground', async () => {
		await render(
			<TaskSettingAddButton
				label="Create new status"
				iconSize={18}
				style={{ borderWidth: 2, padding: 6 }}
				textStyle={{ fontSize: 12 }}
				onPress={jest.fn()}
			/>
		);

		const pill = StyleSheet.flatten(screen.getByLabelText('Create new status').props.style);
		expect(pill).toMatchObject({
			backgroundColor: light.colors.primary,
			borderColor: 'transparent',
			borderRadius: 999,
			borderWidth: 2,
			padding: 6
		});
		expect(StyleSheet.flatten(screen.getByText('Create new status').props.style).color).toBe(
			light.colors['primary-foreground']
		);
	});

	it('adds, and does nothing while disabled', async () => {
		const onPress = jest.fn();
		const { rerender } = await render(
			<TaskSettingAddButton label="Add" iconSize={24} style={{}} textStyle={{}} onPress={onPress} />
		);

		await fireEvent.press(screen.getByLabelText('Add'));
		await rerender(
			<TaskSettingAddButton label="Add" iconSize={24} style={{}} textStyle={{}} onPress={onPress} disabled />
		);
		await fireEvent.press(screen.getByLabelText('Add'));

		expect(onPress).toHaveBeenCalledTimes(1);
	});
});
