import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import LabelItem from './label-item';
import { dataColorChipOf } from '../../src/theme/data-color';
import { themeFor } from '../../src/theme/use-theme';

jest.mock('../../src/components/tinted-icon', () => {
	const { createElement } = jest.requireActual('react');
	const { View } = jest.requireActual('react-native');
	return {
		TintedIcon: ({ uri, color }: { uri: string; color: string }) =>
			createElement(View, { testID: 'chip-icon', uri, color })
	};
});
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

	it("draws the value's icon file in the chip's ink, so it shows on a dark chip too", async () => {
		await render(
			<LabelItem
				label="In Progress"
				background="#ece8fc"
				icon={undefined}
				iconUrl="https://example.com/in-progress.svg"
			/>
		);

		const icon = screen.getByTestId('chip-icon');
		expect(icon.props.uri).toBe('https://example.com/in-progress.svg');
		expect(icon.props.color).toBe(dataColorChipOf('#ece8fc', 'light')?.ink);
	});

	it('keeps a long label inside its card, shortened on one line', async () => {
		await render(<LabelItem label="Repaint the north pier maintenance hatch" background="#ffcc00" icon={undefined} />);

		expect(StyleSheet.flatten(screen.getByTestId('task-chip').props.style).maxWidth).toBe('100%');
		const name = screen.getByText('Repaint the north pier maintenance hatch');
		expect(StyleSheet.flatten(name.props.style).flexShrink).toBe(1);
		expect(name.props.numberOfLines).toBe(1);
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
