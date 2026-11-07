import {
	EEmployeeNotificationType,
	INotificationPreferences,
	INotificationQuietHours,
	TNotificationEmailMode
} from '@/core/types/interfaces/common/employee-notification';

export const NOTIFICATION_EMAIL_MODES: readonly TNotificationEmailMode[] = ['immediate', 'digest', 'off'];

/** The hour the digest goes out when the employee chose none. */
export const DEFAULT_DIGEST_HOUR = 8;

/** The window quiet hours start with when switched on. */
export const DEFAULT_QUIET_HOURS: Readonly<Pick<INotificationQuietHours, 'start' | 'end'>> = { start: '22:00', end: '07:00' };

const TIME_OF_DAY = /^([01]?\d|2[0-3]):([0-5]\d)$/;

export function isTimeOfDay(value: string): boolean {
	return TIME_OF_DAY.test(value.trim());
}

function isEmailMode(value: unknown): value is TNotificationEmailMode {
	return value === 'immediate' || value === 'digest' || value === 'off';
}

/** The email mode of every kind: `preferences.email`, `true` as at once, `false` as never, nothing as at once. */
export function defaultEmailModeOf(preferences: INotificationPreferences | null | undefined): TNotificationEmailMode {
	const value = preferences?.email;
	if (isEmailMode(value)) {
		return value;
	}
	if (value === false) {
		return 'off';
	}
	return 'immediate';
}

/** The email mode of one kind: its own, else the one of every kind. */
export function emailModeOf(
	preferences: INotificationPreferences | null | undefined,
	type: EEmployeeNotificationType
): TNotificationEmailMode {
	const own = preferences?.emailByType?.[type];
	if (isEmailMode(own)) {
		return own;
	}
	return defaultEmailModeOf(preferences);
}

/** The quiet hours, when set and well formed. */
export function quietHoursOf(preferences: INotificationPreferences | null | undefined): INotificationQuietHours | null {
	const window = preferences?.dnd;
	if (!window || !isTimeOfDay(String(window.start ?? '')) || !isTimeOfDay(String(window.end ?? ''))) {
		return null;
	}
	return window;
}

/** The digest hour, 0-23, else the default. */
export function digestHourOf(preferences: INotificationPreferences | null | undefined): number {
	const hour = preferences?.digestHour;
	return Number.isInteger(hour) && (hour as number) >= 0 && (hour as number) <= 23 ? (hour as number) : DEFAULT_DIGEST_HOUR;
}

/** The browser's time zone, which the quiet hours are saved in. */
export function browserTimeZone(): string {
	try {
		return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
	} catch {
		return 'UTC';
	}
}

/** The hours of a day as the locale names them (`08:00`, `8 AM`). */
export function digestHourLabel(hour: number, locale: string): string {
	try {
		return new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(new Date(2026, 0, 1, hour, 0));
	} catch {
		return `${String(hour).padStart(2, '0')}:00`;
	}
}

/** The preferences with a patch applied: the per-type modes and the window merge, a `null` window clears it. */
export function withPreferencePatch(
	current: INotificationPreferences | null | undefined,
	patch: Partial<INotificationPreferences>
): INotificationPreferences {
	const next: INotificationPreferences = { ...(current ?? {}), ...patch };
	if (patch.emailByType) {
		next.emailByType = { ...(current?.emailByType ?? {}), ...patch.emailByType };
	}
	if ('dnd' in patch) {
		next.dnd = patch.dnd ? { ...(current?.dnd ?? {}), ...patch.dnd } : null;
	}
	return next;
}
