import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { ListItemContent } from './invite-card-item';

// The card is read on its own: the shared components and the team hooks load the whole app
jest.mock('../../../../components', () => {
	const { View } = jest.requireActual('react-native');
	return { Card: View, ListItem: View };
});
jest.mock('../../../../services/hooks/use-organization', () => ({
	useOrganizationTeam: () => ({ isTeamManager: false })
}));
jest.mock('../../../../services/hooks/use-team-invitation', () => ({
	useTeamInvitations: () => ({ resendInvite: jest.fn(), removeSentInvitation: jest.fn() })
}));

const nadia = { id: 'invite-1', fullName: 'Nadia Osei', email: 'nadia.osei@example.com', status: 'INVITED' };

describe('the invitation card', () => {
	it('shows who is invited and where the invitation went', async () => {
		await render(<ListItemContent invite={nadia} />);

		expect(screen.getByText('Nadia Osei')).toBeTruthy();
		expect(screen.getByText('nadia.osei@example.com')).toBeTruthy();
	});

	it('keeps the address readable, since an invitation without a name has nothing else', async () => {
		await render(<ListItemContent invite={nadia} />);

		const email = screen.getByText('nadia.osei@example.com');
		const style = StyleSheet.flatten(email.props.style);
		expect(style.opacity).toBe(1);
		// the theme's main text color, the name's (about 15:1 against the light card), never the muted one
		expect(style.color).toBe(StyleSheet.flatten(screen.getByText('Nadia Osei').props.style).color);
	});

	it('marks the times and the estimate empty, never a value the invitation does not have', async () => {
		await render(<ListItemContent invite={nadia} />);

		// every text of the card: any time or task it made up would be one more
		const shown = screen.queryAllByText(/./).map((text) => String(text.props.children));
		expect(shown.sort()).toEqual(
			[
				'N',
				'Nadia Osei',
				'nadia.osei@example.com',
				'teamScreen.cardTotalTimeLabel undefined',
				'teamScreen.cardTodayWorkLabel undefined',
				'teamScreen.cardTotalWorkLabel undefined',
				'–',
				'–',
				'–',
				'–'
			].sort()
		);
	});
});
