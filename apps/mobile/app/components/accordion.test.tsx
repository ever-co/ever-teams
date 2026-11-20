import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';
import Accordion from './accordion';
import { themeFor } from '../../src/theme/use-theme';

jest.mock('../theme', () => ({
	...jest.requireActual('../theme/typography'),
	useWebTheme: () => jest.requireActual('../../src/theme/use-theme').themeFor('dark')
}));

const dark = themeFor('dark');

describe('a section of the task screen', () => {
	it("sits on the web's surface, radius 14 inside a hairline, its title in the foreground", async () => {
		await render(
			<Accordion title="Details">
				<Text>Creator</Text>
			</Accordion>
		);

		const surface = StyleSheet.flatten(screen.getByTestId('accordion').props.style);
		expect(surface.borderRadius).toBe(14);
		expect(surface.backgroundColor).toBe(dark.colors.card);
		expect(StyleSheet.flatten(screen.getByText('Details').props.style).color).toBe(dark.colors.foreground);
	});

	it('draws the line under its open header as a hairline in the border color', async () => {
		await render(
			<Accordion title="Description">
				<Text>Write a complete description</Text>
			</Accordion>
		);

		const divider = StyleSheet.flatten(screen.getByTestId('accordion-divider').props.style);
		expect(divider.backgroundColor).toBe(dark.colors.border);
		expect(divider.height).toBe(StyleSheet.hairlineWidth);
	});

	it('draws no surface of its own inside another section', async () => {
		await render(
			<Accordion title="Child Issues" nested>
				<Text>Repaint maintenance hatch</Text>
			</Accordion>
		);

		expect(StyleSheet.flatten(screen.getByTestId('accordion').props.style).borderRadius).toBeUndefined();
	});

	it('folds and unfolds from its header', async () => {
		await render(
			<Accordion title="Estimate">
				<Text>2h</Text>
			</Accordion>
		);

		await fireEvent.press(screen.getByText('Estimate'));

		expect(screen.queryByText('2h')).toBeNull();
		expect(screen.queryByTestId('accordion-divider')).toBeNull();
	});
});
