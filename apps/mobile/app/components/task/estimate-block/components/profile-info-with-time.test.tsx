import React from 'react';
import { render, screen } from '@testing-library/react-native';
import ProfileInfoWithTime from './profile-info-with-time';

jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({}) }));
jest.mock('../../../../navigators/routes', () => ({ navigateTo: jest.fn() }));
jest.mock('../../../../theme', () => ({
	...jest.requireActual('../../../../theme/typography'),
	useAppTheme: () => ({ colors: { primary: '#282048' } })
}));
jest.mock('react-native-paper', () => {
	const mockReact = jest.requireActual('react');
	const { View: MockView } = jest.requireActual('react-native');
	const avatar = () => mockReact.createElement(MockView);
	return { Avatar: { Image: avatar, Text: avatar } };
});

describe("a member's line with time on the task page", () => {
	it('shows no time when it is given none, never a made-up one', async () => {
		await render(<ProfileInfoWithTime names="Kofi Arden" profilePicSrc="" userId="user-1" />);

		expect(screen.queryByText(/6 h: 40 m/)).toBeNull();
		expect(screen.getByText('Kofi Arden')).toBeTruthy();
	});

	it('shows the time it is given', async () => {
		await render(<ProfileInfoWithTime names="Kofi Arden" profilePicSrc="" userId="user-1" time="2h : 15m" />);

		expect(screen.getByText('2h : 15m')).toBeTruthy();
	});

	it('renders the member alone for an empty time, never a bare string outside a Text', async () => {
		await render(<ProfileInfoWithTime names="Kofi Arden" profilePicSrc="" userId="user-1" time="" />);

		expect(screen.getByText('Kofi Arden')).toBeTruthy();
	});
});
