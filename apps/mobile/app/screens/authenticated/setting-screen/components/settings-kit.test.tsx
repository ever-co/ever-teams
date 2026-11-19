import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';
import { SettingsImageRow, SettingsRow, SettingsSection, SettingsSurface } from './settings-kit';
import { themeFor } from '../../../../../src/theme/use-theme';

jest.mock('../../../../components/toggle', () => {
	const { Pressable } = jest.requireActual('react-native');
	return {
		Toggle: ({ value, onPress }: { value: boolean; onPress?: () => void }) => (
			<Pressable testID="settings-switch" accessibilityState={{ checked: value }} onPress={onPress} />
		)
	};
});

jest.mock('../../../../theme', () => ({
	...jest.requireActual('../../../../theme/typography'),
	useWebTheme: () => jest.requireActual('../../../../../src/theme/use-theme').themeFor('dark')
}));

const dark = themeFor('dark');

describe('the settings rows', () => {
	it('puts one hairline between two rows, and none for a row that is not drawn', async () => {
		const isManager = false;
		await render(
			<SettingsSurface>
				<SettingsRow label="Team Name" />
				{isManager && <SettingsRow label="Team Type" />}
				<SettingsRow label="Task Versions" />
			</SettingsSurface>
		);

		expect(screen.getAllByTestId('settings-divider')).toHaveLength(1);
		expect(StyleSheet.flatten(screen.getByTestId('settings-surface').props.style).borderRadius).toBe(14);
	});

	it('titles the danger zone in destructive-ink', async () => {
		await render(
			<SettingsSection title="Danger Zone" tone="danger">
				<SettingsRow label="Remove Account" />
			</SettingsSection>
		);

		expect(StyleSheet.flatten(screen.getByText('Danger Zone').props.style).color).toBe(
			dark.colors['destructive-ink']
		);
	});

	it('opens from a tap anywhere on the row, at least 56 tall', async () => {
		const open = jest.fn();
		await render(<SettingsRow testID="row" label="Full Name" description="Kofi Arden" onPress={open} chevron />);

		await fireEvent.press(screen.getByText('Kofi Arden'));

		expect(open).toHaveBeenCalledTimes(1);
		expect(StyleSheet.flatten(screen.getByTestId('row').props.style).minHeight).toBe(56);
	});

	it('does nothing on a tap while disabled, and dims its chevron', async () => {
		const open = jest.fn();
		await render(<SettingsRow label="Remove Team" onPress={open} disabled chevron />);

		await fireEvent.press(screen.getByText('Remove Team'));

		expect(open).not.toHaveBeenCalled();
		expect(StyleSheet.flatten(screen.getByTestId('settings-row-chevron').props.style).opacity).toBe(0.5);
	});
});

describe('the avatar or logo row', () => {
	it('opens the picker from Change, and deletes nothing while there is no image', async () => {
		const change = jest.fn();
		const remove = jest.fn();
		await render(
			<SettingsImageRow
				image={null}
				changeLabel="Change Avatar"
				onChange={change}
				deleteLabel="Delete"
				deleteDisabled
				onDelete={remove}
			/>
		);

		await fireEvent.press(screen.getByText('Change Avatar'));
		await fireEvent.press(screen.getByLabelText('Delete'));

		expect(change).toHaveBeenCalledTimes(1);
		expect(remove).not.toHaveBeenCalled();
	});

	it('draws the delete in destructive-ink, never on a grey tile', async () => {
		await render(
			<SettingsImageRow
				image={null}
				changeLabel="Change Logo"
				onChange={jest.fn()}
				deleteLabel="Delete"
				deleteDisabled={false}
				onDelete={jest.fn()}
			/>
		);

		expect(
			StyleSheet.flatten(screen.getByTestId('settings-image-delete').props.style).backgroundColor
		).toBeUndefined();
	});
});

describe('a settings row for screen readers', () => {
	it('keeps its trailing control outside its button, so Detect is reached on its own', async () => {
		await render(
			<SettingsRow label="Time Zone" onPress={jest.fn()} chevron trailing={<Text testID="detect">Detect</Text>} />
		);

		const rowAction = screen.getByTestId('settings-row-action');
		let node = screen.getByTestId('detect').parent;
		while (node) {
			expect(node).not.toBe(rowAction);
			node = node.parent;
		}
	});

	it('is no button without an action, so its switch is reached on its own', async () => {
		await render(<SettingsRow label="Team Type" description="Private" trailing={null} />);

		expect(screen.getByTestId('settings-row-action').props.accessible).toBe(false);
	});
});
