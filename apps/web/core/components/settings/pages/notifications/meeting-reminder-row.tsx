'use client';

import { useTranslations } from 'next-intl';
import { MEETING_REMINDER_MINUTE_CHOICES } from '@/core/lib/notifications/meeting-notices';
import { EEmployeeNotificationType } from '@/core/types/interfaces/common/employee-notification';
import { ReminderThresholdRow, ReminderThresholdRowProps } from './reminder-threshold-row';

/**
 * The meetings the person hosts or is invited to (#5022): how many minutes before one starts they are reminded of it, or
 * not at all; and the email mode of every meeting notification (invited, changed, cancelled, the reminders). The notice
 * that a meeting is starting comes whatever the lead, so the email mode stays offered with no reminder.
 */
export function MeetingReminderRow(props: Readonly<ReminderThresholdRowProps>) {
	const t = useTranslations();
	return (
		<ReminderThresholdRow
			{...props}
			type={EEmployeeNotificationType.Meeting}
			choices={MEETING_REMINDER_MINUTE_CHOICES}
			label={t('notifications.SETTINGS_PAGE.MEETINGS.LABEL')}
			description={t('notifications.SETTINGS_PAGE.MEETINGS.TEXT')}
			labelOf={(minutes) =>
				minutes === null
					? t('notifications.SETTINGS_PAGE.MEETINGS.OFF')
					: t('notifications.SETTINGS_PAGE.MEETINGS.BEFORE_MINUTES', { minutes })
			}
			isFiledWithoutReminder
		/>
	);
}
