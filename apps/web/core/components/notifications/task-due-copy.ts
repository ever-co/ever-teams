import type { useTranslations } from 'next-intl';
import { isBoardInvitation } from '@/core/lib/notifications/board-invitations';
import { taskDueNoticeOf } from '@/core/lib/notifications/task-due-reminders';
import { EEmployeeNotificationType } from '@/core/types/interfaces/common/employee-notification';

type Translate = ReturnType<typeof useTranslations>;

/**
 * The text of a notification, with a due date reminder's in the reader's language: when the task is due, the day it
 * names, or the moment in the reader's own zone. The platform writes it in English; any other text is shown as it is.
 */
export function notificationMessageOf(
	t: Translate,
	locale: string,
	entry: {
		type: EEmployeeNotificationType | null;
		message: string | null;
		entity?: string | null;
		rawTitle?: string | null;
	}
): string | null {
	// An invitation to a Board says where it leads (#5022): the platform's title names the team only
	if (isBoardInvitation(entry)) {
		return t('notifications.BOARD_INVITATION.TEXT');
	}
	if (entry.type !== EEmployeeNotificationType.TaskDueReminder) {
		return entry.message;
	}
	const notice = taskDueNoticeOf(entry.message);
	if (!notice) {
		return entry.message;
	}
	if (notice.kind === 'day') {
		const [year, month, day] = notice.day.split('-').map(Number);
		const date = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(
			Date.UTC(year, month - 1, day)
		);
		return t('notifications.TASK_DUE.BY_END_OF_DAY', { date });
	}
	const date = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(notice.at);
	return t('notifications.TASK_DUE.AT', { date });
}
