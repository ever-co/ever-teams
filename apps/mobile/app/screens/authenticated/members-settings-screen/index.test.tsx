import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { navigateTo } from '../../../navigators/routes';
import { MembersSettingsScreen } from './index';

// The screen draws through stand-ins: the test reads where its back arrow goes
jest.mock('../../../navigators/routes', () => ({ navigateTo: jest.fn() }));
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({}) }));
jest.mock('@expo/vector-icons', () => {
	const { createElement } = jest.requireActual('react');
	const { Text } = jest.requireActual('react-native');
	const icon = ({ name }: { name: string }) => createElement(Text, null, `icon ${name}`);
	return { AntDesign: icon, Feather: icon };
});
jest.mock('../../../components', () => ({
	Screen: ({ children }: { children: React.ReactNode }) => children
}));
jest.mock('../../../theme', () => {
	const theme = { colors: { background: '#ffffff', primary: '#282048' }, dark: false };
	return { typography: { primary: { semiBold: 'semiBold' } }, useAppTheme: () => theme };
});
jest.mock('../../../models', () => {
	const stores = { teamStore: { activeTeam: { members: [] } } };
	return { useStores: () => stores };
});
jest.mock('../../../services/hooks/use-organization', () => ({
	useOrganizationTeam: () => ({ isTeamManager: false })
}));
jest.mock('../../../services/hooks/features/use-team-member-card', () => ({ useTeamMemberCard: () => ({}) }));
jest.mock('./components/members-list', () => ({ __esModule: true, default: () => null }));
jest.mock('./components/change-role-modal', () => ({ __esModule: true, default: () => null }));
jest.mock('../../../components/confirmation-modal', () => ({ __esModule: true, default: () => null }));
jest.mock('react-native-svg', () => ({ SvgXml: () => null }));
jest.mock('../../../components/svgs/icons', () => ({ moreButtonDark: '', moreButtonLight: '' }));

type ScreenProps = React.ComponentProps<typeof MembersSettingsScreen>;

describe("the Members settings' back arrow", () => {
	it('returns to the team settings, where Members opens from', async () => {
		await render(<MembersSettingsScreen {...({} as ScreenProps)} />);

		await fireEvent.press(screen.getByText('icon arrow-left'));

		expect(navigateTo).toHaveBeenCalledWith(expect.anything(), 'Setting', { activeTab: 2 });
	});
});
