import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import LabelItem from './label-item';
import { dataColorChipOf } from '../../src/theme/data-color';
import { themeFor } from '../../src/theme/use-theme';

jest.mock('../theme', () => ({
	useWebTheme: () => jest.requireActual('../../src/theme/use-theme').themeFor('light')
}));

describe('a chip on a card', () => {
	it("draws the value with the web's chip of its API color", async () => {
		await render(<LabelItem label="Backlog" background="#ffcc00" icon={undefined} />);

		const chip = dataColorChipOf('#ffcc00', 'light');
		const container = StyleSheet.flatten(screen.getByTestId('task-chip').props.style);
		expect(container.backgroundColor).toBe(chip?.background);
		expect(container.borderColor).toBe(chip?.border);
		expect(container.borderRadius).toBe(8);
		expect(StyleSheet.flatten(screen.getByText('Backlog').props.style).color).toBe(chip?.ink);
	});

	it('keeps a readable neutral chip when the API color is missing', async () => {
		await render(<LabelItem label="Urgent" background="" icon={undefined} />);

		const container = StyleSheet.flatten(screen.getByTestId('task-chip').props.style);
		expect(container.backgroundColor).toBe(themeFor('light').colors.card);
		expect(StyleSheet.flatten(screen.getByText('Urgent').props.style).color).toBe(
			themeFor('light').colors['muted-foreground']
		);
	});
});
