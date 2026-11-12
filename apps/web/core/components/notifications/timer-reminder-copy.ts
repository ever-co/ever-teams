import type { useTranslations } from 'next-intl';
import type { TimerReminderNotice } from '@/core/lib/notifications/timer-reminders';

type Translate = ReturnType<typeof useTranslations>;

/**
 * A timer reminder's sentence in the reader's language, as its toast says it: the hours the run had reached. The
 * platform writes its own in English; a title this app does not know gives the general one.
 */
export function timerReminderSentenceOf(t: Translate, notice: TimerReminderNotice): string {
	if (notice.hours === null) {
		return t('notifications.EVENTS.TIMER_REMINDER');
	}
	return t(
		notice.level === 1 ? 'notifications.TIMER_REMINDER.LONG_TITLE' : 'notifications.TIMER_REMINDER.FORGOTTEN_TITLE',
		{ hours: notice.hours }
	);
}

/** What to do about it, in the reader's language, as the toast says it. */
export function timerReminderDescriptionOf(t: Translate, notice: TimerReminderNotice): string {
	return t(
		notice.level === 1
			? 'notifications.TIMER_REMINDER.LONG_DESCRIPTION'
			: 'notifications.TIMER_REMINDER.FORGOTTEN_DESCRIPTION'
	);
}
