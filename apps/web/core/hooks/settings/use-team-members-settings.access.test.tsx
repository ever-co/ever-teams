/** @jest-environment jsdom */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider, createStore } from 'jotai';
import { act, renderHook } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { activeTeamIdState, organizationTeamsState } from '@/core/stores';

const mockSetMemberWorkEnd = jest.fn();
const mockAssignWorkspaceRole = jest.fn();
const mockUseRolesQuery = jest.fn();
let mockPermissions: string[] = [];
let mockViewer: { id: string; role: { name: string } } = { id: 'user-admin', role: { name: 'ADMIN' } };

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: Record<string, string>) => `${key}:${values?.name ?? ''}`
}));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock('@/core/hooks/queries/user-user.query', () => ({ useUserQuery: () => ({ data: mockViewer }) }));
jest.mock('@/core/hooks/roles/use-my-role-permissions-query', () => ({
	useMyRolePermissionsQuery: () => ({ myPermissions: mockPermissions, isSuccess: true })
}));
jest.mock('@/core/hooks/roles/use-roles-query', () => ({
	useRolesQuery: (options: { enabled?: boolean }) => mockUseRolesQuery(options)
}));
jest.mock('@/core/hooks/settings/use-member-access', () => ({
	useMemberWorkEnd: () => ({ setMemberWorkEnd: mockSetMemberWorkEnd }),
	useWorkspaceRoleAssignment: () => ({ assignWorkspaceRole: mockAssignWorkspaceRole })
}));
jest.mock('@/core/hooks/users/use-settings', () => ({ useSettings: () => ({ updateAvatar: jest.fn() }) }));
jest.mock('@/core/hooks/organizations/employees/use-employee', () => ({
	useEmployeeUpdate: () => ({ updateEmployeeAsync: jest.fn() })
}));
jest.mock('@/core/hooks/organizations/teams/use-delete-task', () => ({
	useDeleteTask: () => ({ deleteEmployeeFromTasks: jest.fn() })
}));
jest.mock('@/core/hooks/organizations/teams/use-edit-organization-team', () => ({
	useEditOrganizationTeam: () => ({ editOrganizationTeam: jest.fn() })
}));
jest.mock('@/core/hooks/organizations/teams/use-organization-teams-employee', () => ({
	useOrganizationEmployeeTeams: () => ({ updateOrganizationTeamEmployee: jest.fn() })
}));
jest.mock('@/core/hooks/organizations/rates/use-rates', () => ({
	useEmployeeRatesMutation: () => ({ saveEmployeeRates: jest.fn() })
}));

import { useTeamMembersSettings } from './use-team-members-settings';

const mockToast = (jest.requireMock('sonner') as { toast: { success: jest.Mock; error: jest.Mock } }).toast;

const ROLES = [
	{ id: 'role-super-admin', name: 'SUPER_ADMIN' },
	{ id: 'role-admin', name: 'ADMIN' },
	{ id: 'role-employee', name: 'EMPLOYEE' },
	{ id: 'role-viewer', name: 'VIEWER' },
	{ id: 'role-support', name: 'Support desk' }
];

const ADMIN_PERMISSIONS = ['ORG_EMPLOYEES_VIEW', 'ORG_EMPLOYEES_EDIT', 'ORG_USERS_EDIT'];

function member(key: string, roleId: string) {
	return {
		id: `row-${key}`,
		employeeId: `employee-${key}`,
		employee: {
			id: `employee-${key}`,
			userId: `user-${key}`,
			fullName: `Member ${key}`,
			user: { id: `user-${key}`, email: `${key}@example.com`, roleId }
		}
	};
}

const TEAM = {
	id: 'team-a',
	name: 'Team A',
	organizationId: 'organization-1',
	tenantId: 'tenant-1',
	members: [
		member('admin', 'role-admin'),
		member('ana', 'role-employee'),
		member('bo', 'role-admin'),
		member('cy', 'role-super-admin'),
		member('dee', 'role-support')
	]
};

function renderMembers() {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const store = createStore();
	store.set(organizationTeamsState, [TEAM] as never);
	store.set(activeTeamIdState, 'team-a');
	const wrapper = ({ children }: PropsWithChildren) => (
		<QueryClientProvider client={client}>
			<Provider store={store}>{children}</Provider>
		</QueryClientProvider>
	);
	const view = renderHook(() => useTeamMembersSettings(), { wrapper });
	const rowOf = (key: string) => {
		const row = view.result.current.rows.find((candidate) => candidate.id === `row-${key}`);
		if (!row) {
			throw new Error(`No row for ${key}`);
		}
		return row;
	};
	return { view, rowOf, store };
}

beforeEach(() => {
	jest.clearAllMocks();
	mockViewer = { id: 'user-admin', role: { name: 'ADMIN' } };
	mockPermissions = ADMIN_PERMISSIONS;
	mockUseRolesQuery.mockReturnValue({ roles: ROLES });
});

describe('what an admin may do to the access of a member', () => {
	it('offers Deactivate on a plain member only: never on themself, an admin or a super admin', () => {
		const { rowOf } = renderMembers();

		expect(rowOf('ana').canDeactivate).toBe(true);
		expect(rowOf('admin').canDeactivate).toBe(false);
		expect(rowOf('bo').canDeactivate).toBe(false);
		expect(rowOf('cy').canDeactivate).toBe(false);
	});

	it('offers the platform roles up to admin, never super admin nor a role the workspace created', () => {
		const { view } = renderMembers();

		expect(view.result.current.assignableRoles.map((role) => role.name)).toEqual(['ADMIN', 'EMPLOYEE', 'VIEWER']);
	});

	it('changes the role of anyone but themself, a super admin and the holder of a role they cannot give', () => {
		const { rowOf } = renderMembers();

		expect(rowOf('ana').canChangeWorkspaceRole).toBe(true);
		expect(rowOf('bo').canChangeWorkspaceRole).toBe(true);
		expect(rowOf('admin').canChangeWorkspaceRole).toBe(false);
		expect(rowOf('cy').canChangeWorkspaceRole).toBe(false);
		expect(rowOf('dee').canChangeWorkspaceRole).toBe(false);
		expect(rowOf('bo').workspaceRoleName).toBe('ADMIN');
		expect(rowOf('dee').workspaceRoleName).toBe('Support desk');
	});

	it('offers nothing while the workspace roles are not read: an unknown role may be an admin', () => {
		mockUseRolesQuery.mockReturnValue({ roles: [] });

		const { view, rowOf } = renderMembers();

		expect(rowOf('ana').canDeactivate).toBe(false);
		expect(rowOf('ana').canChangeWorkspaceRole).toBe(false);
		expect(view.result.current.assignableRoles).toEqual([]);
	});
});

describe('what a team manager may do to the access of a member', () => {
	beforeEach(() => {
		mockViewer = { id: 'user-admin', role: { name: 'EMPLOYEE' } };
		mockPermissions = ['ORG_TEAM_EDIT', 'ORG_TEAM_ADD', 'PROFILE_EDIT'];
	});

	it('offers neither action and does not read the workspace roles', () => {
		const { view, rowOf } = renderMembers();

		expect(mockUseRolesQuery).toHaveBeenLastCalledWith({ enabled: false });
		expect(rowOf('ana').canDeactivate).toBe(false);
		expect(rowOf('ana').canChangeWorkspaceRole).toBe(false);
		expect(view.result.current.assignableRoles).toEqual([]);
	});

	it('sends nothing to the API when the actions are called anyway', async () => {
		const { view } = renderMembers();

		await act(async () => {
			await expect(view.result.current.deactivateMember('row-ana')).rejects.toThrow();
			await view.result.current.changeWorkspaceRole('row-ana', 'role-admin');
		});

		expect(mockSetMemberWorkEnd).not.toHaveBeenCalled();
		expect(mockAssignWorkspaceRole).not.toHaveBeenCalled();
	});
});

describe('deactivating a member', () => {
	beforeEach(() => {
		jest.useFakeTimers({ now: new Date('2026-11-12T10:00:00.000Z'), doNotFake: ['nextTick', 'setImmediate'] });
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it("ends the work of the member's employee now, in the organization of the team", async () => {
		mockSetMemberWorkEnd.mockResolvedValue(undefined);
		const { view } = renderMembers();

		await act(() => view.result.current.deactivateMember('row-ana'));

		expect(mockSetMemberWorkEnd).toHaveBeenCalledWith({
			employeeId: 'employee-ana',
			organizationId: 'organization-1',
			tenantId: 'tenant-1',
			endWork: '2026-11-12T10:00:00.000Z'
		});
		expect(mockToast.success).toHaveBeenCalledWith('settings.members.DEACTIVATED:Member ana');
	});

	it('sends nothing for a member who became an admin while the confirmation was open', async () => {
		const { view, store } = renderMembers();
		const promoted = { ...TEAM, members: [member('admin', 'role-admin'), member('ana', 'role-admin')] };

		await act(async () => {
			store.set(organizationTeamsState, [promoted] as never);
		});
		await act(async () => {
			await expect(view.result.current.deactivateMember('row-ana')).rejects.toThrow();
		});

		expect(mockSetMemberWorkEnd).not.toHaveBeenCalled();
	});

	it('says why and passes the refusal on when the API refuses', async () => {
		mockSetMemberWorkEnd.mockRejectedValue({ status: 403 });
		const { view } = renderMembers();

		await act(async () => {
			await expect(view.result.current.deactivateMember('row-ana')).rejects.toEqual({ status: 403 });
		});

		expect(mockToast.success).not.toHaveBeenCalled();
		expect(mockToast.error).toHaveBeenCalledWith('settings.members.DEACTIVATE_FAILED:Member ana', {
			description: 'toasts.REASONS.PERMISSION:'
		});
	});
});

describe('changing the workspace role of a member', () => {
	it("gives the role to the member's account and shows it at once", async () => {
		let finish: () => void = () => undefined;
		mockAssignWorkspaceRole.mockReturnValue(
			new Promise<void>((resolve) => {
				finish = resolve;
			})
		);
		const { view, rowOf } = renderMembers();

		let saving: Promise<void> = Promise.resolve();
		await act(async () => {
			saving = view.result.current.changeWorkspaceRole('row-ana', 'role-viewer');
		});

		expect(mockAssignWorkspaceRole).toHaveBeenCalledWith({ userId: 'user-ana', roleId: 'role-viewer' });
		expect(rowOf('ana').workspaceRoleName).toBe('VIEWER');
		expect(rowOf('ana').isWorkspaceRolePending).toBe(true);

		await act(async () => {
			finish();
			await saving;
		});

		expect(rowOf('ana').isWorkspaceRolePending).toBe(false);
	});

	it('puts the role back and says why when the API refuses the change', async () => {
		mockAssignWorkspaceRole.mockRejectedValue({ status: 403 });
		const { view, rowOf } = renderMembers();

		await act(() => view.result.current.changeWorkspaceRole('row-ana', 'role-viewer'));

		expect(rowOf('ana').workspaceRoleName).toBe('EMPLOYEE');
		expect(rowOf('ana').canDeactivate).toBe(true);
		expect(mockToast.error).toHaveBeenCalledWith('settings.members.WORKSPACE_ROLE_NOT_SAVED:Member ana', {
			description: 'toasts.REASONS.PERMISSION:'
		});
	});

	it('offers no Deactivate on a member who is being made an admin', async () => {
		mockAssignWorkspaceRole.mockReturnValue(new Promise<void>(() => undefined));
		const { view, rowOf } = renderMembers();

		await act(async () => {
			void view.result.current.changeWorkspaceRole('row-ana', 'role-admin');
		});

		expect(rowOf('ana').workspaceRoleName).toBe('ADMIN');
		expect(rowOf('ana').canDeactivate).toBe(false);
	});

	it('sends no deactivation for a member who is being made an admin', async () => {
		mockAssignWorkspaceRole.mockReturnValue(new Promise<void>(() => undefined));
		const { view } = renderMembers();

		await act(async () => {
			void view.result.current.changeWorkspaceRole('row-ana', 'role-admin');
		});
		await act(async () => {
			await expect(view.result.current.deactivateMember('row-ana')).rejects.toThrow();
		});

		expect(mockSetMemberWorkEnd).not.toHaveBeenCalled();
	});

	it('offers Deactivate again only once the team read again carries the saved role', async () => {
		mockAssignWorkspaceRole.mockResolvedValue(undefined);
		const { view, rowOf, store } = renderMembers();

		await act(() => view.result.current.changeWorkspaceRole('row-ana', 'role-viewer'));

		expect(rowOf('ana').isWorkspaceRolePending).toBe(false);
		expect(rowOf('ana').canDeactivate).toBe(false);

		const readAgain = { ...TEAM, members: [member('admin', 'role-admin'), member('ana', 'role-viewer')] };
		await act(async () => {
			store.set(organizationTeamsState, [readAgain] as never);
		});

		expect(rowOf('ana').workspaceRoleName).toBe('VIEWER');
		expect(rowOf('ana').canDeactivate).toBe(true);
	});

	it('never sends a role the viewer is not offered, nor a change on a member out of their reach', async () => {
		const { view } = renderMembers();

		await act(async () => {
			await view.result.current.changeWorkspaceRole('row-ana', 'role-super-admin');
			await view.result.current.changeWorkspaceRole('row-ana', 'role-support');
			await view.result.current.changeWorkspaceRole('row-cy', 'role-employee');
			await view.result.current.changeWorkspaceRole('row-dee', 'role-employee');
			await view.result.current.changeWorkspaceRole('row-admin', 'role-employee');
		});

		expect(mockAssignWorkspaceRole).not.toHaveBeenCalled();
	});
});
