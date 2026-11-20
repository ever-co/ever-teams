import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';
import { PickerCreateFooter, PropertyPicker, PickerOption } from './property-picker';
import { themeFor } from '../../src/theme/use-theme';

jest.mock('@expo/vector-icons', () => {
	const mockReact = jest.requireActual('react');
	const { Text: MockText } = jest.requireActual('react-native');
	const mockIcon = ({ name, color }: { name: string; color: string }) =>
		mockReact.createElement(MockText, { testID: `icon-${name}`, style: { color } }, name);
	return { Feather: mockIcon, Ionicons: mockIcon };
});
jest.mock('../theme', () => ({
	...jest.requireActual('../theme/typography'),
	useWebTheme: () => jest.requireActual('../../src/theme/use-theme').themeFor('dark')
}));

const dark = themeFor('dark');

function optionsHolding(selectedKey: string): PickerOption[] {
	return ['open', 'in-progress', 'blocked'].map((key) => ({
		key,
		name: key,
		color: '#D4EFDF',
		isSelected: key === selectedKey
	}));
}

async function renderPicker(overrides: Partial<React.ComponentProps<typeof PropertyPicker>> = {}) {
	const onSelect = jest.fn();
	const onDismiss = jest.fn();
	await render(
		<PropertyPicker
			visible
			onDismiss={onDismiss}
			title="Statuses"
			options={optionsHolding('in-progress')}
			onSelect={onSelect}
			{...overrides}
		/>
	);
	return { onSelect, onDismiss };
}

describe('a property picker', () => {
	it("opens in the web's dialog over a quiet overlay", async () => {
		await renderPicker();

		expect(StyleSheet.flatten(screen.getByTestId('picker-dialog').props.style)).toMatchObject({
			backgroundColor: dark.colors.card,
			borderRadius: 18
		});
		expect(StyleSheet.flatten(screen.getByTestId('picker-overlay').props.style).backgroundColor).toBe(
			'rgba(0, 0, 0, 0.4)'
		);
	});

	it('draws each value as its chip and checks only the one the task holds, in primary', async () => {
		await renderPicker();

		expect(screen.getAllByTestId('task-chip')).toHaveLength(3);
		const checks = screen.getAllByTestId('icon-check');
		expect(checks).toHaveLength(1);
		expect(StyleSheet.flatten(checks[0].props.style).color).toBe(dark.colors.primary);
		expect(screen.getByLabelText('in-progress').props.accessibilityState).toMatchObject({ selected: true });
	});

	it('picks a value with a tap on its row', async () => {
		const { onSelect } = await renderPicker();

		await fireEvent.press(screen.getByLabelText('blocked'));

		expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ key: 'blocked' }));
	});

	it('closes with a tap outside the dialog, and not with a tap inside it', async () => {
		const { onDismiss } = await renderPicker();

		await fireEvent.press(screen.getByTestId('picker-dialog'));
		expect(onDismiss).not.toHaveBeenCalled();

		await fireEvent.press(screen.getByTestId('picker-overlay'));
		expect(onDismiss).toHaveBeenCalledTimes(1);
	});

	it('shows its content in place of the list, such as the create form', async () => {
		await renderPicker({ children: <Text>status form</Text> });

		expect(screen.getByText('status form')).toBeTruthy();
		expect(screen.queryByText('Statuses')).toBeNull();
		expect(screen.queryAllByTestId('picker-option')).toHaveLength(0);
	});

	it('offers create under the values, read-only with its hint for someone who may not create', async () => {
		const onPress = jest.fn();
		const { rerender } = await render(
			<PickerCreateFooter
				label="Create new status"
				canCreate={false}
				readOnlyHint="Only managers"
				onPress={onPress}
			/>
		);

		await fireEvent.press(screen.getByLabelText('Create new status'));
		expect(onPress).not.toHaveBeenCalled();
		expect(screen.getByText('Only managers')).toBeTruthy();

		await rerender(
			<PickerCreateFooter label="Create new status" canCreate readOnlyHint="Only managers" onPress={onPress} />
		);
		await fireEvent.press(screen.getByLabelText('Create new status'));
		expect(onPress).toHaveBeenCalledTimes(1);
		expect(screen.queryByText('Only managers')).toBeNull();
	});
});
