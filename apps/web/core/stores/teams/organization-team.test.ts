import { createStore } from 'jotai';
import type { TOrganizationTeam, TUser } from '@/core/types/schemas';
import { userState } from '../user/user';
import { activeTeamIdState, canManageActiveTeamState, organizationTeamsState } from './organization-team';

function userWithRole(id: string, roleName: string): TUser {
	return { id, role: { name: roleName } } as unknown as TUser;
}

function member(userId: string, isManager: boolean) {
	return { id: `member-${userId}`, isManager, employee: { userId } };
}

function team(id: string, members: ReturnType<typeof member>[]): TOrganizationTeam {
	return { id, name: id, createdByUserId: 'user-creator', members } as unknown as TOrganizationTeam;
}

const ACTIVE_TEAM = team('team-a', [member('user-manager', true), member('user-employee', false)]);
const OTHER_TEAM = team('team-b', [member('user-other-manager', true)]);

function canManageActiveTeamAs(user: TUser): boolean {
	const store = createStore();
	store.set(userState, user);
	store.set(organizationTeamsState, [ACTIVE_TEAM, OTHER_TEAM]);
	store.set(activeTeamIdState, 'team-a');
	return store.get(canManageActiveTeamState);
}

describe('canManageActiveTeamState', () => {
	it('lets an organization admin manage a team they are not a member of', () => {
		expect(canManageActiveTeamAs(userWithRole('user-admin', 'ADMIN'))).toBe(true);
		expect(canManageActiveTeamAs(userWithRole('user-super-admin', 'SUPER_ADMIN'))).toBe(true);
	});

	it('lets a manager of the active team manage it', () => {
		expect(canManageActiveTeamAs(userWithRole('user-manager', 'EMPLOYEE'))).toBe(true);
	});

	it('refuses a plain employee of the team', () => {
		expect(canManageActiveTeamAs(userWithRole('user-employee', 'EMPLOYEE'))).toBe(false);
	});

	it('refuses the manager of another team, even with the MANAGER role', () => {
		expect(canManageActiveTeamAs(userWithRole('user-other-manager', 'MANAGER'))).toBe(false);
	});
});
