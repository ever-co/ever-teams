'use client';

import { useTranslations } from 'next-intl';
import { MEETING_REMINDER_MINUTE_CHOICES } from '@/core/lib/notifications/meeting-notices';
import { EEmployeeNotificationType } from '@/core/types/interfaces/common/employee-notification';
import { EmailModeChoice } from './notification-channel-rows';
import { ReminderChoiceRow } from './reminder-choice-row';

interface MeetingReminderRowProps {
	/** The lead in minutes, null for no reminder before a meeting. */
	value: number | null;
	disabled?: boolean;
	onChange: (minutes: number | null) => void;
	/** How the meeting notifications reach the person by email, as every other kind's row offers it. */
	emailMode: EmailModeChoice;
	onEmailMode: (mode: EmailModeChoice) => void;
}

/**
 * The meetings the person hosts or is invited to (#5022): how long before one starts they are reminded of it, or not
 * at all; and the email mode of every meeting notification (invited, changed, cancelled, the reminders). The notice
 * that a meeting is starting comes whatever the lead, so the email mode stays offered with no reminder.
 */
export function MeetingReminderRow({
	value,
	disabled,
	onChange,
	emailMode,
	onEmailMode
}: Readonly<MeetingReminderRowProps>) {
	const t = useTranslations();
	return (
		<ReminderChoiceRow
			type={EEmployeeNotificationType.Meeting}
			label={t('notifications.SETTINGS_PAGE.MEETINGS.LABEL')}
			description={t('notifications.SETTINGS_PAGE.MEETINGS.TEXT')}
			value={value}
			choices={MEETING_REMINDER_MINUTE_CHOICES}
			labelOf={(minutes) =>
				minutes === null
					? t('notifications.SETTINGS_PAGE.MEETINGS.OFF')
					: t('notifications.SETTINGS_PAGE.MEETINGS.BEFORE_MINUTES', { minutes })
			}
			disabled={disabled}
			onChange={onChange}
			emailMode={emailMode}
			onEmailMode={onEmailMode}
			isFiledWithoutReminder
		/>
	);
}
