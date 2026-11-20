import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { PropertyLabel } from './property-label';
import { themeFor } from '../../../../../src/theme/use-theme';

jest.mock('@expo/vector-icons', () => {
	const mockReact = jest.requireActual('react');
	const { Text: MockText } = jest.requireActual('react-native');
	return {
		Feather: ({ name, size, color }: { name: string; size: number; color: string }) =>
			mockReact.createElement(MockText, { testID: `icon-${name}`, style: { fontSize: size, color } }, name)
	};
});
jest.mock('../../../../theme', () => ({
	useWebTheme: () => jest.requireActual('../../../../../src/theme/use-theme').themeFor('dark')
}));

const dark = themeFor('dark');

describe("a property's label on the task page", () => {
	it('reads 13 in muted-foreground after a 16 icon of the same ink', async () => {
		await render(<PropertyLabel label="Status" icon="circle" />);

		expect(StyleSheet.flatten(screen.getByText('Status').props.style)).toMatchObject({
			color: dark.colors['muted-foreground'],
			fontSize: 13
		});
		expect(StyleSheet.flatten(screen.getByTestId('icon-circle').props.style)).toEqual({
			color: dark.colors['muted-foreground'],
			fontSize: 16
		});
	});

	it('keeps one line for a long label', async () => {
		await render(<PropertyLabel label="Days remaining before the due date" />);

		expect(screen.getByText('Days remaining before the due date').props.numberOfLines).toBe(1);
	});
});
