import type { OT_Member } from '../../app/services/interfaces/IOrganizationTeam';
import type { IUser } from '../../app/services/interfaces/IUserData';

/**
 * The id the Tasks tab opens the person's own profile with: a user id, as every other link to a profile. The
 * membership's own id is not one, and with it the profile took the person for someone else: no Now section, no own
 * actions. Outside a team, the person signed in.
 */
export function ownTasksUserIdOf(
	currentMember: OT_Member | null | undefined,
	user: IUser | null | undefined
): string | undefined {
	return currentMember?.employee?.userId ?? user?.id ?? undefined;
}
