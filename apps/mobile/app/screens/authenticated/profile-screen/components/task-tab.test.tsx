import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import TaskTab, { countChipColorsOf } from './task-tab';
import { themeFor } from '../../../../../src/theme/use-theme';

jest.mock('../../../../theme', () => ({
	...jest.requireActual('../../../../theme/typography'),
	useWebTheme: () => jest.requireActual('../../../../../src/theme/use-theme').themeFor('dark')
}));

describe("a tab of a person's tasks", () => {
	it('draws the count as a quiet chip, the same way in both themes', () => {
		const dark = themeFor('dark');

		expect(countChipColorsOf(false, dark)).toEqual({
			backgroundColor: dark.colors.muted,
			color: dark.colors['muted-foreground']
		});
		expect(countChipColorsOf(true, dark).color).toBe(dark.colors['primary-ink']);
	});

	it('underlines the selected tab in primary-ink and still selects on a tap', async () => {
		const select = jest.fn();
		await render(<TaskTab setSelectedTab={select} isSelected tabTitle="Worked" countTasks={12} />);

		expect(StyleSheet.flatten(screen.getByTestId('task-tab').props.style).borderBottomColor).toBe(
			themeFor('dark').colors['primary-ink']
		);
		expect(StyleSheet.flatten(screen.getByTestId('task-tab-count').props.style).minWidth).toBe(18);

		await fireEvent.press(screen.getByText('Worked'));

		expect(select).toHaveBeenCalledTimes(1);
	});
});
