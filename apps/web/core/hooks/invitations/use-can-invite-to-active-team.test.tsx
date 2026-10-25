/** @jest-environment jsdom */

import { renderHook } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import type { PropsWithChildren } from 'react';

import { activeTeamIdState, organizationTeamsState } from '@/core/stores';
import type { TOrganizationTeam } from '@/core/types/schemas';

const TEAM_ID = 'team-1';
const OTHER_TEAM_ID = 'team-2';

const signedInUser = { id: 'user-1', employee: { id: 'employee-1', userId: 'user-1' } };
let mockUser: typeof signedInUser | undefined = signedInUser;
const mockPermissions = { myPermissions: [] as string[] };

jest.mock('../queries/user-user.query', () => ({
	useUserQuery: () => ({ data: mockUser })
}));
jest.mock('../roles/use-my-role-permissions-query', () => ({
	useMyRolePermissionsQuery: () => mockPermissions
}));

import { useCanInviteToActiveTeam } from './use-can-invite-to-active-team';

type TMembership = Record<string, unknown>;

/** The signed-in user's membership of a team: a plain member unless overridden. */
function ownMembership(overrides: TMembership = {}): TMembership {
	return {
		id: 'membership-1',
		employeeId: 'employee-1',
		employee: { id: 'employee-1', userId: 'user-1' },
		isManager: false,
		role: null,
		...overrides
	};
}

const colleagueManager = {
	id: 'membership-2',
	employeeId: 'employee-2',
	employee: { id: 'employee-2', userId: 'user-2' },
	isManager: true,
	role: null
};

function team(id: string, members: TMembership[], extra: Record<string, unknown> = {}) {
	return { id, name: id, members, ...extra };
}

function canInviteWith(teams: Array<Record<string, unknown>>, activeTeamId: string = TEAM_ID) {
	const store = createStore();
	store.set(organizationTeamsState, teams as unknown as TOrganizationTeam[]);
	store.set(activeTeamIdState, activeTeamId);
	const wrapper = ({ children }: PropsWithChildren) => <Provider store={store}>{children}</Provider>;
	const { result } = renderHook(() => useCanInviteToActiveTeam(), { wrapper });
	return result.current;
}

describe('useCanInviteToActiveTeam', () => {
	beforeEach(() => {
		mockUser = signedInUser;
		mockPermissions.myPermissions = [];
	});

	it('refuses a plain member of the active team', () => {
		const activeTeam = team(TEAM_ID, [ownMembership(), colleagueManager]);

		expect(canInviteWith([activeTeam])).toBe(false);
	});

	it('accepts a member flagged as manager of the active team', () => {
		const activeTeam = team(TEAM_ID, [ownMembership({ isManager: true })]);

		expect(canInviteWith([activeTeam])).toBe(true);
	});

	it.each(['MANAGER', 'ADMIN', 'SUPER_ADMIN'])('accepts the %s team role', (roleName) => {
		const activeTeam = team(TEAM_ID, [ownMembership({ role: { name: roleName } })]);

		expect(canInviteWith([activeTeam])).toBe(true);
	});

	it('finds the membership through the employee user as well', () => {
		const membership = ownMembership({ isManager: true, employee: { id: 'employee-1', user: { id: 'user-1' } } });
		const activeTeam = team(TEAM_ID, [membership]);

		expect(canInviteWith([activeTeam])).toBe(true);
	});

	it('accepts the user who created the active team', () => {
		const activeTeam = team(TEAM_ID, [ownMembership()], { createdByUserId: 'user-1' });

		expect(canInviteWith([activeTeam])).toBe(true);
	});

	it.each(['ALL_ORG_VIEW', 'ALL_ORG_EDIT', 'CHANGE_SELECTED_EMPLOYEE'])(
		'accepts a plain member whose role holds %s',
		(permission) => {
			mockPermissions.myPermissions = [permission];
			const activeTeam = team(TEAM_ID, [ownMembership()]);

			expect(canInviteWith([activeTeam])).toBe(true);
		}
	);

	it('does not count a team the user manages when another team is active', () => {
		const activeTeam = team(TEAM_ID, [ownMembership()]);
		const managedTeam = team(OTHER_TEAM_ID, [ownMembership({ isManager: true })]);

		expect(canInviteWith([activeTeam, managedTeam])).toBe(false);
	});

	it('refuses when nobody is signed in', () => {
		mockUser = undefined;
		const activeTeam = team(TEAM_ID, [ownMembership({ isManager: true })], { createdByUserId: 'user-1' });

		expect(canInviteWith([activeTeam])).toBe(false);
	});
});
