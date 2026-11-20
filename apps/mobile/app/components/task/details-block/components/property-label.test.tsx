import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { PropertyLabel } from './property-label';
import { Users } from '../../../../../src/components/icons';
import { themeFor } from '../../../../../src/theme/use-theme';

jest.mock('../../../../../src/components/icons', () =>
	jest.requireActual('../../../../../test/icons-stand-in').iconsStandIn()
);
// The placeholder as a plain view carrying its kind, color and size, so a test reads what the label chose to draw
jest.mock('../../../../../src/components/task-property-icon', () => {
	const { createElement } = jest.requireActual('react');
	const { View } = jest.requireActual('react-native');
	return {
		TaskPropertyPlaceholderIcon: ({ kind, color, size }: { kind: string; color: string; size: number }) =>
			createElement(View, { testID: `property-placeholder-${kind}`, color, size })
	};
});
jest.mock('../../../../theme', () => ({
	useWebTheme: () => jest.requireActual('../../../../../src/theme/use-theme').themeFor('dark')
}));

const dark = themeFor('dark');

describe("a property's label on the task page", () => {
	it('reads 13 in muted-foreground after a 16 icon of the same ink', async () => {
		await render(<PropertyLabel label="Assignees" icon={Users} />);

		expect(StyleSheet.flatten(screen.getByText('Assignees').props.style)).toMatchObject({
			color: dark.colors['muted-foreground'],
			fontSize: 13
		});
		expect(
			StyleSheet.flatten(screen.getByTestId('icon-Users', { includeHiddenElements: true }).props.style)
		).toEqual({
			color: dark.colors['muted-foreground'],
			fontSize: 16
		});
	});

	it('keeps its icon from a screen reader, which reads the label alone', async () => {
		await render(<PropertyLabel label="Assignees" icon={Users} />);

		expect(screen.queryByTestId('icon-Users')).toBeNull();
		expect(screen.getByTestId('icon-Users', { includeHiddenElements: true })).toBeTruthy();
		expect(screen.getByText('Assignees')).toBeTruthy();
	});

	it('wraps a long label on two lines rather than cutting it', async () => {
		await render(<PropertyLabel label="Total Group Time" />);

		expect(screen.getByText('Total Group Time').props.numberOfLines).toBe(2);
	});

	it("draws a property's placeholder glyph, as the web's property rows do", async () => {
		await render(<PropertyLabel label="Status" property="status" />);

		expect(screen.getByTestId('property-placeholder-status', { includeHiddenElements: true }).props).toMatchObject({
			color: dark.colors['muted-foreground'],
			size: 16
		});
	});
});
