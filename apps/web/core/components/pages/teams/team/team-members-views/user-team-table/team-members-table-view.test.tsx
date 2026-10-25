/** @jest-environment jsdom */

/**
 * The table view shows the Invite card under the members only to those the API lets invite into the active team.
 */
import { render, screen } from '@testing-library/react';
import { Provider, createStore } from 'jotai';

import { activeTeamIdState, organizationTeamsState } from '@/core/stores';
import type { TOrganizationTeam } from '@/core/types/schemas';

const TEAM_ID = 'team-1';

const mockUser = { id: 'user-1', isEmailVerified: true, employee: { id: 'employee-1', userId: 'user-1' } };

type TInviteCardProps = { onClick?: () => void };

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('@/core/hooks', () => ({
	useAuthenticateUser: () => ({ user: mockUser }),
	useModal: () => ({ isOpen: false, openModal: jest.fn(), closeModal: jest.fn() })
}));
jest.mock('@/core/hooks/queries/user-user.query', () => ({
	useUserQuery: () => ({ data: mockUser })
}));
jest.mock('@/core/hooks/roles/use-my-role-permissions-query', () => ({
	useMyRolePermissionsQuery: () => ({ myPermissions: [] })
}));
jest.mock('@/core/components/common/data-table', () => ({ __esModule: true, default: () => null }));
jest.mock('./team-member-cells', () => ({
	ActionMenuCell: () => null,
	TaskCell: () => null,
	TaskEstimateInfoCell: () => null,
	TeamMemberRowWrapper: () => null,
	UserInfoCell: () => null,
	WorkedOnTaskCell: () => null
}));
jest.mock('../../../../../teams/invite/user-invite-card', () => ({
	InviteUserTeamCard: ({ onClick }: TInviteCardProps) => <button onClick={onClick}>Invite</button>
}));
jest.mock('../../../../../features/teams/invite-form-modal', () => ({ InviteFormModal: () => null }));

import TeamMembersTableView from './team-members-table-view';

function renderTableView(isManager: boolean) {
	const membership = {
		id: 'membership-1',
		employeeId: 'employee-1',
		employee: { id: 'employee-1', userId: 'user-1' },
		isManager
	};
	const activeTeam = { id: TEAM_ID, name: 'Active team', members: [membership] };
	const store = createStore();
	store.set(organizationTeamsState, [activeTeam] as unknown as TOrganizationTeam[]);
	store.set(activeTeamIdState, TEAM_ID);
	render(
		<Provider store={store}>
			<TeamMembersTableView teamMembers={[]} />
		</Provider>
	);
}

describe('TeamMembersTableView', () => {
	it('does not show the Invite card to a plain member of the active team', () => {
		renderTableView(false);

		expect(screen.queryByText('Invite')).toBeNull();
	});

	it('shows the Invite card to a manager of the active team', () => {
		renderTableView(true);

		expect(screen.getByText('Invite')).toBeTruthy();
	});
});
