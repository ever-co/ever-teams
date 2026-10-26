/** @jest-environment jsdom */

import React from 'react';
import { render, screen } from '@testing-library/react';

let mockCanInvite = false;
const mockUseKeyboardShortcuts = jest.fn();

jest.mock('@/core/hooks/invitations/use-can-invite-to-active-team', () => ({
	useCanInviteToActiveTeam: () => mockCanInvite
}));
jest.mock('@/core/hooks/common/use-keyboard-shortcuts', () => ({
	useKeyboardShortcuts: (...args: unknown[]) => mockUseKeyboardShortcuts(...args)
}));
jest.mock('../../../../hooks/auth', () => ({
	useAuthenticateUser: () => ({ user: { id: 'user-1', name: 'User', isEmailVerified: true } })
}));
jest.mock('../../../../hooks', () => ({
	useModal: () => ({ isOpen: false, openModal: jest.fn(), closeModal: jest.fn() })
}));
jest.mock('jotai', () => ({
	useAtom: () => [true, jest.fn()]
}));
jest.mock('@/core/stores/common/command-palette', () => ({ commandPaletteOpenAtom: Symbol('command-palette') }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('next-themes', () => ({ useTheme: () => ({ setTheme: jest.fn(), resolvedTheme: 'light' }) }));
jest.mock('lucide-react', () => ({ ArrowUpRightIcon: () => null }));

// The palette renders inline, so its commands can be read without opening a dialog.
jest.mock('@/core/components/common/command', () => {
	const Pass = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
	return {
		CommandDialog: Pass,
		CommandEmpty: () => null,
		CommandGroup: Pass,
		CommandInput: () => null,
		CommandItem: Pass,
		CommandList: Pass,
		CommandShortcut: Pass
	};
});
jest.mock('./sidebar-command-form', () => ({ SidebarCommandForm: () => null }));
jest.mock('../../../common/badge', () => ({ Badge: () => null }));
jest.mock('../../../icons', () => {
	const Icon = () => null;
	return {
		AddIcon: Icon,
		AddTaskIcon: Icon,
		AddTeamIcon: Icon,
		AddUserIcon: Icon,
		DashboardIcon: Icon,
		MoonIcon: Icon,
		ProfileIcon: Icon,
		SettingsIcon: Icon,
		TasksIcon: Icon,
		TeamIcon: Icon,
		UserCircleIcon: Icon
	};
});
jest.mock('../../../common/modal', () => ({ Modal: () => null }));
jest.mock('../../../features/tasks/create-task-modal', () => ({ __esModule: true, default: () => null }));
jest.mock('../../../features/teams/invite-form-modal', () => ({ InviteFormModal: () => null }));
jest.mock('../../../features/projects/create-project-modal', () => ({ CreateProjectModal: () => null }));
jest.mock('@/core/components/features/teams/create-team-modal', () => ({ CreateTeamModal: () => null }));

import { SidebarCommandModal } from './sidebar-command-modal';

/** The key sequences the palette registered as global shortcuts on its last render. */
function registeredSequences(): string[] {
	const [configs] = mockUseKeyboardShortcuts.mock.calls[mockUseKeyboardShortcuts.mock.calls.length - 1] as [
		Array<{ sequence: string[] }>
	];
	return configs.map((config) => config.sequence.join(' '));
}

describe('SidebarCommandModal invite command', () => {
	beforeEach(() => {
		mockUseKeyboardShortcuts.mockClear();
	});

	it('offers "Invite User" and its "i u" sequence to a user who may invite into the active team', () => {
		mockCanInvite = true;
		render(<SidebarCommandModal publicTeam={false} variant="none" />);

		expect(screen.queryByText('Invite User')).not.toBeNull();
		expect(registeredSequences()).toContain('i u');
	});

	it('hides "Invite User" and drops its "i u" sequence for a user the API would refuse', () => {
		mockCanInvite = false;
		render(<SidebarCommandModal publicTeam={false} variant="none" />);

		expect(screen.queryByText('Invite User')).toBeNull();
		expect(registeredSequences()).not.toContain('i u');
		// The other commands stay.
		expect(screen.queryByText('Assign to me')).not.toBeNull();
		expect(registeredSequences()).toContain('a m');
	});
});
