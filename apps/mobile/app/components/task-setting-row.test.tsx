import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import TaskSettingRow from './task-setting-row';
import { taskSettingsReadOnlyHint } from '../services/hooks/features/task-settings-read-only';
import { themeFor } from '../../src/theme/use-theme';

// The row's icons as their names, with the color they were given
jest.mock('../../src/components/icons', () => jest.requireActual('../../test/icons-stand-in').iconsStandIn());
jest.mock('../../src/components/menu-anchor', () =>
	jest.requireActual('../../test/menu-anchor-stand-in').menuAnchorStandIn()
);
jest.mock('../i18n', () => ({
	translate: (key: string, params?: { name?: string }) => {
		const texts: Record<string, string> = {
			'common.edit': 'Edit',
			'settingScreen.membersSettingsScreen.delete': 'Delete',
			'settingScreen.teamSection.taskSettingsReadOnly': 'Only team managers can change these settings.',
			'taskMenus.rowActions': `Actions for ${params?.name}`
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
	it("draws the web's row: the setting's glyph and name, 40 tall, with no box of its own", async () => {
		await render(
			<TaskSettingRow kind="status" name="In Review" color="#D4EFDF" onEdit={jest.fn()} onDelete={jest.fn()} />
		);

		expect(screen.getByTestId('property-icon-status')).toBeTruthy();
		expect(screen.getByText('In Review')).toHaveStyle({ color: dark.colors.foreground, fontSize: 13 });
		const row = StyleSheet.flatten(screen.getByTestId('task-setting-row').props.style);
		expect(row.borderWidth).toBeUndefined();
		expect(row.minHeight).toBe(40);
	});

	it('shows the name as it is given, hyphens and capitals kept', async () => {
		await render(<TaskSettingRow kind="label" name="API-v2" onEdit={jest.fn()} onDelete={jest.fn()} />);

		expect(screen.getByText('API-v2')).toBeTruthy();
	});

	it('draws delete in destructive-ink, never in a fixed orange', async () => {
		await render(
			<TaskSettingRow kind="priority" name="high" color="#F5B8B8" onEdit={jest.fn()} onDelete={jest.fn()} />
		);

		await fireEvent.press(screen.getByLabelText('Actions for high'));

		expect(screen.getByTestId('icon-Trash')).toHaveStyle({ color: dark.colors['destructive-ink'] });
		expect(screen.getByText('Delete')).toHaveStyle({ color: dark.colors['destructive-ink'] });
	});

	it('edits and deletes from its menu, and does neither on a read-only row', async () => {
		const edit = jest.fn();
		const remove = jest.fn();
		const { rerender } = await render(<TaskSettingRow kind="size" name="large" onEdit={edit} onDelete={remove} />);

		await fireEvent.press(screen.getByLabelText('Actions for large'));
		await fireEvent.press(screen.getByLabelText('Edit'));
		await fireEvent.press(screen.getByLabelText('Actions for large'));
		await fireEvent.press(screen.getByLabelText('Delete'));
		expect(edit).toHaveBeenCalledTimes(1);
		expect(remove).toHaveBeenCalledTimes(1);

		await rerender(<TaskSettingRow kind="size" name="large" onEdit={edit} onDelete={remove} readOnly />);
		await fireEvent.press(screen.getByLabelText('Actions for large'));
		await fireEvent.press(screen.getByLabelText('Edit'));
		expect(edit).toHaveBeenCalledTimes(1);
		expect(screen.getByLabelText('Edit')).toBeDisabled();
		expect(screen.getByText(taskSettingsReadOnlyHint())).toBeTruthy();
	});

	it('names its menu with the setting it acts on, for a screen reader', async () => {
		await render(<TaskSettingRow kind="status" name="Backlog" onEdit={jest.fn()} onDelete={jest.fn()} />);

		expect(screen.getByLabelText('Actions for Backlog')).toBeTruthy();
	});
});
