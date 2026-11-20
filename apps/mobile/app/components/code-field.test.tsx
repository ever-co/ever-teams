import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { CodeInputField } from './code-field';
import { themeFor } from '../../src/theme/use-theme';

jest.mock('../theme', () => ({
	typography: { primary: { medium: 'medium' } },
	useWebTheme: () => jest.requireActual('../../src/theme/use-theme').themeFor('dark')
}));

const dark = themeFor('dark');

describe('the emailed code field', () => {
	it('draws one slot per character on the control recipe, 40 tall in the input border', async () => {
		await render(<CodeInputField editable onChange={jest.fn()} />);

		const slots = screen.getAllByTestId(/^emailed-code-slot-/).map((slot) => StyleSheet.flatten(slot.props.style));

		expect(slots).toHaveLength(8);
		expect(slots.every((slot) => slot.height === 40)).toBe(true);
		const idle = slots.filter((style) => style.borderColor === dark.colors.input);
		expect(idle.length).toBeGreaterThanOrEqual(7);
		expect(idle[0]).toMatchObject({ borderRadius: 8, borderWidth: 1, color: dark.colors.foreground });
	});
});
