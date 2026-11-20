import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { EmptyStatus } from './task-status-empty';

jest.mock('../../src/components/icons', () => jest.requireActual('../../test/icons-stand-in').iconsStandIn());
jest.mock('../theme', () => ({
	...jest.requireActual('../theme/typography'),
	useWebTheme: () => jest.requireActual('../../src/theme/use-theme').themeFor('light')
}));

describe('a status chip without a status', () => {
	it("draws the web's dashed ring next to its name on the task page", async () => {
		await render(<EmptyStatus iconsOnly={false} ink="#5c5c66" faintInk="#e5e5e5" />);

		expect(screen.getByTestId('property-placeholder-status')).toBeTruthy();
		expect(screen.getByText('settingScreen.statusScreen.statuses undefined')).toBeTruthy();
	});

	it('draws the ring alone where only icons show', async () => {
		await render(<EmptyStatus iconsOnly ink="#5c5c66" faintInk="#e5e5e5" />);

		expect(screen.getByTestId('property-placeholder-status')).toBeTruthy();
		expect(screen.queryByText('settingScreen.statusScreen.statuses undefined')).toBeNull();
	});
});
