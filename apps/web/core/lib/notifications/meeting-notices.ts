import { EBaseEntityEnum } from '@/core/types/generics/enums/entity';
import {
	EEmployeeNotificationType,
	type INotificationPreferences
} from '@/core/types/interfaces/common/employee-notification';

/** What a meeting notification tells: invited, no longer invited, changed, cancelled, starting soon, or starting. */
type MeetingNoticeKind = 'invited' | 'removed' | 'changed' | 'cancelled' | 'reminder' | 'starting';

/** A meeting notification, read in the reader's language. */
export interface MeetingNotice {
	kind: MeetingNoticeKind;
	/** The meeting's title, as the notification quotes it. */
	title: string | null;
	/** For a reminder, how many minutes were left until the start when it was filed. */
	minutes: number | null;
	/** The meeting's appointment. */
	appointmentId: string | null;
}

/**
 * The titles Gauzy files for a meeting (`meeting-notification.rules.ts` there), which are its only record of the kind:
 * the notification has no field of its own for it. Pinned word for word by a test on each side ("the titles Gauzy
 * files" here, "the titles Ever Teams reads back" there): change both, or neither. The titles whose ending is fixed
 * are read before the reminder's, whose ending varies: a meeting titled `Sync" starts in 5 minutes` that is starting
 * stays a meeting that is starting.
 */
const TITLES: ReadonlyArray<{ kind: MeetingNoticeKind; pattern: RegExp }> = [
	{ kind: 'invited', pattern: /^You are invited to "(.*)"$/ },
	{ kind: 'removed', pattern: /^You are no longer invited to "(.*)"$/ },
	{ kind: 'changed', pattern: /^"(.*)" was changed$/ },
	{ kind: 'cancelled', pattern: /^"(.*)" was cancelled$/ },
	{ kind: 'starting', pattern: /^"(.*)" is starting$/ },
	{ kind: 'reminder', pattern: /^"(.*)" starts in (.+)$/ }
];

/** `in 15 minutes`, `in 1 hour 30 minutes`, `in 2 hours`: the minutes they name, or null. */
export function minutesOfLeadText(text: string): number | null {
	const match = /^(?:(\d+) hours?)?\s*(?:(\d+) minutes?)?$/.exec(text.trim());
	if (!match || (!match[1] && !match[2])) {
		return null;
	}
	return Number(match[1] ?? 0) * 60 + Number(match[2] ?? 0);
}

/**
 * The meeting notice a notification carries, or null when it is no meeting notification. A title of another shape
 * (written by a newer platform) still reads as a notice about the meeting, of the closest kind: a change.
 */
export function meetingNoticeOf(notification: {
	type?: string | null;
	title?: string | null;
	entity?: string | null;
	entityId?: string | null;
}): MeetingNotice | null {
	if (notification.type !== EEmployeeNotificationType.Meeting) {
		return null;
	}
	const title = (notification.title ?? '').trim();
	const appointmentId =
		notification.entity === EBaseEntityEnum.EmployeeAppointment && notification.entityId
			? String(notification.entityId)
			: null;
	for (const { kind, pattern } of TITLES) {
		const match = pattern.exec(title);
		if (match) {
			const quoted = match[1].trim();
			return {
				kind,
				title: quoted || null,
				minutes: kind === 'reminder' ? minutesOfLeadText(match[2].replace(/^in\s+/, '')) : null,
				appointmentId
			};
		}
	}
	return { kind: 'changed', title: null, minutes: null, appointmentId };
}

/** The meetings page, where a meeting notification leads. */
export const MEETINGS_HREF = '/meet';

/** How many minutes before a meeting its reminder comes when the person chose none (Gauzy's default). */
const DEFAULT_MEETING_REMINDER_MINUTES = 15;

/** The leads the settings offer. */
export const MEETING_REMINDER_MINUTE_CHOICES: readonly number[] = [5, 10, 15, 30, 60];

/**
 * The person's lead in minutes, or null for no reminder before a meeting (`meetingReminderMinutes: null` or 0), as
 * Gauzy reads it: a value that is no whole number of minutes in (0, 1440] is the default.
 */
export function meetingReminderMinutesOf(preferences: INotificationPreferences | null | undefined): number | null {
	const minutes = preferences?.meetingReminderMinutes;
	if (minutes === null || minutes === 0) {
		return null;
	}
	const isValid = typeof minutes === 'number' && Number.isInteger(minutes) && minutes > 0 && minutes <= 24 * 60;
	return isValid ? minutes : DEFAULT_MEETING_REMINDER_MINUTES;
}
