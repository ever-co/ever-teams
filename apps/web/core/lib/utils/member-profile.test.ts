import type { TUser } from '@/core/types/schemas';
import { hasNoMemberProfile, isInNoTeamForLackOfMemberProfile } from './member-profile';

function userWith(employee: unknown): TUser {
	return { id: 'user-1', tenantId: 'tenant-1', employee } as TUser;
}

describe('hasNoMemberProfile', () => {
	it('knows nothing yet while the user is not read', () => {
		expect(hasNoMemberProfile(undefined)).toBe(false);
		expect(hasNoMemberProfile(null)).toBe(false);
	});

	it('is false for a user whose /user/me carries an employee', () => {
		expect(hasNoMemberProfile(userWith({ id: 'employee-1', organizationId: 'org-1' }))).toBe(false);
	});

	it('is true for a user whose /user/me carries no employee, as for an admin invited without one', () => {
		expect(hasNoMemberProfile(userWith(undefined))).toBe(true);
		expect(hasNoMemberProfile(userWith(null))).toBe(true);
		expect(hasNoMemberProfile(userWith({}))).toBe(true);
	});
});

describe('isInNoTeamForLackOfMemberProfile', () => {
	it('is true for a user without a member profile while no team is shown', () => {
		expect(isInNoTeamForLackOfMemberProfile(userWith(undefined), 0)).toBe(true);
	});

	it('keeps the teams a tab already shows when a later read misses the employee', () => {
		expect(isInNoTeamForLackOfMemberProfile(userWith(undefined), 2)).toBe(false);
	});

	it('is false for a user with a member profile, and while the user is not read', () => {
		expect(isInNoTeamForLackOfMemberProfile(userWith({ id: 'employee-1' }), 0)).toBe(false);
		expect(isInNoTeamForLackOfMemberProfile(undefined, 0)).toBe(false);
	});
});
