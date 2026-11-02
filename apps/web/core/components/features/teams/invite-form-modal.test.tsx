/** @jest-environment jsdom */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { InviteFormModal } from './invite-form-modal';

const mockInviteUsers = jest.fn();
const mockResendTeamInvitation = jest.fn();
const mockUseRolesQuery = jest.fn();
const mockUseTeamInvitationsQuery = jest.fn();
const mockActiveTeam = { name: 'Team', members: [] };

jest.mock('@/core/hooks/roles/use-roles-query', () => ({
	useRolesQuery: (options: { enabled?: boolean }) => mockUseRolesQuery(options)
}));

jest.mock('@/core/hooks/invitations/use-team-invitations-query', () => ({
	useTeamInvitationsQuery: (options: { enabled?: boolean }) => mockUseTeamInvitationsQuery(options)
}));

jest.mock('@/core/hooks/invitations/use-send-team-invitation', () => ({
	useSendTeamInvitation: () => ({
		inviteUsers: mockInviteUsers,
		inviteLoading: false,
		resendTeamInvitation: mockResendTeamInvitation,
		resendInviteLoading: false
	})
}));

jest.mock('@/core/hooks/invitations/use-remove-team-invitation', () => ({
	useRemoveTeamInvitation: () => ({ removeTeamInvitation: jest.fn(), removeInviteLoading: false })
}));

jest.mock('@/core/hooks/organizations/teams/use-team-member', () => ({
	useIsMemberManager: () => ({ isTeamManager: true })
}));

jest.mock('@/core/hooks/queries/user-user.query', () => ({
	useUserQuery: () => ({ data: { role: { name: 'ADMIN' } } })
}));

jest.mock('jotai', () => ({
	useAtomValue: () => mockActiveTeam
}));

jest.mock('@/core/stores', () => ({ activeTeamState: Symbol('active-team') }));

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string) => key
}));

jest.mock('@/core/components/common/toast-moment', () => ({ toastMoment: jest.fn() }));

jest.mock('@/core/components/common/entity-tile', () => ({ EntityTile: () => null }));

jest.mock('@/core/components/common/app-dialog', () => ({
	AppDialog: ({ open, children }: { open: boolean; children: React.ReactNode }) => {
		if (!open) {
			return null;
		}
		return <div>{children}</div>;
	},
	AppDialogHeader: ({ title }: { title: string }) => <h2>{title}</h2>,
	AppDialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
	AppDialogShortcut: () => null,
	APP_DIALOG_BODY: '',
	APP_DIALOG_FOOTER: ''
}));

jest.mock('./invite/invite-pending-list', () => ({
	InvitePendingList: () => null,
	isOpenInvitation: (invitation: { status?: string | null }) => invitation.status !== 'ACCEPTED'
}));

jest.mock('./invite/invite-role-select', () => ({
	InviteRoleSelect: ({
		roles,
		value,
		onChange
	}: {
		roles: { id: string; name: string }[];
		value?: string;
		onChange: (roleId: string) => void;
	}) => (
		<select data-testid="role-select" value={value ?? ''} onChange={(event) => onChange(event.target.value)}>
			<option value="">Choose role</option>
			{roles.map((role) => (
				<option key={role.id} value={role.id}>
					{role.name}
				</option>
			))}
		</select>
	)
}));

const noRoles = { roles: [], isLoading: false, isSuccess: true };
const loadedRoles = {
	roles: [
		{ id: 'employee-role', name: 'EMPLOYEE' },
		{ id: 'manager-role', name: 'MANAGER' }
	],
	isLoading: false,
	isSuccess: true
};
const noInvitations = { teamInvitations: [], fetchingInvitations: false };

function selectedRoleValue() {
	const select = screen.queryByTestId('role-select') as HTMLSelectElement | null;
	return select?.value ?? '';
}

function emailInput() {
	return screen.getByLabelText('modals.invite.EMAILS_LABEL') as HTMLInputElement;
}

function addAddress(address: string) {
	const input = emailInput();
	fireEvent.change(input, { target: { value: address } });
	fireEvent.keyDown(input, { key: 'Enter' });
}

function submitForm() {
	fireEvent.submit(emailInput().closest('form')!);
}

describe('InviteFormModal role selection', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockInviteUsers.mockResolvedValue(undefined);
		mockResendTeamInvitation.mockResolvedValue(undefined);
		mockUseRolesQuery.mockReturnValue(noRoles);
		mockUseTeamInvitationsQuery.mockReturnValue(noInvitations);
	});

	it('selects the employee role when deferred roles arrive after a cold open', async () => {
		const { rerender } = render(<InviteFormModal open={false} closeModal={jest.fn()} />);

		mockUseRolesQuery.mockReturnValue(loadedRoles);
		rerender(<InviteFormModal open closeModal={jest.fn()} />);

		await waitFor(() => expect(selectedRoleValue()).toBe('employee-role'));
		addAddress('new@example.com');
		submitForm();

		await waitFor(() => expect(mockInviteUsers).toHaveBeenCalledWith(['new@example.com'], 'employee-role'));
	});

	it('does not replace an explicit role choice when roles refresh', async () => {
		const { rerender } = render(<InviteFormModal open={false} closeModal={jest.fn()} />);
		mockUseRolesQuery.mockReturnValue(loadedRoles);
		rerender(<InviteFormModal open closeModal={jest.fn()} />);

		await waitFor(() => expect(selectedRoleValue()).toBe('employee-role'));
		fireEvent.change(screen.getByTestId('role-select'), { target: { value: 'manager-role' } });
		mockUseRolesQuery.mockReturnValue({ ...loadedRoles, roles: [...loadedRoles.roles] });
		rerender(<InviteFormModal open closeModal={jest.fn()} />);

		expect(selectedRoleValue()).toBe('manager-role');
		addAddress('new@example.com');
		submitForm();

		await waitFor(() => expect(mockInviteUsers).toHaveBeenCalledWith(['new@example.com'], 'manager-role'));
	});

	it('drops a stale selection and chooses the new scope employee role', async () => {
		const { rerender } = render(<InviteFormModal open={false} closeModal={jest.fn()} />);
		mockUseRolesQuery.mockReturnValue(loadedRoles);
		rerender(<InviteFormModal open closeModal={jest.fn()} />);

		await waitFor(() => expect(selectedRoleValue()).toBe('employee-role'));
		fireEvent.change(screen.getByTestId('role-select'), { target: { value: 'manager-role' } });

		mockUseRolesQuery.mockReturnValue(noRoles);
		rerender(<InviteFormModal open closeModal={jest.fn()} />);
		await waitFor(() => expect(selectedRoleValue()).toBe(''));

		mockUseRolesQuery.mockReturnValue({
			...loadedRoles,
			roles: [
				{ id: 'employee-role-b', name: 'EMPLOYEE' },
				{ id: 'manager-role-b', name: 'MANAGER' }
			]
		});
		rerender(<InviteFormModal open closeModal={jest.fn()} />);

		await waitFor(() => expect(selectedRoleValue()).toBe('employee-role-b'));
	});

	it('waits for invite prerequisites and resends a matching resolved invitation without creating another', async () => {
		mockUseRolesQuery.mockReturnValue(loadedRoles);
		mockUseTeamInvitationsQuery.mockReturnValue({ teamInvitations: [], fetchingInvitations: true });
		const { rerender } = render(<InviteFormModal open closeModal={jest.fn()} />);
		await waitFor(() => expect(selectedRoleValue()).toBe('employee-role'));
		addAddress('new@example.com');

		submitForm();
		expect(mockResendTeamInvitation).not.toHaveBeenCalled();
		expect(mockInviteUsers).not.toHaveBeenCalled();

		const pendingInvitation = {
			teamInvitations: [{ id: 'invite-1', email: 'new@example.com' }],
			fetchingInvitations: false
		};
		mockUseRolesQuery.mockReturnValue({ ...loadedRoles, isLoading: true, isSuccess: false });
		mockUseTeamInvitationsQuery.mockReturnValue(pendingInvitation);
		rerender(<InviteFormModal open closeModal={jest.fn()} />);
		submitForm();
		expect(mockInviteUsers).not.toHaveBeenCalled();
		expect(mockResendTeamInvitation).not.toHaveBeenCalled();

		mockUseRolesQuery.mockReturnValue(noRoles);
		rerender(<InviteFormModal open closeModal={jest.fn()} />);
		await waitFor(() => expect(selectedRoleValue()).toBe(''));
		submitForm();
		await waitFor(() => expect(mockResendTeamInvitation).toHaveBeenCalledWith('invite-1'));
		expect(mockInviteUsers).not.toHaveBeenCalled();
		mockResendTeamInvitation.mockClear();

		mockUseRolesQuery.mockReturnValue(loadedRoles);
		rerender(<InviteFormModal open closeModal={jest.fn()} />);
		await waitFor(() => expect(selectedRoleValue()).toBe('employee-role'));
		addAddress('new@example.com');
		submitForm();

		await waitFor(() => expect(mockResendTeamInvitation).toHaveBeenCalledWith('invite-1'));
		expect(mockInviteUsers).not.toHaveBeenCalled();
	});

	it('uses the invitation service fallback when an admin has no selectable roles', async () => {
		render(<InviteFormModal open closeModal={jest.fn()} />);
		addAddress('new@example.com');
		submitForm();

		await waitFor(() => expect(mockInviteUsers).toHaveBeenCalledWith(['new@example.com'], undefined));
	});
});

describe('InviteFormModal addresses', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockInviteUsers.mockResolvedValue(undefined);
		mockResendTeamInvitation.mockResolvedValue(undefined);
		mockUseRolesQuery.mockReturnValue(loadedRoles);
		mockUseTeamInvitationsQuery.mockReturnValue(noInvitations);
	});

	it('invites every valid address of a pasted list in one request and leaves invalid ones out', async () => {
		render(<InviteFormModal open closeModal={jest.fn()} />);
		await waitFor(() => expect(selectedRoleValue()).toBe('employee-role'));

		fireEvent.paste(emailInput(), {
			clipboardData: { getData: () => 'Ana Silva <ana@example.com>, bob@example.com; not-an-address' }
		});
		submitForm();

		await waitFor(() =>
			expect(mockInviteUsers).toHaveBeenCalledWith(['ana@example.com', 'bob@example.com'], 'employee-role')
		);
		expect(mockInviteUsers).toHaveBeenCalledTimes(1);
	});
});
