/** @jest-environment jsdom */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

let mockCanInvite = false;
let mockUser: { id: string; isEmailVerified: boolean } = { id: 'user-1', isEmailVerified: true };
const mockGetVerificationStatus = jest.fn();

jest.mock('@/core/hooks/invitations/use-can-invite-to-active-team', () => ({
	useCanInviteToActiveTeam: () => mockCanInvite
}));
jest.mock('@/core/hooks', () => {
	const { useState } = jest.requireActual<typeof import('react')>('react');
	return {
		useAuthenticateUser: () => ({ user: mockUser }),
		useModal: () => {
			const [isOpen, setIsOpen] = useState(false);
			return { isOpen, openModal: () => setIsOpen(true), closeModal: () => setIsOpen(false) };
		}
	};
});
jest.mock('@/core/services/client/api/users/emails/email-verification.service', () => ({
	emailVerificationService: { getVerificationStatus: () => mockGetVerificationStatus() }
}));
jest.mock('next-intl', () => ({
	useTranslations: () => (key: string) => key
}));
jest.mock('jotai', () => ({
	useAtomValue: () => ({ running: false })
}));
jest.mock('@/core/stores', () => ({ timerStatusState: Symbol('timer-status') }));
jest.mock('sonner', () => ({ toast: { error: jest.fn(), warning: jest.fn() } }));

// The menu renders inline, so its items can be read without opening it.
jest.mock('@/core/components/common/dropdown-menu', () => {
	const Pass = ({ children }: { children?: React.ReactNode }) => <>{children}</>;
	return {
		DropdownMenu: Pass,
		DropdownMenuTrigger: Pass,
		DropdownMenuContent: Pass,
		DropdownMenuGroup: Pass,
		DropdownMenuItem: ({
			children,
			disabled,
			onClick
		}: {
			children?: React.ReactNode;
			disabled?: boolean;
			onClick?: () => void;
		}) => (
			<div role="menuitem" aria-disabled={disabled} onClick={disabled ? undefined : onClick}>
				{children}
			</div>
		),
		DropdownMenuSeparator: () => <hr />,
		DropdownMenuShortcut: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>
	};
});
jest.mock('@/core/components/common/button', () => ({
	Button: ({ children }: { children?: React.ReactNode }) => <button type="button">{children}</button>
}));
jest.mock('../../../icons', () => ({
	AddUserIcon: () => null,
	Plus: () => null,
	ProjectIcon: () => null,
	TaskIcon: () => null,
	TeamIcon: () => null
}));
jest.mock('../../../duplicated-components/tooltip', () => ({
	Tooltip: ({ children }: { children?: React.ReactNode }) => <>{children}</>
}));
jest.mock('../../../common/modal', () => ({ Modal: () => null }));
jest.mock('../../tasks/create-task-modal', () => ({ __esModule: true, default: () => null }));
jest.mock('../../teams/invite-form-modal', () => ({
	InviteFormModal: ({ open }: { open: boolean }) => (open ? <div role="dialog">invite dialog</div> : null)
}));
jest.mock('../../teams/create-team-modal', () => ({
	CreateTeamModal: ({ open }: { open: boolean }) => (open ? <div role="dialog">create team dialog</div> : null)
}));
jest.mock('../../projects/create-project-modal', () => ({
	CreateProjectModal: ({ open }: { open: boolean }) => (open ? <div role="dialog">create project dialog</div> : null)
}));

import { DefaultCreateAction } from './create-default-action';

const INVITE_ITEM = { name: /invite/i };

async function renderMenu() {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	render(
		<QueryClientProvider client={client}>
			<DefaultCreateAction />
		</QueryClientProvider>
	);
	// The status answer reaches the menu through React Query's notify timer, after its own tick
	await act(async () => {
		await new Promise((resolve) => setTimeout(resolve, 50));
	});
}

describe('DefaultCreateAction invite item', () => {
	beforeEach(() => {
		mockUser = { id: 'user-1', isEmailVerified: true };
	});

	it('offers Invite to a user who may invite into the active team', async () => {
		mockCanInvite = true;
		await renderMenu();

		expect(screen.getByRole('menuitem', INVITE_ITEM)).toBeTruthy();
		expect(screen.getByText('⌘CI')).toBeTruthy();
	});

	it('hides Invite, and its shortcut label, from a user the API would refuse', async () => {
		mockCanInvite = false;
		await renderMenu();

		expect(screen.queryByRole('menuitem', INVITE_ITEM)).toBeNull();
		expect(screen.queryByText('⌘CI')).toBeNull();
		// The other quick-create actions stay.
		expect(screen.getAllByRole('menuitem')).toHaveLength(3);
	});
});

describe('DefaultCreateAction for an owner whose address is not verified (#5677)', () => {
	beforeEach(() => {
		mockCanInvite = true;
		mockUser = { id: 'user-1', isEmailVerified: false };
		mockGetVerificationStatus.mockReset();
	});

	it('opens Team, Project and Invite where the deployment verifies no address (the status route answers 404)', async () => {
		mockGetVerificationStatus.mockResolvedValue(null);
		await renderMenu();

		const teamItem = screen.getByRole('menuitem', { name: /team/i });
		expect(teamItem.getAttribute('aria-disabled')).not.toBe('true');

		fireEvent.click(teamItem);
		fireEvent.click(screen.getByRole('menuitem', { name: /project/i }));
		fireEvent.click(screen.getByRole('menuitem', INVITE_ITEM));

		expect(screen.getByText('create team dialog')).toBeTruthy();
		expect(screen.getByText('create project dialog')).toBeTruthy();
		expect(screen.getByText('invite dialog')).toBeTruthy();
	});

	it('keeps Team, Project and Invite closed where the deployment verifies addresses', async () => {
		mockGetVerificationStatus.mockResolvedValue({ isEmailVerified: false, verificationEmailSent: true });
		await renderMenu();

		const teamItem = screen.getByRole('menuitem', { name: /team/i });
		expect(teamItem.getAttribute('aria-disabled')).toBe('true');

		fireEvent.click(teamItem);
		fireEvent.click(screen.getByRole('menuitem', { name: /project/i }));
		fireEvent.click(screen.getByRole('menuitem', INVITE_ITEM));

		expect(screen.queryByRole('dialog')).toBeNull();
	});
});
