import {
	EEmployeeNotificationType,
	TEmployeeNotificationSettingKey
} from '@/core/types/interfaces/common/employee-notification';

interface TypeCopy {
	type: EEmployeeNotificationType;
	titleKey: `notifications.SETTINGS_PAGE.ROWS.${Uppercase<TEmployeeNotificationSettingKey>}.TITLE`;
	textKey: `notifications.SETTINGS_PAGE.ROWS.${Uppercase<TEmployeeNotificationSettingKey>}.TEXT`;
}

/** Each kind of the settings page: its platform type and its strings. */
export const TYPE_COPY = {
	assignment: {
		type: EEmployeeNotificationType.Assignment,
		titleKey: 'notifications.SETTINGS_PAGE.ROWS.ASSIGNMENT.TITLE',
		textKey: 'notifications.SETTINGS_PAGE.ROWS.ASSIGNMENT.TEXT'
	},
	mention: {
		type: EEmployeeNotificationType.Mention,
		titleKey: 'notifications.SETTINGS_PAGE.ROWS.MENTION.TITLE',
		textKey: 'notifications.SETTINGS_PAGE.ROWS.MENTION.TEXT'
	},
	comment: {
		type: EEmployeeNotificationType.Comment,
		titleKey: 'notifications.SETTINGS_PAGE.ROWS.COMMENT.TITLE',
		textKey: 'notifications.SETTINGS_PAGE.ROWS.COMMENT.TEXT'
	},
	invitation: {
		type: EEmployeeNotificationType.Invitation,
		titleKey: 'notifications.SETTINGS_PAGE.ROWS.INVITATION.TITLE',
		textKey: 'notifications.SETTINGS_PAGE.ROWS.INVITATION.TEXT'
	},
	message: {
		type: EEmployeeNotificationType.Message,
		titleKey: 'notifications.SETTINGS_PAGE.ROWS.MESSAGE.TITLE',
		textKey: 'notifications.SETTINGS_PAGE.ROWS.MESSAGE.TEXT'
	},
	payment: {
		type: EEmployeeNotificationType.Payment,
		titleKey: 'notifications.SETTINGS_PAGE.ROWS.PAYMENT.TITLE',
		textKey: 'notifications.SETTINGS_PAGE.ROWS.PAYMENT.TEXT'
	}
} as const satisfies Record<TEmployeeNotificationSettingKey, TypeCopy>;
