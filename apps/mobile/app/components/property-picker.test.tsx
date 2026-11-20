import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';
import { PickerCreateFooter, PropertyPicker, PickerOption } from './property-picker';
import { themeFor } from '../../src/theme/use-theme';

jest.mock('../../src/components/icons', () => jest.requireActual('../../test/icons-stand-in').iconsStandIn());
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
		const checks = screen.getAllByTestId('icon-Check');
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

	it("closes with VoiceOver's escape", async () => {
		const { onDismiss } = await renderPicker();

		await fireEvent(screen.getByTestId('picker-overlay'), 'accessibilityEscape');

		expect(onDismiss).toHaveBeenCalledTimes(1);
	});

	it('keeps the overlay and the dialog out of the accessibility tree, so a screen reader reaches each row', async () => {
		await renderPicker();

		expect(screen.getByTestId('picker-overlay').props.accessible).toBe(false);
		expect(screen.getByTestId('picker-dialog').props.accessible).toBe(false);
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

describe('a property picker opened from a chip', () => {
	const chip = { x: 16, y: 300, width: 120, height: 30 };

	it("shows the values in the web's menu under the chip, with its search line", async () => {
		await renderPicker({ anchor: chip, searchPlaceholder: 'Change status…' });

		expect(screen.getByTestId('property-menu')).toBeTruthy();
		expect(screen.getByPlaceholderText('Change status…')).toBeTruthy();
		expect(screen.getAllByTestId('menu-option')).toHaveLength(3);
		expect(screen.queryByTestId('picker-dialog')).toBeNull();
	});

	it('hands the picked value over from the menu', async () => {
		const { onSelect } = await renderPicker({ anchor: chip });

		await fireEvent.press(screen.getByLabelText('blocked'));

		expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ key: 'blocked' }));
	});

	it('shows a form in the dialog, even when opened from a chip', async () => {
		await renderPicker({ anchor: chip, children: <Text>status form</Text> });

		expect(screen.getByTestId('picker-dialog')).toBeTruthy();
		expect(screen.queryByTestId('property-menu')).toBeNull();
	});
});
