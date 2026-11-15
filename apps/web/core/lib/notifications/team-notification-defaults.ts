import type {
	INotificationPreferences,
	TNotificationEmailMode
} from '@/core/types/interfaces/common/employee-notification';
import type { TOrganizationTeam } from '@/core/types/schemas';

/**
 * A team's defaults for its members' notifications (#5022), as Gauzy keeps them (`team-notification-defaults.ts`
 * there): what a member who chose nothing for a key of their own preferences gets. The member's own choice wins, key by
 * key, and kind by kind for the per-kind email modes and push switches. Unset changes nothing.
 */
export type TTeamNotificationDefaults = Pick<
	INotificationPreferences,
	'email' | 'emailByType' | 'push' | 'pushByType' | 'taskUpdate' | 'timerReminderHours' | 'taskDueReminderHours'
>;

/** The keys a team sets one value for, each offered with "Members choose" (the key left out). */
export type TTeamDefaultKey = 'email' | 'push' | 'taskUpdate' | 'timerReminderHours' | 'taskDueReminderHours';

/** The kinds a per-kind map sets: a kind set to `undefined` is unset, as it is once the map is sent as JSON. */
function setKindsOf<T>(byKind: Partial<Record<string, T>> | undefined): Partial<Record<string, T>> {
	return Object.fromEntries(Object.entries(byKind ?? {}).filter(([, value]) => value !== undefined));
}

/**
 * A member's preferences with their team's defaults under them, as Gauzy reads them (`withTeamNotificationDefaults`
 * there). Whatever the member chose wins at every level: for a kind, the member's own mode or switch for it, else the
 * member's own for every kind, else the team's for it, else the team's for every kind. So the team's per-kind modes
 * apply only while the member chose no `email` for every kind (and the same for `pushByType` and `push`), and the
 * `email: true` Gauzy writes in the setting it creates for a member who had none reads as unset.
 */
export function withTeamNotificationDefaults(
	own: INotificationPreferences | null | undefined,
	defaults: TTeamNotificationDefaults | null | undefined
): INotificationPreferences {
	const preferences = own ?? {};
	if (!defaults) return preferences;
	const merged: INotificationPreferences = { ...preferences };
	const ownEmail = preferences.email === true ? undefined : preferences.email;
	if (ownEmail === undefined) {
		if (defaults.email !== undefined) merged.email = defaults.email;
		if (defaults.emailByType) {
			merged.emailByType = { ...defaults.emailByType, ...setKindsOf(preferences.emailByType) };
		}
	}
	if (preferences.push === undefined) {
		if (defaults.push !== undefined) merged.push = defaults.push;
		if (defaults.pushByType) merged.pushByType = { ...defaults.pushByType, ...setKindsOf(preferences.pushByType) };
	}
	for (const key of ['taskUpdate', 'timerReminderHours', 'taskDueReminderHours'] as const) {
		if (preferences[key] === undefined && defaults[key] !== undefined) merged[key] = defaults[key] as never;
	}
	return merged;
}

/** A team as the defaults that apply to a member are picked from. */
type TTeamOfDefaults = Pick<TOrganizationTeam, 'id' | 'members' | 'isArchived'>;

/** Whether the employee is a member of the team in effect, as Gauzy counts one: a missing flag is in effect. */
function hasActiveMember(team: TTeamOfDefaults, employeeId: string): boolean {
	return (team.members ?? []).some(
		(member) => member.employeeId === employeeId && member.isActive !== false && member.isArchived !== true
	);
}

/**
 * The team whose defaults apply to a member, as Gauzy picks it (`teamNotificationDefaultsByEmployee`): the team they
 * work in when they are a member of it (Ever Teams saves the active team as the user's last team, the one Gauzy reads),
 * else their only team. A member of several teams who works in none of them gets no team's defaults.
 */
export function teamOfNotificationDefaults<T extends TTeamOfDefaults>(
	teams: readonly T[],
	activeTeamId: string | null | undefined,
	employeeId: string | null | undefined
): T | null {
	if (!employeeId) return null;
	const memberTeams = teams.filter((team) => team.isArchived !== true && hasActiveMember(team, employeeId));
	const current = memberTeams.find((team) => team.id === activeTeamId);
	if (current) return current;
	return memberTeams.length === 1 ? memberTeams[0] : null;
}

/**
 * The defaults once one key is set, or left to the members (`undefined`): the other keys stay as they are, and none
 * left is null, which the team saves as "no defaults".
 */
export function withTeamDefault<K extends TTeamDefaultKey>(
	defaults: TTeamNotificationDefaults | null | undefined,
	key: K,
	value: TTeamNotificationDefaults[K] | undefined
): TTeamNotificationDefaults | null {
	const next: TTeamNotificationDefaults = { ...defaults };
	if (value === undefined) {
		delete next[key];
	} else {
		next[key] = value;
	}
	return Object.keys(next).length ? next : null;
}

/** The email mode a team's `email` default names, `true` and `false` read as Gauzy reads them. */
export function teamEmailModeOf(value: TTeamNotificationDefaults['email']): TNotificationEmailMode | undefined {
	if (value === true) return 'immediate';
	if (value === false) return 'off';
	return value;
}
