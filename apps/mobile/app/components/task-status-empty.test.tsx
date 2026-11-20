import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { EmptyStatus } from './task-status-empty';

// The placeholder as a plain view carrying its kind, color and size, so a test reads what the chip chose to draw
jest.mock('../../src/components/task-property-icon', () => {
	const { createElement } = jest.requireActual('react');
	const { View } = jest.requireActual('react-native');
	return {
		TaskPropertyPlaceholderIcon: ({ kind, color, size }: { kind: string; color: string; size: number }) =>
			createElement(View, { testID: `property-placeholder-${kind}`, color, size })
	};
});
jest.mock('../theme', () => jest.requireActual('../theme/typography'));

const NAME = 'settingScreen.statusScreen.statuses undefined';

describe('a status chip without a status', () => {
	it("draws the web's dashed ring next to its name on the task page", async () => {
		await render(<EmptyStatus iconsOnly={false} ink="#5c5c66" faintInk="#e5e5e5" />);

		expect(screen.getByTestId('property-placeholder-status').props).toMatchObject({ color: '#5c5c66', size: 12 });
		expect(screen.getByText(NAME)).toBeTruthy();
	});

	it('draws the ring alone, in the faint ink, where only icons show', async () => {
		await render(<EmptyStatus iconsOnly ink="#5c5c66" faintInk="#e5e5e5" />);

		expect(screen.getByTestId('property-placeholder-status').props).toMatchObject({ color: '#e5e5e5', size: 14 });
		expect(screen.queryByText(NAME)).toBeNull();
	});

	it('draws the name alone where only the label shows', async () => {
		await render(<EmptyStatus iconsOnly={false} labelOnly ink="#5c5c66" faintInk="#e5e5e5" />);

		expect(screen.queryByTestId('property-placeholder-status')).toBeNull();
		expect(screen.getByText(NAME)).toBeTruthy();
	});
});
