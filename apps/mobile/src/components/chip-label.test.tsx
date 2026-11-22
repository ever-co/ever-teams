import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { ChipLabel } from './chip-label';

describe("a chip's name", () => {
	// At 200 % the size and priority chips cut their name mid-word ("Mediu") or broke it over two lines ("Prioriti / es")
	it('stays on one line and gives way, so a name too long for its chip ends with an ellipsis', async () => {
		await render(<ChipLabel style={{ fontSize: 10 }}>Priorities</ChipLabel>);

		const label = screen.getByText('Priorities');
		expect(label.props.numberOfLines).toBe(1);
		expect(StyleSheet.flatten(label.props.style)).toMatchObject({ flexShrink: 1, fontSize: 10 });
	});
});
