import type { TUser } from '@/core/types/schemas';
import { hasNoMemberProfile } from './member-profile';

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
