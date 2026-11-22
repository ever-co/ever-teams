import type { TUser } from '@/core/types/schemas';

/**
 * Whether the signed-in user is known to have no member profile (no employee record) in the organization they work
 * in. Gauzy's `/user/me` leaves `employee` out for an account that is only a user there, such as an admin invited
 * without one: that account belongs to no team, so nothing scoped to a team ever loads for it.
 */
export function hasNoMemberProfile(user: TUser | null | undefined): boolean {
	if (!user) {
		return false;
	}
	const employeeId = user.employee?.id;
	return !employeeId;
}
