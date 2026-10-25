/** @jest-environment jsdom */

/**
 * The command palette lists Invite User, and binds its I U shortcut, only for those the API lets invite into the
 * active team; every other command stays.
 */
import { render, screen } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import type { ReactNode } from 'react';

import { activeTeamIdState, organizationTeamsState } from '@/core/stores';
import type { TOrganizationTeam } from '@/core/types/schemas';

const TEAM_ID = 'team-1';

const mockUser = { id: 'user-1', isEmailVerified: true, employee: { id: 'employee-1', userId: 'user-1' } };
const mockUseKeyboardShortcuts = jest.fn();

type TChildren = { children?: ReactNode };
type TGroup = TChildren & { heading?: string };
type TShortcut = { description: string };

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('next-themes', () => ({ useTheme: () => ({ setTheme: jest.fn(), resolvedTheme: 'light' }) }));
jest.mock('lucide-react', () => ({ ArrowUpRightIcon: () => null }));
jest.mock('../../../../hooks/auth', () => ({ useAuthenticateUser: () => ({ user: mockUser }) }));
jest.mock('../../../../hooks', () => ({
	useModal: () => ({ isOpen: false, openModal: jest.fn(), closeModal: jest.fn() })
}));
jest.mock('@/core/hooks/queries/user-user.query', () => ({
	useUserQuery: () => ({ data: mockUser })
}));
jest.mock('@/core/hooks/roles/use-my-role-permissions-query', () => ({
	useMyRolePermissionsQuery: () => ({ myPermissions: [] })
}));
jest.mock('@/core/hooks/common/use-keyboard-shortcuts', () => ({
	useKeyboardShortcuts: (...args: unknown[]) => mockUseKeyboardShortcuts(...args)
}));
jest.mock('@/core/components/common/command', () => {
	const Pass = ({ children }: TChildren) => <>{children}</>;
	const Group = ({ heading, children }: TGroup) => (
		<section>
			<h2>{heading}</h2>
			{children}
		</section>
	);
	const Item = ({ children }: TChildren) => <div>{children}</div>;
	return {
		CommandDialog: Pass,
		CommandEmpty: () => null,
		CommandGroup: Group,
		CommandInput: () => null,
		CommandItem: Item,
		CommandList: Pass,
		CommandShortcut: Pass
	};
});
jest.mock('./sidebar-command-form', () => ({ SidebarCommandForm: () => null }));
jest.mock('../../../common/badge', () => ({ Badge: () => null }));
jest.mock('../../../icons', () => ({
	AddIcon: () => null,
	AddTaskIcon: () => null,
	AddTeamIcon: () => null,
	AddUserIcon: () => null,
	DashboardIcon: () => null,
	MoonIcon: () => null,
	ProfileIcon: () => null,
	SettingsIcon: () => null,
	TasksIcon: () => null,
	TeamIcon: () => null,
	UserCircleIcon: () => null
}));
jest.mock('../../../common/modal', () => ({ Modal: () => null }));
jest.mock('../../../features/tasks/create-task-modal', () => ({ __esModule: true, default: () => null }));
jest.mock('../../../features/teams/invite-form-modal', () => ({ InviteFormModal: () => null }));
jest.mock('../../../features/projects/create-project-modal', () => ({ CreateProjectModal: () => null }));
jest.mock('@/core/components/features/teams/create-team-modal', () => ({ CreateTeamModal: () => null }));

import { SidebarCommandModal } from './sidebar-command-modal';

function renderPalette(isManager: boolean) {
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
			<SidebarCommandModal publicTeam={false} variant="none" />
		</Provider>
	);
}

/** The descriptions of the shortcuts the palette bound on its last render. */
function boundShortcutDescriptions(): string[] {
	const lastCall = mockUseKeyboardShortcuts.mock.lastCall;
	const shortcuts = lastCall?.[0] as TShortcut[];
	return shortcuts.map((shortcut) => shortcut.description);
}

describe('SidebarCommandModal', () => {
	it('does not list or bind Invite User for a plain member of the active team', () => {
		renderPalette(false);

		expect(screen.queryByText('Invite User')).toBeNull();
		expect(screen.getByText('Assign to me')).toBeTruthy();
		expect(boundShortcutDescriptions()).not.toContain('Invite User');
		expect(boundShortcutDescriptions()).toContain('Assign to me');
	});

	it('lists and binds Invite User for a manager of the active team', () => {
		renderPalette(true);

		expect(screen.getByText('Invite User')).toBeTruthy();
		expect(boundShortcutDescriptions()).toContain('Invite User');
	});
});
