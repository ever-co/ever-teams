import { isTenantAdminRole } from '@/core/lib/utils/roles';
import { ERoleName } from '@/core/types/generics/enums/role';

/**
 * The rank a person holds for turning someone's time tracking on or off, as Gauzy ranks it before it accepts the
 * change: SUPER_ADMIN and ADMIN are admins and count as equal, MANAGER is below them, every other role is a member.
 */
export type TrackingSwitchRank = 'member' | 'manager' | 'admin';

const RANK_ORDER: Record<TrackingSwitchRank, number> = { member: 0, manager: 1, admin: 2 };

/** The rank a tenant role gives. */
export function rankOfRole(roleName: string | null | undefined): TrackingSwitchRank {
	if (isTenantAdminRole(roleName)) {
		return 'admin';
	}
	if (roleName === ERoleName.MANAGER) {
		return 'manager';
	}
	return 'member';
}

/** The rank a person holds in a team: their role's, raised to manager when they manage the team. */
export function rankInTeam(roleRank: TrackingSwitchRank, managesTeam: boolean): TrackingSwitchRank {
	if (managesTeam && roleRank === 'member') {
		return 'manager';
	}
	return roleRank;
}

/**
 * Whether someone may turn another person's time tracking on or off: only a higher rank may, and an admin may also act
 * on an admin, themselves included. A manager therefore acts on members only, never on themselves or another manager,
 * and a member acts on no one.
 */
export function mayTurnTrackingOf(actor: TrackingSwitchRank, target: TrackingSwitchRank): boolean {
	if (actor === 'admin') {
		return true;
	}
	return RANK_ORDER[actor] > RANK_ORDER[target];
}

/**
 * `mayTurnTrackingOf` for a person known by their role, which may not have loaded. An unknown role could be an
 * admin's, so only an admin, who may act on anyone, may act on that person.
 *
 * @param actor The rank of the person changing the switch.
 * @param targetRoleName The tenant role of the person whose switch changes, when known.
 * @param managesTeam Whether that person manages the team the switch belongs to.
 */
export function mayTurnTrackingOfRole(
	actor: TrackingSwitchRank,
	targetRoleName: string | null | undefined,
	managesTeam = false
): boolean {
	if (!targetRoleName) {
		return actor === 'admin';
	}
	return mayTurnTrackingOf(actor, rankInTeam(rankOfRole(targetRoleName), managesTeam));
}
