import React from 'react';
import { render, screen, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import ProfileHeader from './profile-header';
import { themeFor } from '../../../../../src/theme/use-theme';
import type { IUser } from '../../../../services/interfaces/IUserData';

jest.mock('../../../../models', () => ({
	useStores: () => ({ teamStore: { activeTeam: { name: 'Field Crew North' } } })
}));
jest.mock('../../../../components/profile-image', () => () => null);
// the components index pulls files that do not load under the strict check; the header only takes Text from it
jest.mock('../../../../components', () => ({ Text: jest.requireActual('react-native').Text }));
jest.mock('../../../../theme', () => ({
	...jest.requireActual('../../../../theme/typography'),
	useAppTheme: () => ({ colors: { background: '#fff', primary: '#111', tertiary: '#666' }, dark: true }),
	useWebTheme: () => jest.requireActual('../../../../../src/theme/use-theme').themeFor('dark')
}));

const kofi = { name: 'Kofi Arden', email: 'kofi.arden@example.com' } as unknown as IUser;

describe("the identity band of a person's tasks", () => {
	it('writes the name in 20/600', async () => {
		await render(<ProfileHeader {...kofi} />);

		const name = StyleSheet.flatten(screen.getByText('Kofi Arden').props.style);
		expect(name.fontSize).toBe(20);
		expect(name.fontWeight).toBe('600');
	});

	it('keeps the team under the e-mail and the name and e-mail on one line each, so nothing runs past the band', async () => {
		await render(<ProfileHeader {...kofi} />);

		const identity = screen.getByTestId('profile-identity');
		expect(within(identity).getByTestId('profile-team')).toBeTruthy();
		expect(screen.getByText('Kofi Arden').props.numberOfLines).toBe(1);
		expect(screen.getByText('kofi.arden@example.com').props.numberOfLines).toBe(1);
		expect(StyleSheet.flatten(identity.props.style).flexShrink).toBe(1);
	});

	it('draws the team chip on the muted fill, so its text reads in dark mode too', async () => {
		await render(<ProfileHeader {...kofi} />);

		const dark = themeFor('dark').colors;
		expect(StyleSheet.flatten(screen.getByTestId('profile-team').props.style).backgroundColor).toBe(dark.muted);
		expect(StyleSheet.flatten(screen.getByText(/Field Crew North/).props.style).color).toBe(
			dark['muted-foreground']
		);
	});
});
