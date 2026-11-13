/** @jest-environment jsdom */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider, createStore } from 'jotai';
import { act, renderHook } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { activeTeamIdState, organizationTeamsState } from '@/core/stores';
import { currentOrganizationState } from '@/core/stores/user/user-organizations';
import { ERoleName } from '@/core/types/generics/enums/role';

let mockUser: { id: string; role: { name: string } } | null = null;
let mockPermissionsQuery = { myPermissions: [] as string[], isSuccess: true, isLoaded: true };
const mockUpdateMembership = jest.fn();
const mockUpdateEmployee = jest.fn();

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('sonner', () => ({ toast: { error: jest.fn(), success: jest.fn() } }));
jest.mock('@/core/hooks/queries/user-user.query', () => ({ useUserQuery: () => ({ data: mockUser }) }));
jest.mock('@/core/hooks/roles/use-my-role-permissions-query', () => ({
	useMyRolePermissionsQuery: () => mockPermissionsQuery
}));
jest.mock('@/core/hooks/organizations/teams/use-organization-teams-employee', () => ({
	useOrganizationEmployeeTeams: () => ({ updateOrganizationTeamEmployee: mockUpdateMembership })
}));
jest.mock('@/core/hooks/organizations/employees/use-employee', () => ({
	useEmployeeUpdate: () => ({ updateEmployeeAsync: mockUpdateEmployee })
}));
// The organization's read: the store holds what it read, `isError` says it failed
const mockOrganizationRead = { isError: false };
jest.mock('@/core/hooks/auth/use-current-organization', () => ({
	useGetCurrentOrganization: () => mockOrganizationRead
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
jest.mock('@/core/hooks/common/use-image-assets', () => ({ useImageAssets: () => ({ createImageAssets: jest.fn() }) }));

import { useTeamGeneralSettings } from './use-team-general-settings';
import { useTeamMembersSettings } from './use-team-members-settings';

/**
 * The tracking switch of the Members settings and of the Team settings (#5015), which share one rule and one save
 * (`useMemberTrackingSwitch`). Where the organization restricts the switch to higher roles, only someone of a higher
 * role switches a member's tracking, an admin also an admin's; elsewhere, the default, Gauzy's own permissions decide.
 */

/** The organization of the team, which restricts the switch to higher roles unless a test says otherwise. */
let organization: Record<string, unknown> | null;

/**
 * A row of the team: its user's tenant role (null when it did not load), and its place in the team (the MANAGER role
 * or the manager flag), with both tracking switches on unless stated.
 */
function member(
	key: string,
	userRole: ERoleName | null,
	place: { teamRole?: ERoleName; isManager?: boolean; teamTracking?: boolean; employeeTracking?: boolean } = {}
) {
	return {
		id: `row-${key}`,
		employeeId: `employee-${key}`,
		organizationId: 'organization-a',
		tenantId: 'tenant-a',
		organizationTeamId: 'team-a',
		isTrackingEnabled: place.teamTracking ?? true,
		isManager: place.isManager ?? false,
		role: place.teamRole ? { name: place.teamRole } : null,
		employee: {
			id: `employee-${key}`,
			userId: `user-${key}`,
			organizationId: 'organization-a',
			tenantId: 'tenant-a',
			isActive: true,
			isTrackingEnabled: place.employeeTracking ?? true,
			user: {
				id: `user-${key}`,
				name: key,
				email: `${key}@example.test`,
				role: userRole ? { name: userRole } : null
			}
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

/**
 * Signs in as the user of a row, with the role and permissions given. `refreshFailed`: the permissions were read once,
 * and a later refresh failed (the query keeps them). `loaded: false`: they were never read yet.
 */
function signInAs(
	key: string,
	role: ERoleName,
	permissions: string[] = [],
	{ loaded = true, refreshFailed = false } = {}
) {
	mockUser = { id: `user-${key}`, role: { name: role } };
	mockPermissionsQuery = {
		myPermissions: loaded ? permissions : [],
		isSuccess: loaded && !refreshFailed,
		isLoaded: loaded
	};
}

/** Renders a settings hook in the active team, made of these members. */
function renderInTeam<Result>(useSettings: () => Result, members: unknown[] = team.members) {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const store = createStore();
	store.set(currentOrganizationState, organization as never);
	store.set(organizationTeamsState, [{ ...team, members }] as never);
	store.set(activeTeamIdState, 'team-a');
	const wrapper = ({ children }: PropsWithChildren) => (
		<QueryClientProvider client={client}>
			<Provider store={store}>{children}</Provider>
		</QueryClientProvider>
	);
	return renderHook(useSettings, { wrapper });
}

const renderSettings = (members?: unknown[]) => renderInTeam(useTeamMembersSettings, members);

/** The rows that offer the tracking switch, by row key. */
function rowsWithSwitch(view: ReturnType<typeof renderSettings>) {
	return view.result.current.rows.filter((row) => row.showsTracking).map((row) => row.id.replace('row-', ''));
}

const rowOf = (view: ReturnType<typeof renderSettings>, key: string) => {
	const row = view.result.current.rows.find((candidate) => candidate.id === `row-${key}`);
	if (!row) throw new Error(`No row ${key}`);
	return row;
};

const teamSwitch = (enabled: boolean) => ({
	organizationId: 'organization-a',
	organizationTeamId: 'team-a',
	isTrackingEnabled: enabled
});

beforeEach(() => {
	jest.clearAllMocks();
	mockUpdateMembership.mockResolvedValue({ affected: 1 });
	mockUpdateEmployee.mockResolvedValue({});
	organization = { id: 'organization-a', name: 'Acme', restrictTrackingSwitchToHigherRoles: true };
	mockOrganizationRead.isError = false;
});

describe('Members settings: who gets the tracking switch on which row (#5015)', () => {
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

	it('gives a manager no switch on a member whose role did not load, who could be an admin: only an admin may', () => {
		const members = [...team.members, member('role-unknown', null)];

		signInAs('manager', ERoleName.EMPLOYEE);
		expect(rowOf(renderSettings(members), 'role-unknown').showsTracking).toBe(false);

		signInAs('admin', ERoleName.ADMIN, ['ORG_EMPLOYEES_EDIT']);
		expect(rowOf(renderSettings(members), 'role-unknown').showsTracking).toBe(true);
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

	it('keeps the switches usable after a refresh of the permissions failed, with the permissions read before', async () => {
		signInAs('admin', ERoleName.ADMIN, ['ORG_EMPLOYEES_EDIT'], { refreshFailed: true });
		const view = renderSettings();

		expect(rowOf(view, 'member').isTrackingPending).toBe(false);

		await act(() => view.result.current.setMemberTracking('row-member', false));

		expect(mockUpdateMembership).toHaveBeenCalledWith('row-member', teamSwitch(false));
		expect(mockUpdateEmployee).toHaveBeenCalledWith({
			id: 'employee-member',
			data: expect.objectContaining({ isTrackingEnabled: false })
		});
	});

	it('saves nothing while the permissions are not known yet: half of an admin save would be lost', async () => {
		signInAs('admin', ERoleName.ADMIN, ['ORG_EMPLOYEES_EDIT'], { loaded: false });
		const view = renderSettings();

		expect(rowOf(view, 'member').isTrackingPending).toBe(true);

		await act(() => view.result.current.setMemberTracking('row-member', false));

		expect(mockUpdateMembership).not.toHaveBeenCalled();
		expect(mockUpdateEmployee).not.toHaveBeenCalled();
		expect(rowOf(view, 'member').isTrackingEnabled).toBe(true);
	});
});

describe('Team settings: the switch of one’s own tracking (#5015)', () => {
	/** The signed-in user's own row, as a manager of the team, with their switch in the team and their own switch. */
	const ownManagerRow = (userRole: ERoleName, { team: teamTracking = true, employee = true } = {}) =>
		member('own', userRole, { isManager: true, teamTracking, employeeTracking: employee });

	const renderOwn = (row: ReturnType<typeof ownManagerRow>) => renderInTeam(useTeamGeneralSettings, [row]);

	it('is offered to an admin, who may act on themselves', () => {
		signInAs('own', ERoleName.ADMIN, ['ORG_EMPLOYEES_EDIT']);

		expect(renderOwn(ownManagerRow(ERoleName.ADMIN)).result.current.canTurnOwnTracking).toBe(true);
	});

	it('is not offered to a team manager, who waits for an admin', () => {
		signInAs('own', ERoleName.EMPLOYEE);

		expect(renderOwn(ownManagerRow(ERoleName.EMPLOYEE)).result.current.canTurnOwnTracking).toBe(false);
	});

	it('shows whether the admin can track: their own switch counts, not only the team one', () => {
		signInAs('own', ERoleName.ADMIN, ['ORG_EMPLOYEES_EDIT']);

		const view = renderOwn(ownManagerRow(ERoleName.ADMIN, { employee: false }));

		expect(view.result.current.ownTracking).toBe(false);
	});

	it('turns both of the admin’s switches on, as the Members settings do', async () => {
		signInAs('own', ERoleName.ADMIN, ['ORG_EMPLOYEES_EDIT']);
		const view = renderOwn(ownManagerRow(ERoleName.ADMIN, { employee: false }));

		await act(() => view.result.current.setOwnTracking(true));

		expect(mockUpdateMembership).toHaveBeenCalledWith('row-own', {
			organizationId: 'organization-a',
			organizationTeamId: 'team-a',
			isTrackingEnabled: true
		});
		expect(mockUpdateEmployee).toHaveBeenCalledWith({
			id: 'employee-own',
			data: expect.objectContaining({ id: 'employee-own', isTrackingEnabled: true })
		});
	});

	it('waits for the permissions before the admin can use it, and saves nothing before', async () => {
		signInAs('own', ERoleName.ADMIN, ['ORG_EMPLOYEES_EDIT'], { loaded: false });
		const view = renderOwn(ownManagerRow(ERoleName.ADMIN, { employee: false }));

		expect(view.result.current.isOwnTrackingPending).toBe(true);
		await expect(view.result.current.setOwnTracking(true)).rejects.toThrow();
		expect(mockUpdateMembership).not.toHaveBeenCalled();
		expect(mockUpdateEmployee).not.toHaveBeenCalled();
	});

	it('is ready once the permissions are known', () => {
		signInAs('own', ERoleName.ADMIN, ['ORG_EMPLOYEES_EDIT']);

		expect(renderOwn(ownManagerRow(ERoleName.ADMIN)).result.current.isOwnTrackingPending).toBe(false);
	});
});

/** The default: Gauzy writes the team switch for an admin or a team manager, the own one for ORG_EMPLOYEES_EDIT. */
describe('Members settings where the organization does not restrict the switch (#5015)', () => {
	beforeEach(() => {
		organization = { ...organization, restrictTrackingSwitchToHigherRoles: false };
	});

	it('gives a team manager the switch on every row, their own and the other managers’ included', () => {
		signInAs('manager', ERoleName.EMPLOYEE);

		expect(rowsWithSwitch(renderSettings())).toEqual(team.members.map((row) => row.id.replace('row-', '')));
	});

	it('still gives a member the switch on no row: Gauzy does not let them write it', () => {
		signInAs('member', ERoleName.EMPLOYEE);

		expect(rowsWithSwitch(renderSettings())).toEqual([]);
	});

	it("moves only a team manager's own switch in the team, as they may not write the employee one", async () => {
		signInAs('manager', ERoleName.EMPLOYEE);
		const view = renderSettings();

		await act(() => view.result.current.setMemberTracking('row-manager', false));

		expect(mockUpdateMembership).toHaveBeenCalledWith('row-manager', teamSwitch(false));
		expect(mockUpdateEmployee).not.toHaveBeenCalled();
	});

	it('moves the employee switch too for a holder of ORG_EMPLOYEES_EDIT, whatever the member’s role', async () => {
		signInAs('flagged-manager', ERoleName.EMPLOYEE, ['ORG_EMPLOYEES_EDIT']);
		const view = renderSettings();

		await act(() => view.result.current.setMemberTracking('row-admin', false));

		expect(mockUpdateMembership).toHaveBeenCalledWith('row-admin', teamSwitch(false));
		expect(mockUpdateEmployee).toHaveBeenCalledWith({
			id: 'employee-admin',
			data: expect.objectContaining({ isTrackingEnabled: false })
		});
	});

	it('reads an organization that does not state the setting (an older Gauzy) as not restricting it', () => {
		const olderGauzyOrganization = { ...organization };
		delete olderGauzyOrganization.restrictTrackingSwitchToHigherRoles;
		organization = olderGauzyOrganization;
		signInAs('manager', ERoleName.EMPLOYEE);

		expect(rowOf(renderSettings(), 'manager').showsTracking).toBe(true);
	});
});

/** The organization says whether the ranks apply: nothing is offered or saved on a guess (#5015). */
describe('Members settings while the organization is not known', () => {
	it('keeps the tracking switches waiting, and saves nothing, until the organization is read', async () => {
		organization = null;
		signInAs('manager', ERoleName.EMPLOYEE);
		const view = renderSettings();

		expect(rowOf(view, 'member').isTrackingPending).toBe(true);

		await act(() => view.result.current.setMemberTracking('row-member', false));

		expect(mockUpdateMembership).not.toHaveBeenCalled();
	});

	it('keeps the ranks when the organization could not be read, which offer no switch Gauzy would refuse', () => {
		organization = null;
		mockOrganizationRead.isError = true;
		signInAs('manager', ERoleName.EMPLOYEE);
		const view = renderSettings();

		expect(rowsWithSwitch(view)).toEqual(['member', 'member-off-by-admin']);
		expect(rowOf(view, 'member').isTrackingPending).toBe(false);
	});
});

describe('Team settings where the organization does not restrict the switch (#5015)', () => {
	beforeEach(() => {
		organization = { ...organization, restrictTrackingSwitchToHigherRoles: false };
	});

	it('offers a team manager the switch of their own tracking', () => {
		signInAs('own', ERoleName.EMPLOYEE);
		const ownRow = member('own', ERoleName.EMPLOYEE, { isManager: true });

		expect(renderInTeam(useTeamGeneralSettings, [ownRow]).result.current.canTurnOwnTracking).toBe(true);
	});
});
