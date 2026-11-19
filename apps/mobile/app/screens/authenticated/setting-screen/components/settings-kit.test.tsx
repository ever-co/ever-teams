import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { SettingsRow, SettingsSection, SettingsSurface } from './settings-kit';
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
