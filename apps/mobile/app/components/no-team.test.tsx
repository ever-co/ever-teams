import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import NoTeam from './no-team';
import { themeFor } from '../../src/theme/use-theme';

let mockScheme: 'light' | 'dark' = 'light';
jest.mock('../theme', () => ({
	...jest.requireActual('../theme/typography'),
	useWebTheme: () => jest.requireActual('../../src/theme/use-theme').themeFor(mockScheme)
}));
jest.mock('../../src/components/icons', () => jest.requireActual('../../test/icons-stand-in').iconsStandIn());

describe('the page of a person without a team', () => {
	it('reads as the web: the heading, one line, and Create new team, which opens the team form', async () => {
		const onPress = jest.fn();
		await render(<NoTeam onPress={onPress} />);

		expect(screen.getByRole('header', { name: 'noTeamScreen.createYourTeam undefined' })).toBeTruthy();
		expect(screen.getByText('noTeamScreen.hintMessage undefined')).toBeTruthy();

		await fireEvent.press(screen.getByRole('button', { name: 'teamScreen.createNewTeamButton undefined' }));
		expect(onPress).toHaveBeenCalledTimes(1);
	});

	it("draws its glyph in the web's brand ink, and in the primary's ink for dark pages in dark mode", async () => {
		await render(<NoTeam onPress={jest.fn()} />);
		expect(screen.getByTestId('icon-Users')).toHaveStyle({ color: '#3826A6' });

		mockScheme = 'dark';
		await render(<NoTeam onPress={jest.fn()} />);
		expect(screen.getByTestId('icon-Users')).toHaveStyle({ color: themeFor('dark').colors['primary-ink'] });
		mockScheme = 'light';
	});
});
