/** @jest-environment jsdom */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { InviteFormModal } from './invite-form-modal';

const mockInviteUser = jest.fn();
const mockResendTeamInvitation = jest.fn();
const mockUseFastInviteDataOwner = jest.fn();
const mockActiveTeam = { members: [] };

jest.mock('@/core/hooks/bootstrap/use-fast-feature-data', () => ({
	useFastInviteDataOwner: (open: boolean) => mockUseFastInviteDataOwner(open)
}));

jest.mock('@/core/hooks/invitations/use-send-team-invitation', () => ({
	useSendTeamInvitation: () => ({
		inviteUser: mockInviteUser,
		inviteLoading: false,
		resendTeamInvitation: mockResendTeamInvitation,
		resendInviteLoading: false
	})
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

jest.mock('sonner', () => ({
	toast: { success: jest.fn(), error: jest.fn() }
}));

jest.mock('@/core/components', () => {
	const Text = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
	Text.Heading = ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>;

	return {
		BackButton: () => <button type="button">Back</button>,
		Button: ({
			loading: _loading,
			...props
		}: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) => <button {...props} />,
		Modal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
		Text
	};
});

jest.mock('@/core/components/common/ever-card', () => ({
	EverCard: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

jest.mock('../../teams/invite/invite-email-dropdown', () => ({
	InviteEmailDropdown: ({
		setSelectedEmail
	}: {
		setSelectedEmail: (email: { title: string; name: string }) => void;
	}) => (
		<button
			type="button"
			data-testid="choose-email"
			onClick={() => setSelectedEmail({ title: 'new@example.com', name: 'New User' })}
		>
			Choose email
		</button>
	)
}));

jest.mock('../../duplicated-components/_input', () => ({
	InputField: React.forwardRef<
		HTMLInputElement,
		React.InputHTMLAttributes<HTMLInputElement> & { setErrors?: unknown; noWrapper?: boolean; errors?: unknown }
	>(({ setErrors: _setErrors, noWrapper: _noWrapper, errors: _errors, ...props }, ref) => (
		<input {...props} ref={ref} />
	))
}));

jest.mock('../../common/select', () => ({
	Select: ({ value, onValueChange }: { value?: string; onValueChange: (value: string) => void }) => (
		<select data-testid="role-select" value={value ?? ''} onChange={(event) => onValueChange(event.target.value)}>
			<option value="">Choose role</option>
			<option value="employee-role">Employee</option>
			<option value="manager-role">Manager</option>
			<option value="employee-role-b">Employee B</option>
			<option value="manager-role-b">Manager B</option>
		</select>
	),
	SelectContent: () => null,
	SelectGroup: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	SelectItem: () => null,
	SelectTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	SelectValue: () => null
}));

const noInviteData = {
	roles: [],
	teamInvitations: [],
	workingEmployees: []
};
const loadedInviteData = {
	roles: [
		{ id: 'employee-role', name: 'EMPLOYEE' },
		{ id: 'manager-role', name: 'MANAGER' }
	],
	teamInvitations: [],
	workingEmployees: []
};
const selectedRoleValue = () => (screen.getByTestId('role-select') as HTMLSelectElement).value;

describe('InviteFormModal role selection', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockInviteUser.mockResolvedValue(undefined);
		mockResendTeamInvitation.mockResolvedValue(undefined);
		mockUseFastInviteDataOwner.mockReturnValue(noInviteData);
	});

	it('selects the employee role when deferred roles arrive after a cold open', async () => {
		const { rerender } = render(<InviteFormModal open={false} closeModal={jest.fn()} />);

		mockUseFastInviteDataOwner.mockReturnValue(loadedInviteData);
		rerender(<InviteFormModal open closeModal={jest.fn()} />);

		await waitFor(() => expect(selectedRoleValue()).toBe('employee-role'));
		fireEvent.click(screen.getByTestId('choose-email'));
		fireEvent.submit(screen.getByTestId('role-select').closest('form')!);

		await waitFor(() =>
			expect(mockInviteUser).toHaveBeenCalledWith('new@example.com', 'New User', 'employee-role')
		);
	});

	it('does not replace an explicit role choice when roles refresh', async () => {
		const { rerender } = render(<InviteFormModal open={false} closeModal={jest.fn()} />);
		mockUseFastInviteDataOwner.mockReturnValue(loadedInviteData);
		rerender(<InviteFormModal open closeModal={jest.fn()} />);

		await waitFor(() => expect(selectedRoleValue()).toBe('employee-role'));
		fireEvent.change(screen.getByTestId('role-select'), { target: { value: 'manager-role' } });
		mockUseFastInviteDataOwner.mockReturnValue({
			...loadedInviteData,
			roles: [...loadedInviteData.roles]
		});
		rerender(<InviteFormModal open closeModal={jest.fn()} />);

		expect(selectedRoleValue()).toBe('manager-role');
		fireEvent.click(screen.getByTestId('choose-email'));
		fireEvent.submit(screen.getByTestId('role-select').closest('form')!);

		await waitFor(() => expect(mockInviteUser).toHaveBeenCalledWith('new@example.com', 'New User', 'manager-role'));
	});

	it('drops a stale selection and chooses the new scope employee role', async () => {
		const { rerender } = render(<InviteFormModal open={false} closeModal={jest.fn()} />);
		mockUseFastInviteDataOwner.mockReturnValue(loadedInviteData);
		rerender(<InviteFormModal open closeModal={jest.fn()} />);

		await waitFor(() => expect(selectedRoleValue()).toBe('employee-role'));
		fireEvent.change(screen.getByTestId('role-select'), { target: { value: 'manager-role' } });

		mockUseFastInviteDataOwner.mockReturnValue(noInviteData);
		rerender(<InviteFormModal open closeModal={jest.fn()} />);
		await waitFor(() => expect(selectedRoleValue()).toBe(''));

		mockUseFastInviteDataOwner.mockReturnValue({
			...loadedInviteData,
			roles: [
				{ id: 'employee-role-b', name: 'EMPLOYEE' },
				{ id: 'manager-role-b', name: 'MANAGER' }
			]
		});
		rerender(<InviteFormModal open closeModal={jest.fn()} />);

		await waitFor(() => expect(selectedRoleValue()).toBe('employee-role-b'));
	});

	it('waits for invite prerequisites and resends a matching resolved invitation without creating another', async () => {
		mockUseFastInviteDataOwner.mockReturnValue({
			...loadedInviteData,
			teamInvitations: [],
			fetchingInvitations: true,
			getWorkingEmployeeLoading: false
		});
		const { rerender } = render(<InviteFormModal open closeModal={jest.fn()} />);
		await waitFor(() => expect(selectedRoleValue()).toBe('employee-role'));
		fireEvent.click(screen.getByTestId('choose-email'));
		const form = screen.getByTestId('choose-email').closest('form')!;

		fireEvent.submit(form);
		expect(mockInviteUser).not.toHaveBeenCalled();
		expect(mockResendTeamInvitation).not.toHaveBeenCalled();

		mockUseFastInviteDataOwner.mockReturnValue({
			...loadedInviteData,
			teamInvitations: [{ id: 'invite-1', email: 'new@example.com' }],
			fetchingInvitations: false,
			getWorkingEmployeeLoading: true
		});
		rerender(<InviteFormModal open closeModal={jest.fn()} />);
		fireEvent.submit(form);
		expect(mockInviteUser).not.toHaveBeenCalled();
		expect(mockResendTeamInvitation).not.toHaveBeenCalled();

		mockUseFastInviteDataOwner.mockReturnValue({
			...noInviteData,
			teamInvitations: [{ id: 'invite-1', email: 'new@example.com' }],
			fetchingInvitations: false,
			getWorkingEmployeeLoading: false
		});
		rerender(<InviteFormModal open closeModal={jest.fn()} />);
		await waitFor(() => expect(selectedRoleValue()).toBe(''));
		fireEvent.submit(form);
		expect(mockInviteUser).not.toHaveBeenCalled();
		expect(mockResendTeamInvitation).not.toHaveBeenCalled();

		mockUseFastInviteDataOwner.mockReturnValue({
			...loadedInviteData,
			teamInvitations: [{ id: 'invite-1', email: 'new@example.com' }],
			fetchingInvitations: false,
			getWorkingEmployeeLoading: false
		});
		rerender(<InviteFormModal open closeModal={jest.fn()} />);
		await waitFor(() => expect(selectedRoleValue()).toBe('employee-role'));
		fireEvent.submit(form);

		await waitFor(() => expect(mockResendTeamInvitation).toHaveBeenCalledWith('invite-1'));
		expect(mockInviteUser).not.toHaveBeenCalled();
	});
});
