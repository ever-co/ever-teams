import type {
	INotificationPreferences,
	TNotificationEmailMode
} from '@/core/types/interfaces/common/employee-notification';

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

/** A member's preferences with their team's defaults under them, as Gauzy reads them. */
export function withTeamNotificationDefaults(
	own: INotificationPreferences | null | undefined,
	defaults: TTeamNotificationDefaults | null | undefined
): INotificationPreferences {
	const preferences = own ?? {};
	if (!defaults) return preferences;
	const merged: INotificationPreferences = { ...preferences };
	for (const [key, value] of Object.entries(defaults) as Array<[keyof TTeamNotificationDefaults, unknown]>) {
		if (key === 'emailByType' || key === 'pushByType') {
			merged[key] = { ...(value as object), ...(preferences[key] ?? {}) } as never;
		} else if (preferences[key] === undefined) {
			merged[key] = value as never;
		}
	}
	return merged;
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
	const next: TTeamNotificationDefaults = { ...(defaults ?? {}) };
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
