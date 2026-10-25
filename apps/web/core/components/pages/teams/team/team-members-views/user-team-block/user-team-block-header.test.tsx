/** @jest-environment jsdom */

/**
 * The block view header, shown to every member on the home page, offers Invite only to those the API lets invite
 * into the active team; the member filters stay for everyone.
 */
import { render, screen } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import type { ReactNode } from 'react';

import { activeTeamIdState, organizationTeamsState } from '@/core/stores';
import type { TOrganizationTeam } from '@/core/types/schemas';

const TEAM_ID = 'team-1';

const mockUser = { id: 'user-1', isEmailVerified: true, employee: { id: 'employee-1', userId: 'user-1' } };
const mockFilterStats = { all: 1, running: 0, online: 0, pause: 0, idle: 1, suspended: 0 };

type TClickable = { children?: ReactNode; onClick?: () => void };

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('@/assets/svg', () => ({
	CheckCircleTickIcon: () => null,
	CrossCircleIcon: () => null,
	PauseIcon: () => null,
	SearchNormalIcon: () => null,
	StopCircleIcon: () => null,
	TimerPlayIcon: () => null
}));
jest.mock('@/core/components', () => ({
	Button: ({ children, onClick }: TClickable) => <button onClick={onClick}>{children}</button>
}));
jest.mock('@/core/hooks', () => ({
	useModal: () => ({ isOpen: false, openModal: jest.fn(), closeModal: jest.fn() }),
	useUserProfilePage: () => ({ loadTaskStatsIObserverRef: undefined })
}));
jest.mock('@/core/hooks/queries/user-user.query', () => ({
	useUserQuery: () => ({ data: mockUser })
}));
jest.mock('@/core/hooks/roles/use-my-role-permissions-query', () => ({
	useMyRolePermissionsQuery: () => ({ myPermissions: [] })
}));
jest.mock('@/core/hooks/tasks/use-task-filter', () => ({
	useTaskFilter: () => ({
		filterType: undefined,
		outclickFilterCard: { ignoreElementRef: undefined },
		taskName: '',
		setTaskName: jest.fn(),
		toggleFilterType: jest.fn()
	})
}));
jest.mock('@/core/hooks/teams/use-processed-team-members', () => ({
	useProcessedTeamMembers: () => ({ allMembersWithCurrent: [] })
}));
jest.mock('@/core/hooks/teams/use-team-member-filter-stats', () => ({
	useTeamMemberFilterStatsForUI: () => mockFilterStats
}));
jest.mock('@/core/components/pages/profile/task-filters', () => ({ TaskNameFilter: () => null }));
jest.mock('@/core/components/duplicated-components/separator', () => ({ VerticalSeparator: () => null }));
jest.mock('@/core/components/features/teams/invite-form-modal', () => ({ InviteFormModal: () => null }));

import { UserTeamBlockHeader } from './user-team-block-header';

function renderBlockHeader(isManager: boolean) {
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
			<UserTeamBlockHeader />
		</Provider>
	);
}

describe('UserTeamBlockHeader', () => {
	it('does not offer Invite to a plain member of the active team', () => {
		renderBlockHeader(false);

		expect(screen.queryByText('Invite')).toBeNull();
		expect(screen.getByText('common.ALL_MEMBERS')).toBeTruthy();
	});

	it('offers Invite to a manager of the active team', () => {
		renderBlockHeader(true);

		expect(screen.getByText('Invite')).toBeTruthy();
	});
});
