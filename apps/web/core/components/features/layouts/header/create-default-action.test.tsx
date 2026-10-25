/** @jest-environment jsdom */

/**
 * Quick Create offers Invite only to those the API lets invite into the active team; every other entry stays.
 */
import { render, screen } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import type { ReactNode } from 'react';

import { activeTeamIdState, organizationTeamsState } from '@/core/stores';
import type { TOrganizationTeam } from '@/core/types/schemas';

const TEAM_ID = 'team-1';

const mockUser = { id: 'user-1', isEmailVerified: true, employee: { id: 'employee-1', userId: 'user-1' } };

type TChildren = { children?: ReactNode };
type TClickable = TChildren & { onClick?: () => void };

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('sonner', () => ({ toast: { error: jest.fn() } }));
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
jest.mock('@/core/components/common/button', () => ({
	Button: ({ children, onClick }: TClickable) => <button onClick={onClick}>{children}</button>
}));
jest.mock('@/core/components/common/dropdown-menu', () => {
	const Pass = ({ children }: TChildren) => <>{children}</>;
	const Item = ({ children, onClick }: TClickable) => <button onClick={onClick}>{children}</button>;
	const Shortcut = ({ children }: TChildren) => <kbd>{children}</kbd>;
	return {
		DropdownMenu: Pass,
		DropdownMenuContent: Pass,
		DropdownMenuGroup: Pass,
		DropdownMenuItem: Item,
		DropdownMenuSeparator: () => <hr />,
		DropdownMenuShortcut: Shortcut,
		DropdownMenuTrigger: Pass
	};
});
jest.mock('../../../icons', () => ({
	AddUserIcon: () => null,
	ProjectIcon: () => null,
	TaskIcon: () => null,
	TeamIcon: () => null
}));
jest.mock('../../../duplicated-components/tooltip', () => ({
	Tooltip: ({ children }: TChildren) => <>{children}</>
}));
jest.mock('../../../common/modal', () => ({ Modal: () => null }));
jest.mock('../../tasks/create-task-modal', () => ({ __esModule: true, default: () => null }));
jest.mock('../../teams/invite-form-modal', () => ({ InviteFormModal: () => null }));
jest.mock('../../teams/create-team-modal', () => ({ CreateTeamModal: () => null }));
jest.mock('../../projects/create-project-modal', () => ({ CreateProjectModal: () => null }));

import { DefaultCreateAction } from './create-default-action';

function renderQuickCreate(isManager: boolean) {
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
			<DefaultCreateAction />
		</Provider>
	);
}

describe('DefaultCreateAction', () => {
	it('does not offer Invite to a plain member of the active team', () => {
		renderQuickCreate(false);

		expect(screen.queryByText('Invite')).toBeNull();
		expect(screen.getByText('Task')).toBeTruthy();
		expect(screen.getByText('Team')).toBeTruthy();
		expect(screen.getByText('Project')).toBeTruthy();
	});

	it('offers Invite to a manager of the active team', () => {
		renderQuickCreate(true);

		expect(screen.getByText('Invite')).toBeTruthy();
	});
});
