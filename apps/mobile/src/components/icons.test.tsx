import React from 'react';
import { render, screen } from '@testing-library/react-native';
import Tick02Icon from '@hugeicons/core-free-icons/Tick02Icon';
import { Check, Plus } from './icons';

// The icon as the props it draws with: the test reads the glyph, the stroke and the size the module passes
jest.mock('@hugeicons/react-native', () => {
	const mockReact = jest.requireActual('react');
	const { View: MockView } = jest.requireActual('react-native');
	return {
		HugeiconsIcon: (props: Record<string, unknown>) =>
			mockReact.createElement(MockView, { testID: 'icon', ...props })
	};
});

describe("the phone's icons", () => {
	it("draw the web's glyph for their name, at the web's stroke", async () => {
		await render(<Check size={16} color="#6355F2" />);

		const drawn = screen.getByTestId('icon').props;
		expect(drawn.icon).toBe(Tick02Icon);
		expect(drawn.strokeWidth).toBe(1.75);
		expect(drawn).toMatchObject({ size: 16, color: '#6355F2' });
	});

	it('let a screen thicken the stroke when it asks', async () => {
		await render(<Plus strokeWidth={2} />);

		expect(screen.getByTestId('icon').props.strokeWidth).toBe(2);
	});
});
