/** @jest-environment jsdom */

import React from 'react';
import { render, screen } from '@testing-library/react';

let mockCanInvite = false;

jest.mock('@/core/hooks/invitations/use-can-invite-to-active-team', () => ({
	useCanInviteToActiveTeam: () => mockCanInvite
}));
jest.mock('@/core/hooks', () => ({
	useAuthenticateUser: () => ({ user: { id: 'user-1', isEmailVerified: true } }),
	useModal: () => ({ isOpen: false, openModal: jest.fn(), closeModal: jest.fn() })
}));
jest.mock('next-intl', () => ({
	useTranslations: () => (key: string) => key
}));
jest.mock('jotai', () => ({
	useAtomValue: () => ({ running: false })
}));
jest.mock('@/core/stores', () => ({ timerStatusState: Symbol('timer-status') }));
jest.mock('sonner', () => ({ toast: { error: jest.fn() } }));

// The menu renders inline, so its items can be read without opening it.
jest.mock('@/core/components/common/dropdown-menu', () => {
	const Pass = ({ children }: { children?: React.ReactNode }) => <>{children}</>;
	return {
		DropdownMenu: Pass,
		DropdownMenuTrigger: Pass,
		DropdownMenuContent: Pass,
		DropdownMenuGroup: Pass,
		DropdownMenuItem: ({ children }: { children?: React.ReactNode }) => <div role="menuitem">{children}</div>,
		DropdownMenuSeparator: () => <hr />,
		DropdownMenuShortcut: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>
	};
});
jest.mock('@/core/components/common/button', () => ({
	Button: ({ children }: { children?: React.ReactNode }) => <button type="button">{children}</button>
}));
jest.mock('../../../icons', () => ({
	AddUserIcon: () => null,
	ProjectIcon: () => null,
	TaskIcon: () => null,
	TeamIcon: () => null
}));
jest.mock('../../../duplicated-components/tooltip', () => ({
	Tooltip: ({ children }: { children?: React.ReactNode }) => <>{children}</>
}));
jest.mock('../../../common/modal', () => ({ Modal: () => null }));
jest.mock('../../tasks/create-task-modal', () => ({ __esModule: true, default: () => null }));
jest.mock('../../teams/invite-form-modal', () => ({ InviteFormModal: () => null }));
jest.mock('../../teams/create-team-modal', () => ({ CreateTeamModal: () => null }));
jest.mock('../../projects/create-project-modal', () => ({ CreateProjectModal: () => null }));

import { DefaultCreateAction } from './create-default-action';

const inviteItem = () => screen.queryByRole('menuitem', { name: /invite/i });

describe('DefaultCreateAction invite item', () => {
	it('offers Invite to a user who may invite into the active team', () => {
		mockCanInvite = true;
		render(<DefaultCreateAction />);

		expect(inviteItem()).not.toBeNull();
		expect(screen.queryByText('⌘CI')).not.toBeNull();
	});

	it('hides Invite, and its shortcut label, from a user the API would refuse', () => {
		mockCanInvite = false;
		render(<DefaultCreateAction />);

		expect(inviteItem()).toBeNull();
		expect(screen.queryByText('⌘CI')).toBeNull();
		// The other quick-create actions stay.
		expect(screen.getAllByRole('menuitem')).toHaveLength(3);
	});
});
