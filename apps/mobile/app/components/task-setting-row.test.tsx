import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import TaskSettingRow from './task-setting-row';
import { themeFor } from '../../src/theme/use-theme';

// Each icon as the text it renders, labelled with its glyph; `disabled` is dropped so only a withheld handler stops a press
jest.mock('@expo/vector-icons', () => {
	const mockReact = jest.requireActual('react');
	const { Text: MockText } = jest.requireActual('react-native');
	const mockIcon = ({ name, disabled: _disabled, ...props }: { name: string; disabled?: boolean }) =>
		mockReact.createElement(MockText, { ...props, accessibilityLabel: name }, name);
	return { AntDesign: mockIcon, Ionicons: mockIcon };
});
jest.mock('../theme', () => ({
	...jest.requireActual('../theme/typography'),
	useWebTheme: () => jest.requireActual('../../src/theme/use-theme').themeFor('dark')
}));

const dark = themeFor('dark');

describe("a row of a team's task settings", () => {
	it("draws the setting as the web's chip, with no box of its own", async () => {
		await render(<TaskSettingRow name="in-review" color="#D4EFDF" onEdit={jest.fn()} onDelete={jest.fn()} />);

		expect(screen.getByTestId('task-chip')).toBeTruthy();
		expect(screen.getByText('In Review')).toBeTruthy();
		const row = StyleSheet.flatten(screen.getByTestId('task-setting-row').props.style);
		expect(row.borderWidth).toBeUndefined();
		expect(row.minHeight).toBe(56);
	});

	it('draws delete in destructive-ink, never in a fixed orange', async () => {
		await render(<TaskSettingRow name="high" color="#F5B8B8" onEdit={jest.fn()} onDelete={jest.fn()} />);

		expect(screen.getByLabelText('trash-outline').props.color).toBe(dark.colors['destructive-ink']);
	});

	it('edits and deletes, and does neither on a read-only row', async () => {
		const edit = jest.fn();
		const remove = jest.fn();
		const { rerender } = await render(<TaskSettingRow name="large" onEdit={edit} onDelete={remove} />);

		await fireEvent.press(screen.getByLabelText('edit'));
		await fireEvent.press(screen.getByLabelText('trash-outline'));
		expect(edit).toHaveBeenCalledTimes(1);
		expect(remove).toHaveBeenCalledTimes(1);

		await rerender(<TaskSettingRow name="large" onEdit={edit} onDelete={remove} readOnly />);
		await fireEvent.press(screen.getByLabelText('edit'));
		expect(edit).toHaveBeenCalledTimes(1);
		expect(screen.getByLabelText('edit')).toBeDisabled();
	});
});
