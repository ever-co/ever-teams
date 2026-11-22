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

/**
 * Whether the app treats the signed-in user as in no team for lack of a member profile. Teams a tab already shows stay:
 * a later read of `/user/me` that misses the employee hides nothing.
 */
export function isInNoTeamForLackOfMemberProfile(user: TUser | null | undefined, shownTeamCount: number): boolean {
	const showsNoTeam = shownTeamCount === 0;
	return hasNoMemberProfile(user) && showsNoTeam;
}
