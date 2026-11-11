/** @jest-environment jsdom */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider, createStore } from 'jotai';
import { act, renderHook } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { activeTeamIdState, organizationTeamsState } from '@/core/stores';
import { ERoleName } from '@/core/types/generics/enums/role';

let mockUser: { id: string; role: { name: string } } | null = null;
let mockPermissions: string[] = [];
const mockUpdateMembership = jest.fn();
const mockUpdateEmployee = jest.fn();

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('sonner', () => ({ toast: { error: jest.fn(), success: jest.fn() } }));
jest.mock('@/core/hooks/queries/user-user.query', () => ({ useUserQuery: () => ({ data: mockUser }) }));
jest.mock('@/core/hooks/roles/use-my-role-permissions-query', () => ({
	useMyRolePermissionsQuery: () => ({ myPermissions: mockPermissions, isSuccess: true })
}));
jest.mock('@/core/hooks/organizations/teams/use-organization-teams-employee', () => ({
	useOrganizationEmployeeTeams: () => ({ updateOrganizationTeamEmployee: mockUpdateMembership })
}));
jest.mock('@/core/hooks/organizations/employees/use-employee', () => ({
	useEmployeeUpdate: () => ({ updateEmployeeAsync: mockUpdateEmployee })
}));
jest.mock('@/core/hooks/organizations/teams/use-edit-organization-team', () => ({
	useEditOrganizationTeam: () => ({ editOrganizationTeam: jest.fn() })
}));
jest.mock('@/core/hooks/organizations/teams/use-delete-task', () => ({
	useDeleteTask: () => ({ deleteEmployeeFromTasks: jest.fn() })
}));
jest.mock('@/core/hooks/users/use-settings', () => ({ useSettings: () => ({ updateAvatar: jest.fn() }) }));
jest.mock('@/core/hooks/organizations/rates/use-rates', () => ({
	useEmployeeRatesMutation: () => ({ saveEmployeeRates: jest.fn() })
}));

import { useTeamMembersSettings } from './use-team-members-settings';

/**
 * A row of the team: its user's tenant role, and its place in the team (the MANAGER role or the manager flag), with
 * both tracking switches on unless stated.
 */
function member(
	key: string,
	userRole: ERoleName,
	place: { teamRole?: ERoleName; isManager?: boolean; employeeTracking?: boolean } = {}
) {
	return {
		id: `row-${key}`,
		employeeId: `employee-${key}`,
		organizationId: 'organization-a',
		tenantId: 'tenant-a',
		organizationTeamId: 'team-a',
		isTrackingEnabled: true,
		isManager: place.isManager ?? false,
		role: place.teamRole ? { name: place.teamRole } : null,
		employee: {
			id: `employee-${key}`,
			userId: `user-${key}`,
			organizationId: 'organization-a',
			tenantId: 'tenant-a',
			isActive: true,
			isTrackingEnabled: place.employeeTracking ?? true,
			user: { id: `user-${key}`, name: key, email: `${key}@example.test`, role: { name: userRole } }
		}
	};
}

const team = {
	id: 'team-a',
	name: 'Team A',
	organizationId: 'organization-a',
	tenantId: 'tenant-a',
	members: [
		member('admin', ERoleName.ADMIN),
		member('super-admin', ERoleName.SUPER_ADMIN),
		member('manager', ERoleName.EMPLOYEE, { teamRole: ERoleName.MANAGER }),
		member('flagged-manager', ERoleName.EMPLOYEE, { isManager: true }),
		member('member', ERoleName.EMPLOYEE),
		member('member-off-by-admin', ERoleName.EMPLOYEE, { employeeTracking: false }),
		member('tenant-manager', ERoleName.MANAGER)
	]
};

/** Signs in as the user of a row, with the role and permissions given. */
function signInAs(key: string, role: ERoleName, permissions: string[] = []) {
	mockUser = { id: `user-${key}`, role: { name: role } };
	mockPermissions = permissions;
}

function renderSettings() {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const store = createStore();
	store.set(organizationTeamsState, [team] as never);
	store.set(activeTeamIdState, 'team-a');
	const wrapper = ({ children }: PropsWithChildren) => (
		<QueryClientProvider client={client}>
			<Provider store={store}>{children}</Provider>
		</QueryClientProvider>
	);
	return renderHook(() => useTeamMembersSettings(), { wrapper });
}

/** The rows that offer the tracking switch, by row key. */
function rowsWithSwitch(view: ReturnType<typeof renderSettings>) {
	return view.result.current.rows.filter((row) => row.showsTracking).map((row) => row.id.replace('row-', ''));
}

const rowOf = (view: ReturnType<typeof renderSettings>, key: string) => {
	const row = view.result.current.rows.find((candidate) => candidate.id === `row-${key}`);
	if (!row) throw new Error(`No row ${key}`);
	return row;
};

describe('Members settings: who gets the tracking switch on which row (#5015)', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockUpdateMembership.mockResolvedValue({ affected: 1 });
		mockUpdateEmployee.mockResolvedValue({});
	});

	it('gives an admin the switch on every row: admins (themselves included), managers and members', () => {
		signInAs('admin', ERoleName.ADMIN, ['ORG_EMPLOYEES_EDIT']);

		expect(rowsWithSwitch(renderSettings())).toEqual(team.members.map((row) => row.id.replace('row-', '')));
	});

	it('gives a super admin the switch on an admin row, as admins rank the same', () => {
		signInAs('super-admin', ERoleName.SUPER_ADMIN, ['ORG_EMPLOYEES_EDIT']);

		expect(rowOf(renderSettings(), 'admin').showsTracking).toBe(true);
	});

	it.each([
		{ who: 'a manager holding the MANAGER role in the team', key: 'manager' },
		{ who: 'a manager flagged on the team', key: 'flagged-manager' }
	])('gives $who the switch on the members only', ({ key }) => {
		signInAs(key, ERoleName.EMPLOYEE);

		// Not on themselves, another manager, a MANAGER, nor an admin
		expect(rowsWithSwitch(renderSettings())).toEqual(['member', 'member-off-by-admin']);
	});

	it('gives a member the switch on no row, their own included', () => {
		signInAs('member', ERoleName.EMPLOYEE);

		expect(rowsWithSwitch(renderSettings())).toEqual([]);
	});

	it('gives a user whose role is MANAGER no switch in a team they do not manage: Gauzy would refuse it', () => {
		signInAs('tenant-manager', ERoleName.MANAGER);

		expect(rowsWithSwitch(renderSettings())).toEqual([]);
	});

	it("shows a manager a member's switch disabled, with the reason, when an admin turned their own switch off", () => {
		signInAs('manager', ERoleName.EMPLOYEE);
		const view = renderSettings();

		expect(rowOf(view, 'member-off-by-admin')).toMatchObject({
			showsTracking: true,
			isTrackingEnabled: false,
			isTrackingLocked: true
		});
		expect(rowOf(view, 'member').isTrackingLocked).toBe(false);
	});

	it('leaves that switch to an admin, who can turn it back on', () => {
		signInAs('admin', ERoleName.ADMIN, ['ORG_EMPLOYEES_EDIT']);

		expect(rowOf(renderSettings(), 'member-off-by-admin')).toMatchObject({
			showsTracking: true,
			isTrackingLocked: false
		});
	});
});

describe('Members settings: what the tracking switch writes (#5015)', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockUpdateMembership.mockResolvedValue({ affected: 1 });
		mockUpdateEmployee.mockResolvedValue({});
	});

	const teamSwitch = (enabled: boolean) => ({
		organizationId: 'organization-a',
		organizationTeamId: 'team-a',
		isTrackingEnabled: enabled
	});

	it("moves a manager's switch in the team, and their own switch, when an admin turns it off", async () => {
		signInAs('admin', ERoleName.ADMIN, ['ORG_EMPLOYEES_EDIT']);
		const view = renderSettings();

		await act(() => view.result.current.setMemberTracking('row-manager', false));

		expect(mockUpdateMembership).toHaveBeenCalledWith('row-manager', teamSwitch(false));
		expect(mockUpdateEmployee).toHaveBeenCalledWith({
			id: 'employee-manager',
			data: expect.objectContaining({ id: 'employee-manager', isTrackingEnabled: false })
		});
	});

	it("turns a member's own switch back on with the team one when an admin turns their tracking on", async () => {
		signInAs('admin', ERoleName.ADMIN, ['ORG_EMPLOYEES_EDIT']);
		const view = renderSettings();

		await act(() => view.result.current.setMemberTracking('row-member-off-by-admin', true));

		expect(mockUpdateMembership).toHaveBeenCalledWith('row-member-off-by-admin', teamSwitch(true));
		expect(mockUpdateEmployee).toHaveBeenCalledWith({
			id: 'employee-member-off-by-admin',
			data: expect.objectContaining({ isTrackingEnabled: true })
		});
	});

	it("moves only the member's switch in the team when their manager turns it off", async () => {
		signInAs('manager', ERoleName.EMPLOYEE);
		const view = renderSettings();

		await act(() => view.result.current.setMemberTracking('row-member', false));

		expect(mockUpdateMembership).toHaveBeenCalledWith('row-member', teamSwitch(false));
		expect(mockUpdateEmployee).not.toHaveBeenCalled();
	});

	it('puts the team switch back, and the row with it, when the own switch could not follow', async () => {
		signInAs('admin', ERoleName.ADMIN, ['ORG_EMPLOYEES_EDIT']);
		mockUpdateEmployee.mockRejectedValue(new Error('403'));
		const view = renderSettings();

		await act(() => view.result.current.setMemberTracking('row-member', false));

		expect(mockUpdateMembership).toHaveBeenNthCalledWith(1, 'row-member', teamSwitch(false));
		expect(mockUpdateMembership).toHaveBeenNthCalledWith(2, 'row-member', teamSwitch(true));
		expect(rowOf(view, 'member')).toMatchObject({ isTrackingEnabled: true, isTrackingPending: false });
	});
});
