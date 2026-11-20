import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import TaskSettingRow from './task-setting-row';
import { themeFor } from '../../src/theme/use-theme';

// The row's icons as their names, with the color they were given
jest.mock('../../src/components/icons', () => jest.requireActual('../../test/icons-stand-in').iconsStandIn());
jest.mock('../i18n', () => ({
	translate: (key: string) => {
		const texts: Record<string, string> = {
			'common.edit': 'Edit',
			'settingScreen.membersSettingsScreen.delete': 'Delete'
		};
		return texts[key] ?? key;
	}
}));
jest.mock('../theme', () => ({
	...jest.requireActual('../theme/typography'),
	useWebTheme: () => jest.requireActual('../../src/theme/use-theme').themeFor('dark')
}));

const dark = themeFor('dark');

describe("a row of a team's task settings", () => {
	it("draws the setting as the web's chip, with no box of its own", async () => {
		await render(<TaskSettingRow name="In Review" color="#D4EFDF" onEdit={jest.fn()} onDelete={jest.fn()} />);

		expect(screen.getByTestId('task-chip')).toBeTruthy();
		expect(screen.getByText('In Review')).toBeTruthy();
		const row = StyleSheet.flatten(screen.getByTestId('task-setting-row').props.style);
		expect(row.borderWidth).toBeUndefined();
		expect(row.minHeight).toBe(56);
	});

	it('shows the name as it is given, hyphens and capitals kept', async () => {
		await render(<TaskSettingRow name="API-v2" onEdit={jest.fn()} onDelete={jest.fn()} />);

		expect(screen.getByText('API-v2')).toBeTruthy();
	});

	it('draws delete in destructive-ink, never in a fixed orange', async () => {
		await render(<TaskSettingRow name="high" color="#F5B8B8" onEdit={jest.fn()} onDelete={jest.fn()} />);

		expect(StyleSheet.flatten(screen.getByTestId('icon-Trash').props.style).color).toBe(
			dark.colors['destructive-ink']
		);
	});

	it('edits and deletes, and does neither on a read-only row', async () => {
		const edit = jest.fn();
		const remove = jest.fn();
		const { rerender } = await render(<TaskSettingRow name="large" onEdit={edit} onDelete={remove} />);

		await fireEvent.press(screen.getByLabelText('Edit large'));
		await fireEvent.press(screen.getByLabelText('Delete large'));
		expect(edit).toHaveBeenCalledTimes(1);
		expect(remove).toHaveBeenCalledTimes(1);

		await rerender(<TaskSettingRow name="large" onEdit={edit} onDelete={remove} readOnly />);
		await fireEvent.press(screen.getByLabelText('Edit large'));
		expect(edit).toHaveBeenCalledTimes(1);
		expect(screen.getByLabelText('Edit large')).toBeDisabled();
	});

	it('names edit and delete with the setting they act on, for a screen reader', async () => {
		await render(<TaskSettingRow name="Backlog" onEdit={jest.fn()} onDelete={jest.fn()} />);

		expect(screen.getByLabelText('Edit Backlog')).toBeTruthy();
		expect(screen.getByLabelText('Delete Backlog')).toBeTruthy();
	});
});
